<script lang="ts">
  import type { Task } from '../types';
  import { categories, changeTaskSubTag, moveTask, visibleTasks } from '../state.svelte.ts';
  import QuickCapture from './QuickCapture.svelte';
  import TaskCard from './TaskCard.svelte';

  let {
    title = 'Dashboard',
    filterCategoryId,
    filterGroupId,
    filterUncategorized = false,
    showCategoriesCard = true,
    boardActive = true,
    rescanLoading = false,
    onSelectCategory,
    onSelectUncategorized,
    onBoard,
    onRescan
  }: {
    title?: string;
    filterCategoryId?: string;
    filterGroupId?: string;
    filterUncategorized?: boolean;
    showCategoriesCard?: boolean;
    boardActive?: boolean;
    rescanLoading?: boolean;
    onSelectCategory?: (categoryId: string) => void;
    onSelectUncategorized?: () => void;
    onBoard?: () => void;
    onRescan?: () => void;
  } = $props();

  let draggingTaskId = $state<string | null>(null);
  let finishedExpanded = $state(false);

  const sortedTasks = $derived([...visibleTasks()].sort((a, b) => a.sortOrder - b.sortOrder));
  const incompleteTasks = $derived(sortedTasks.filter((task) => !task.completed));
  const finishedTasks = $derived(sortedTasks.filter((task) => task.completed));

  // Dashboard time-based sections
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const thisWeekTasks = $derived(incompleteTasks.filter(t => new Date(t.createdAt).getTime() >= oneWeekAgo));
  const thisMonthTasks = $derived(incompleteTasks.filter(t => {
    const created = new Date(t.createdAt).getTime();
    return created >= oneMonthAgo && created < oneWeekAgo;
  }));
  const olderTasks = $derived(incompleteTasks.filter(t => new Date(t.createdAt).getTime() < oneMonthAgo));
  const openCount = $derived(sortedTasks.filter((task) => !task.completed).length);
  const doneCount = $derived(sortedTasks.filter((task) => task.completed).length);
  const sortedCategories = $derived([...categories].sort((a, b) => a.sortOrder - b.sortOrder));
  const dashboardUncategorizedTasks = $derived(sortedTasks.filter((task) => !task.categoryId));
  const showSubtagSections = $derived(!!filterCategoryId && sortedTasks.some((task) => !!task.subTag));
  const openUntaggedCategoryTasks = $derived(
    showSubtagSections ? incompleteTasks.filter((task) => !task.subTag) : []
  );
  const finishedUntaggedCategoryTasks = $derived(
    showSubtagSections ? finishedTasks.filter((task) => !task.subTag) : []
  );
  const openSubtagGroups = $derived.by(() => {
    return showSubtagSections ? groupBySubtag(incompleteTasks) : [];
  });
  const finishedSubtagGroups = $derived.by(() => {
    return showSubtagSections ? groupBySubtag(finishedTasks) : [];
  });

  // Group view: group tasks by their category
  const showCategorySections = $derived(!!filterGroupId && !filterCategoryId);
  function groupByCategory(list: Task[]) {
    const groups = new Map<string, { name: string; categoryId: string; tasks: Task[] }>();
    const rootTasks: Task[] = [];
    for (const task of list) {
      if (!task.categoryId) {
        rootTasks.push(task);
        continue;
      }
      const existing = groups.get(task.categoryId);
      if (existing) {
        existing.tasks.push(task);
      } else {
        const cat = sortedCategories.find(c => c.id === task.categoryId);
        groups.set(task.categoryId, {
          name: cat?.name ?? 'Unknown',
          categoryId: task.categoryId,
          tasks: [task]
        });
      }
    }
    return { rootTasks, categoryGroups: [...groups.values()] };
  }
  const openByCategory = $derived.by(() => showCategorySections ? groupByCategory(incompleteTasks) : { rootTasks: [], categoryGroups: [] });
  const finishedByCategory = $derived.by(() => showCategorySections ? groupByCategory(finishedTasks) : { rootTasks: [], categoryGroups: [] });

  {
    // Reset finishedExpanded on navigation, using a non-reactive tracker
    let lastFilterKey = '';
    $effect(() => {
      const key = `${filterCategoryId ?? ''}|${filterGroupId ?? ''}|${filterUncategorized ?? ''}`;
      if (lastFilterKey && key !== lastFilterKey) {
        finishedExpanded = false;
      }
      lastFilterKey = key;
    });
  }

  function groupBySubtag(list: Task[]) {
    const groups = new Map<string, Task[]>();
    for (const task of list) {
      if (!task.subTag) continue;
      const items = groups.get(task.subTag) ?? [];
      items.push(task);
      groups.set(task.subTag, items);
    }
    return [...groups.entries()].map(([subTag, tasks]) => ({ subTag, tasks }));
  }

  function onDropOn(targetTaskId: string, targetSubTag?: string) {
    if (!draggingTaskId || draggingTaskId === targetTaskId) {
      draggingTaskId = null;
      return;
    }

    // If dropping into a different subtag section, change the tag in the vault
    if (showSubtagSections && targetSubTag !== undefined) {
      const draggedTask = sortedTasks.find(t => t.id === draggingTaskId);
      const currentSubTag = draggedTask?.subTag ?? '';
      if (currentSubTag !== targetSubTag) {
        void changeTaskSubTag(draggingTaskId, targetSubTag || undefined);
        draggingTaskId = null;
        return;
      }
    }

    moveTask(draggingTaskId, targetTaskId);
    draggingTaskId = null;
  }
</script>

<section class="task-board">
  <header class="page-header">
    <h1>{title}</h1>
    <div class="stats-grid">
      <div><span>{openCount}</span><small>Open</small></div>
      <div><span>{doneCount}</span><small>Done</small></div>
    </div>
    <div class="header-actions">
      <button type="button" class:active={boardActive} onclick={() => onBoard?.()}>Board</button>
      <button type="button" onclick={() => onRescan?.()} disabled={rescanLoading}>
        {rescanLoading ? 'Scanning…' : 'Rescan'}
      </button>
    </div>
  </header>

  <div class="board-grid" class:single-column={!showCategoriesCard}>
    <div class="main-column">
      <QuickCapture defaultCategoryId={filterCategoryId} locked={!!filterCategoryId} />
      <section class="task-list">
        {#if sortedTasks.length === 0}
          <div class="empty-state">No tasks here yet.</div>
        {:else if showCategoriesCard}
          <!-- Dashboard: time-based sections -->
          {#if thisWeekTasks.length > 0}
            <section class="task-section">
              <div class="task-section-head">
                <h3>This Week</h3>
                <small>{thisWeekTasks.length}</small>
              </div>
              <div class="cards">
                {#each thisWeekTasks as task (task.id)}
                  <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} onDropOn={(id) => onDropOn(id)} />
                {/each}
              </div>
            </section>
          {/if}
          {#if thisMonthTasks.length > 0}
            <section class="task-section">
              <div class="task-section-head">
                <h3>This Month</h3>
                <small>{thisMonthTasks.length}</small>
              </div>
              <div class="cards">
                {#each thisMonthTasks as task (task.id)}
                  <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} onDropOn={(id) => onDropOn(id)} />
                {/each}
              </div>
            </section>
          {/if}
          {#if olderTasks.length > 0}
            <section class="task-section">
              <div class="task-section-head">
                <h3>All Tasks</h3>
                <small>{olderTasks.length}</small>
              </div>
              <div class="cards">
                {#each olderTasks as task (task.id)}
                  <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} onDropOn={(id) => onDropOn(id)} />
                {/each}
              </div>
            </section>
          {/if}

          <section class="task-section finished-block">
            <button
              type="button"
              class="finished-toggle"
              aria-expanded={finishedExpanded}
              onclick={() => (finishedExpanded = !finishedExpanded)}
            >
              <span>Finished Tasks ({doneCount})</span>
              <span class="chevron" class:expanded={finishedExpanded}>▾</span>
            </button>
            {#if finishedExpanded}
              {#if doneCount === 0}
                <div class="empty-state compact">No finished tasks.</div>
              {:else}
                <div class="cards">
                  {#each finishedTasks as task (task.id)}
                    <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} onDropOn={(id) => onDropOn(id)} />
                  {/each}
                </div>
              {/if}
            {/if}
          </section>
        {:else}
          <!-- Category/group view -->
          <section class="task-section">
            <div class="task-section-head">
              <h3>Tasks</h3>
              <small>{openCount}</small>
            </div>
            {#if openCount === 0}
              <!-- nothing to show -->
            {:else if showCategorySections}
              <!-- Group view: tasks grouped by category -->
              {#if openByCategory.rootTasks.length}
                <section class="subtag-group">
                  <div class="subtag-header">Root / Uncategorized</div>
                  <div class="cards">
                    {#each openByCategory.rootTasks as task (task.id)}
                      <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} {onDropOn} />
                    {/each}
                  </div>
                </section>
              {/if}
              {#each openByCategory.categoryGroups as group (group.categoryId)}
                <section class="subtag-group">
                  <div class="subtag-header">{group.name}</div>
                  <div class="cards">
                    {#each group.tasks as task (task.id)}
                      <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} {onDropOn} />
                    {/each}
                  </div>
                </section>
              {/each}
            {:else if showSubtagSections}
              {#if openUntaggedCategoryTasks.length}
                <div class="cards">
                  {#each openUntaggedCategoryTasks as task (task.id)}
                    <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} onDropOn={(id) => onDropOn(id, '')} />
                  {/each}
                </div>
              {/if}
              {#each openSubtagGroups as group (group.subTag)}
                <section class="subtag-group">
                  <div class="subtag-header">{group.subTag}</div>
                  <div class="cards">
                    {#each group.tasks as task (task.id)}
                      <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} onDropOn={(id) => onDropOn(id, group.subTag)} />
                    {/each}
                  </div>
                </section>
              {/each}
            {:else}
              <div class="cards">
                {#each incompleteTasks as task (task.id)}
                  <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} {onDropOn} />
                {/each}
              </div>
            {/if}
          </section>

          <section class="task-section finished-block">
            <button
              type="button"
              class="finished-toggle"
              aria-expanded={finishedExpanded}
              onclick={() => (finishedExpanded = !finishedExpanded)}
            >
              <span>Finished Tasks ({doneCount})</span>
              <span class="chevron" class:expanded={finishedExpanded}>▾</span>
            </button>

            {#if finishedExpanded}
              {#if doneCount === 0}
                <div class="empty-state compact">No finished tasks.</div>
              {:else if showCategorySections}
                {#if finishedByCategory.rootTasks.length}
                  <section class="subtag-group">
                    <div class="subtag-header">Root / Uncategorized</div>
                    <div class="cards">
                      {#each finishedByCategory.rootTasks as task (task.id)}
                        <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} {onDropOn} />
                      {/each}
                    </div>
                  </section>
                {/if}
                {#each finishedByCategory.categoryGroups as group (group.categoryId)}
                  <section class="subtag-group">
                    <div class="subtag-header">{group.name}</div>
                    <div class="cards">
                      {#each group.tasks as task (task.id)}
                        <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} {onDropOn} />
                      {/each}
                    </div>
                  </section>
                {/each}
              {:else if showSubtagSections}
                {#if finishedUntaggedCategoryTasks.length}
                  <div class="cards">
                    {#each finishedUntaggedCategoryTasks as task (task.id)}
                      <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} onDropOn={(id) => onDropOn(id, '')} />
                    {/each}
                  </div>
                {/if}
                {#each finishedSubtagGroups as group (group.subTag)}
                  <section class="subtag-group">
                    <div class="subtag-header">{group.subTag}</div>
                    <div class="cards">
                      {#each group.tasks as task (task.id)}
                        <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} onDropOn={(id) => onDropOn(id, group.subTag)} />
                      {/each}
                    </div>
                  </section>
                {/each}
              {:else}
                <div class="cards">
                  {#each finishedTasks as task (task.id)}
                    <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} {onDropOn} />
                  {/each}
                </div>
              {/if}
            {/if}
          </section>
        {/if}
      </section>
    </div>

    {#if showCategoriesCard}
      <aside class="side-column">
        <section class="panel">
          <h3>Categories</h3>
          <ul class="category-links">
            {#each sortedCategories as category}
              <li>
                <button type="button" onclick={() => onSelectCategory?.(category.id)}>
                  {category.emoji ? `${category.emoji} ` : ''}{category.name}
                </button>
              </li>
            {/each}
            <li>
              <button type="button" onclick={() => onSelectUncategorized?.()}>
                Uncategorized / group-level
              </button>
            </li>
          </ul>
        </section>
      </aside>
    {/if}
  </div>
</section>

<style>
  .task-board {
    display: grid;
    gap: 1rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  h1 {
    margin: 0;
    font-size: clamp(1.2rem, 2.3vw, 1.7rem);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
    min-width: min(14rem, 100%);
  }

  .stats-grid > div {
    background: var(--surface-1);
    border: 1px solid var(--border-color);
    border-radius: 0.9rem;
    padding: 0.6rem 0.75rem;
    display: grid;
    gap: 0.15rem;
  }

  .stats-grid span {
    font-size: 1.15rem;
    font-weight: 800;
  }

  .stats-grid small {
    color: var(--text-muted);
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
    min-width: 0;
  }

  .header-actions button {
    background: var(--surface-1);
    border: 1px solid var(--border-color);
    color: inherit;
    border-radius: 0.65rem;
    padding: 0.45rem 0.75rem;
    font: inherit;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .header-actions button.active {
    background: var(--surface-2);
  }

  .board-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
    gap: 1rem;
  }

  .board-grid.single-column {
    grid-template-columns: minmax(0, 1fr);
  }

  .main-column,
  .side-column {
    display: grid;
    gap: 1rem;
    align-content: start;
  }

  .task-list {
    display: grid;
    gap: 0.65rem;
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 1rem;
    background: var(--surface-1);
  }

  .uncategorized-panel {
    display: grid;
    gap: 0.6rem;
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 1rem;
    background: var(--surface-1);
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .section-head h2 {
    margin: 0;
    font-size: 1rem;
  }

  .section-head .ghost {
    background: transparent;
    border: 1px solid var(--border-color);
    color: inherit;
    border-radius: 0.55rem;
    padding: 0.35rem 0.55rem;
    font: inherit;
  }

  .uncategorized-list {
    text-align: left;
    display: grid;
    gap: 0.35rem;
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--border-color);
    color: inherit;
    border-radius: 0.8rem;
    padding: 0.7rem 0.8rem;
    cursor: pointer;
  }

  .uncategorized-list ul {
    margin: 0;
    padding-left: 1rem;
    display: grid;
    gap: 0.15rem;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .uncategorized-list li,
  .category-links button {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .uncategorized-list small {
    color: var(--text-muted);
  }

  .uncategorized-count {
    font-weight: 700;
  }

  .empty-state.compact {
    padding: 0;
    border: none;
    font-size: 0.85rem;
  }

  .task-list-header h2,
  .panel h3 {
    margin: 0;
    font-size: 1rem;
  }

  .task-list-header p {
    margin: 0.15rem 0 0;
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .task-section {
    display: grid;
    gap: 0.25rem;
  }

  .task-section + .task-section {
    margin-top: 0.2rem;
  }

  .task-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .task-section-head h3 {
    margin: 0;
    font-size: 0.9rem;
  }

  .task-section-head small {
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .finished-block {
    gap: 0.55rem;
    padding-top: 0.15rem;
    border-top: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
  }

  .finished-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
    text-align: left;
    background: transparent;
    border: 1px solid var(--border-color);
    color: inherit;
    border-radius: 0.65rem;
    padding: 0.4rem 0.55rem;
    font: inherit;
    cursor: pointer;
  }

  .finished-toggle .chevron {
    color: var(--text-muted);
    transition: transform 120ms ease;
  }

  .finished-toggle .chevron.expanded {
    transform: rotate(180deg);
  }

  .cards {
    display: grid;
    gap: 0.45rem;
  }

  .subtag-group {
    display: grid;
    gap: 0.55rem;
    margin-top: 0.4rem;
  }

  .subtag-header {
    padding: 0.35rem 0.55rem;
    border-radius: 0.6rem;
    border: 1px solid var(--border-color);
    background: var(--surface-2);
    font-size: 0.8rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .empty-state {
    padding: 1rem;
    border: 1px dashed var(--border-color);
    border-radius: 0.8rem;
    color: var(--text-muted);
    text-align: left;
  }

  .panel {
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 1rem;
    background: var(--surface-1);
  }

  .panel ul {
    list-style: none;
    margin: 0.6rem 0 0;
    padding: 0;
    display: grid;
    gap: 0.45rem;
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .category-links button {
    width: 100%;
    text-align: left;
    font: inherit;
    color: inherit;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 0.45rem;
    padding: 0.35rem 0.45rem;
    cursor: pointer;
    max-width: 100%;
  }

  .category-links button:hover {
    background: var(--surface-2);
    color: var(--text-normal);
  }

  @media (max-width: 700px) {
    .board-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 700px) {
    .stats-grid {
      width: 100%;
      min-width: 0;
    }
    .header-actions {
      width: 100%;
      margin-left: 0;
    }
    .header-actions button {
      flex: 1 1 0;
    }
  }

  @media (max-width: 500px) {
    .page-header {
      gap: 0.7rem;
    }

    .stats-grid {
      gap: 0.4rem;
    }

    .stats-grid > div {
      padding: 0.45rem 0.55rem;
      border-radius: 0.75rem;
    }

    .stats-grid span {
      font-size: 1rem;
    }

    .stats-grid small {
      font-size: 0.72rem;
    }
  }

  @media (max-width: 400px) {
    .page-header {
      align-items: stretch;
    }

    .stats-grid > div {
      padding: 0.35rem 0.45rem;
      border-radius: 0.65rem;
      gap: 0.05rem;
    }

    .stats-grid span {
      font-size: 0.9rem;
    }

    .stats-grid small {
      font-size: 0.65rem;
    }

    .header-actions {
      gap: 0.35rem;
    }
  }
</style>
