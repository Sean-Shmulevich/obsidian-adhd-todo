<script lang="ts">
  import { categories, getCategory, visibleTasks } from '../state.svelte.ts';
  import FocusMode from './FocusMode.svelte';
  import QuickCapture from './QuickCapture.svelte';
  import TaskCard from './TaskCard.svelte';

  let {
    title = 'Dashboard',
    filterCategoryId,
    filterGroupId
  }: {
    title?: string;
    filterCategoryId?: string;
    filterGroupId?: string;
  } = $props();

  let draggingTaskId = $state<string | null>(null);

  const sortedTasks = $derived([...visibleTasks()].sort((a, b) => a.sortOrder - b.sortOrder));
  const openCount = $derived(sortedTasks.filter((task) => !task.completed).length);
  const doneCount = $derived(sortedTasks.filter((task) => task.completed).length);
  const recurringCount = $derived(sortedTasks.filter((task) => task.recurrence).length);
  const currentCategory = $derived(filterCategoryId ? getCategory(filterCategoryId) : undefined);

  function onDropOn(_targetTaskId: string) {
    draggingTaskId = null;
  }
</script>

<section class="task-board">
  <header class="page-header">
    <div>
      <h1>{title}</h1>
      <p>
        {#if currentCategory}
          {currentCategory.emoji ? `${currentCategory.emoji} ` : ''}{currentCategory.name}
        {:else if filterGroupId}
          Group-level and category tasks in this section.
        {:else}
          All tasks, including uncategorized items.
        {/if}
      </p>
    </div>
    <div class="stats-grid">
      <div><span>{openCount}</span><small>Open</small></div>
      <div><span>{doneCount}</span><small>Done</small></div>
      <div><span>{recurringCount}</span><small>Recurring</small></div>
    </div>
  </header>

  <div class="board-grid">
    <div class="main-column">
      <QuickCapture defaultCategoryId={filterCategoryId} />
      <section class="task-list">
        <div class="task-list-header">
          <h2>Tasks</h2>
          <p>Drag cards is visual-only for now; file order is preserved from vault sources.</p>
        </div>
        {#if sortedTasks.length === 0}
          <div class="empty-state">No tasks here yet.</div>
        {:else}
          <div class="cards">
            {#each sortedTasks as task (task.id)}
              <TaskCard {task} onDragStart={(id) => (draggingTaskId = id)} {onDropOn} />
            {/each}
          </div>
        {/if}
      </section>
    </div>

    <aside class="side-column">
      <section class="panel">
        <h3>Categories</h3>
        <ul>
          {#each [...categories].sort((a, b) => a.sortOrder - b.sortOrder) as category}
            <li>{category.emoji ? `${category.emoji} ` : ''}{category.name}</li>
          {/each}
          <li>Uncategorized / group-level</li>
        </ul>
      </section>
      <FocusMode compact />
    </aside>
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
    align-items: start;
  }

  h1 {
    margin: 0;
    font-size: clamp(1.2rem, 2.3vw, 1.7rem);
  }

  .page-header p {
    margin: 0.25rem 0 0;
    color: var(--text-muted);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
    min-width: min(20rem, 100%);
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

  .board-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
    gap: 1rem;
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

  @media (max-width: 980px) {
    .board-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 700px) {
    .page-header {
      flex-direction: column;
    }
    .stats-grid {
      width: 100%;
      min-width: 0;
    }
  }
</style>
