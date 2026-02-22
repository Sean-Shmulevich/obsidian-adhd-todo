<script lang="ts">
  import type { Task } from '../types';
  import { categories, visibleTasks } from '../state.svelte.ts';
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

  const sortedTasks = $derived([...visibleTasks()].sort((a, b) => a.sortOrder - b.sortOrder));
  const openCount = $derived(sortedTasks.filter((task) => !task.completed).length);
  const doneCount = $derived(sortedTasks.filter((task) => task.completed).length);
  const sortedCategories = $derived([...categories].sort((a, b) => a.sortOrder - b.sortOrder));
  const dashboardUncategorizedTasks = $derived(sortedTasks.filter((task) => !task.categoryId));
  const showSubtagSections = $derived(!!filterCategoryId && sortedTasks.some((task) => !!task.subTag));
  const untaggedCategoryTasks = $derived(
    showSubtagSections ? sortedTasks.filter((task) => !task.subTag) : []
  );
  const subtagGroups = $derived.by(() => {
    const groups = new Map<string, Task[]>();
    if (!showSubtagSections) return [] as Array<{ subTag: string; tasks: Task[] }>;
    for (const task of sortedTasks) {
      if (!task.subTag) continue;
      const list = groups.get(task.subTag) ?? [];
      list.push(task);
      groups.set(task.subTag, list);
    }
    return [...groups.entries()].map(([subTag, tasks]) => ({ subTag, tasks }));
  });

  function onDropOn(_targetTaskId: string) {
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
      {#if showCategoriesCard}
        <section class="uncategorized-panel">
          <div class="section-head">
            <h2>Uncategorized</h2>
            <button type="button" class="ghost" onclick={() => onSelectUncategorized?.()}>
              View only
            </button>
          </div>
          {#if dashboardUncategorizedTasks.length === 0}
            <div class="empty-state compact">No uncategorized tasks.</div>
          {:else}
            <button type="button" class="uncategorized-list" onclick={() => onSelectUncategorized?.()}>
              <span class="uncategorized-count">{dashboardUncategorizedTasks.length} tasks</span>
              <ul>
                {#each dashboardUncategorizedTasks.slice(0, 5) as task (task.id)}
                  <li>{task.title}</li>
                {/each}
              </ul>
              {#if dashboardUncategorizedTasks.length > 5}
                <small>+{dashboardUncategorizedTasks.length - 5} more</small>
              {/if}
            </button>
          {/if}
        </section>
      {/if}
      <QuickCapture defaultCategoryId={filterCategoryId} />
      <section class="task-list">
        <div class="task-list-header">
          <h2>Tasks</h2>
          <p>Drag cards is visual-only for now; file order is preserved from vault sources.</p>
        </div>
        {#if sortedTasks.length === 0}
          <div class="empty-state">No tasks here yet.</div>
        {:else}
          {#if showSubtagSections}
            {#if untaggedCategoryTasks.length}
              <div class="cards">
                {#each untaggedCategoryTasks as task (task.id)}
                  <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} {onDropOn} />
                {/each}
              </div>
            {/if}
            {#each subtagGroups as group (group.subTag)}
              <section class="subtag-group">
                <div class="subtag-header">{group.subTag}</div>
                <div class="cards">
                  {#each group.tasks as task (task.id)}
                    <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} {onDropOn} />
                  {/each}
                </div>
              </section>
            {/each}
          {:else}
            <div class="cards">
              {#each sortedTasks as task (task.id)}
                <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} {onDropOn} />
              {/each}
            </div>
          {/if}
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
  }

  .header-actions button {
    background: var(--surface-1);
    border: 1px solid var(--border-color);
    color: inherit;
    border-radius: 0.65rem;
    padding: 0.45rem 0.75rem;
    font: inherit;
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
    gap: 0.75rem;
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

  .uncategorized-list small {
    color: var(--text-muted);
  }

  .uncategorized-count {
    font-weight: 700;
  }

  .empty-state.compact {
    padding: 0.7rem 0.8rem;
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

  .cards {
    display: grid;
    gap: 0.7rem;
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
  }

  .category-links button:hover {
    background: var(--surface-2);
    color: var(--text-normal);
  }

  @media (max-width: 980px) {
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
</style>
