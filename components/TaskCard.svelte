<script lang="ts">
  import {
    categories,
    categoryLabel,
    deleteTask,
    openTaskInObsidian,
    toggleTaskComplete,
    updateTask
  } from '../state.svelte.ts';
  import type { Priority, Task } from '../types';

  let {
    task,
    onDragStart,
    onDropOn
  }: {
    task: Task;
    onDragStart?: (id: string) => void;
    onDropOn?: (id: string) => void;
  } = $props();

  let editing = $state(false);
  let title = $state('');
  let priority = $state<Priority>('medium');
  let categoryId = $state('');

  $effect(() => {
    title = task.title;
    priority = task.priority === 'urgent' ? 'high' : task.priority;
    categoryId = task.categoryId ?? '';
  });

  async function save() {
    await updateTask(task.id, { title, priority, categoryId: categoryId || undefined });
    editing = false;
  }
</script>

<article
  class="task-card"
  class:done={task.completed}
  draggable="true"
  ondragstart={() => onDragStart?.(task.id)}
  ondragover={(event) => event.preventDefault()}
  ondrop={() => onDropOn?.(task.id)}
>
  <div class="row top-row">
    <label class="checkbox-row">
      <input type="checkbox" checked={task.completed} onchange={() => toggleTaskComplete(task.id)} />
      <span class="title">{task.title}</span>
    </label>
    <div class="right-controls">
      <span class="badge {task.priority}">{task.priority}</span>
      {#if !editing}
        <button type="button" class="ghost icon-btn" title="Open in Obsidian" onclick={() => openTaskInObsidian(task.id)}>↗</button>
        <button type="button" class="ghost icon-btn" title="Edit" onclick={() => (editing = true)}>✎</button>
        <button type="button" class="danger icon-btn" title="Delete" onclick={() => deleteTask(task.id)}>🗑</button>
      {/if}
    </div>
  </div>

  {#if editing}
    <div class="editor">
      <input type="text" bind:value={title} maxlength="140" onkeydown={(e) => e.stopPropagation()} />
      <div class="grid2">
        <select bind:value={priority}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select bind:value={categoryId} disabled>
          <option value="">Vault category (read from tags)</option>
          {#each [...categories].sort((a, b) => a.sortOrder - b.sortOrder) as category}
            <option value={category.id}>{category.emoji ? `${category.emoji} ` : ''}{category.name}</option>
          {/each}
        </select>
      </div>
      <div class="actions">
        <button type="button" onclick={save}>Save</button>
        <button type="button" class="ghost" onclick={() => (editing = false)}>Cancel</button>
      </div>
    </div>
  {/if}
</article>

<style>
  .task-card {
    display: grid;
    gap: 0.25rem;
    padding: 0.4rem 0.5rem;
    border-radius: 0.75rem;
    border: 1px solid var(--border-color);
    background: var(--surface-1);
  }

  .task-card.done {
    opacity: 0.72;
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    gap: 0.35rem;
    align-items: flex-start;
    min-width: 0;
  }

  .checkbox-row {
    display: flex;
    flex: 1 1 auto;
    gap: 0.45rem;
    align-items: flex-start;
    font-weight: 600;
    min-width: 0;
  }

  .checkbox-row .title {
    display: block;
    min-width: 0;
    line-height: 1.2;
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .checkbox-row input[type='checkbox'] {
    margin-top: 0.1rem;
    inline-size: 0.95rem;
    block-size: 0.95rem;
  }

  .done .title {
    text-decoration: line-through;
  }

  .right-controls {
    display: flex;
    flex: 0 0 auto;
    gap: 0.25rem;
    align-items: center;
  }

  .badge {
    padding: 0.1rem 0.35rem;
    border-radius: 999px;
    font-size: 0.62rem;
    font-weight: 600;
    text-transform: uppercase;
    border: 1px solid var(--border-color);
    background: var(--surface-2);
    opacity: 0.9;
  }

  .badge.low { background: color-mix(in srgb, #58d68d 16%, var(--surface-2)); }
  .badge.medium { background: color-mix(in srgb, #f4d03f 18%, var(--surface-2)); }
  .badge.high,
  .badge.urgent { background: color-mix(in srgb, #ff6b6b 16%, var(--surface-2)); }
  .editor {
    display: grid;
    gap: 0.5rem;
    padding-top: 0.1rem;
  }

  .editor input,
  .editor select,
  .actions button {
    background: var(--surface-2);
    border: 1px solid var(--border-color);
    color: inherit;
    border-radius: 0.55rem;
    padding: 0.45rem 0.6rem;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .grid2 {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .icon-btn {
    display: grid;
    place-items: center;
    min-width: 1.8rem;
    min-height: 1.8rem;
    padding: 0.2rem;
    line-height: 1;
    font-size: 0.8rem;
    border-radius: 0.45rem;
  }

  .actions .ghost {
    background: transparent;
  }

  .danger {
    border-color: color-mix(in srgb, #ff6b6b 55%, var(--border-color));
  }

  .note {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  @media (max-width: 600px) {
    .grid2 { grid-template-columns: 1fr; }
  }

  @media (max-width: 500px) {
    .actions {
      justify-content: flex-start;
    }
  }

  @media (max-width: 400px) {
    .top-row {
      flex-wrap: wrap;
    }

    .badges {
      width: 100%;
      justify-content: flex-start;
    }

    .icon-btn {
      min-width: 1.65rem;
      min-height: 1.65rem;
    }
  }
</style>
