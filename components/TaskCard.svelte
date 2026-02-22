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
    <div class="badges">
      <span class="badge {task.priority}">{task.priority}</span>
    </div>
  </div>

  <div class="meta">
    <span>{categoryLabel(task.categoryId)}</span>
    {#if task.sourceFile}<span>{task.sourceFile}:{task.sourceLine}</span>{/if}
  </div>

  {#if editing}
    <div class="editor">
      <input type="text" bind:value={title} maxlength="140" />
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
      <p class="note">Only title and completion state are written back to vault in Phase 1 migration.</p>
    </div>
  {:else}
    <div class="actions">
      <button type="button" class="ghost" onclick={() => openTaskInObsidian(task.id)}>Open in Obsidian</button>
      <button type="button" class="ghost" onclick={() => (editing = true)}>Edit</button>
      <button type="button" class="danger" onclick={() => deleteTask(task.id)}>Delete</button>
    </div>
  {/if}
</article>

<style>
  .task-card {
    display: grid;
    gap: 0.6rem;
    padding: 0.85rem;
    border-radius: 0.9rem;
    border: 1px solid var(--border-color);
    background: var(--surface-1);
  }

  .task-card.done {
    opacity: 0.72;
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .checkbox-row {
    display: flex;
    gap: 0.6rem;
    align-items: flex-start;
    font-weight: 600;
    min-width: 0;
  }

  .checkbox-row .title {
    line-height: 1.35;
    word-break: break-word;
  }

  .done .title {
    text-decoration: line-through;
  }

  .badges {
    display: flex;
    gap: 0.35rem;
    align-items: center;
  }

  .badge {
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    border: 1px solid var(--border-color);
    background: var(--surface-2);
  }

  .badge.low { background: color-mix(in srgb, #58d68d 16%, var(--surface-2)); }
  .badge.medium { background: color-mix(in srgb, #f4d03f 18%, var(--surface-2)); }
  .badge.high,
  .badge.urgent { background: color-mix(in srgb, #ff6b6b 16%, var(--surface-2)); }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 0.8rem;
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  .editor {
    display: grid;
    gap: 0.5rem;
    padding-top: 0.25rem;
  }

  .editor input,
  .editor select,
  .actions button {
    background: var(--surface-2);
    border: 1px solid var(--border-color);
    color: inherit;
    border-radius: 0.55rem;
    padding: 0.45rem 0.6rem;
  }

  .grid2 {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .actions .ghost {
    background: transparent;
  }

  .actions .danger {
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
</style>
