<script lang="ts">
  import {
    categories,
    categoryLabel,
    deleteTask,
    openTaskInObsidian,
    toggleTaskComplete,
    updateTask
  } from '../state.svelte.ts';
  import type { Task } from '../types';

  let {
    task,
    onDragStart,
    onDropOn,
    onDragEnter,
    isDragOver = false,
    isDragAbove = false,
    showCategory = false,
    onGoToCategory,
    onEnlarge
  }: {
    task: Task;
    onDragStart?: (id: string) => void;
    onDropOn?: (id: string) => void;
    onDragEnter?: (id: string) => void;
    isDragOver?: boolean;
    isDragAbove?: boolean;
    showCategory?: boolean;
    onGoToCategory?: (categoryId: string) => void;
    onEnlarge?: (task: Task) => void;
  } = $props();

  const catName = $derived(showCategory ? categoryLabel(task.categoryId) : '');

  let editing = $state(false);
  let title = $state('');
  let categoryId = $state('');

  $effect(() => {
    title = task.title;
    categoryId = task.categoryId ?? '';
  });

  async function save() {
    await updateTask(task.id, { title, categoryId: categoryId || undefined });
    editing = false;
  }
</script>

<article
  class="task-card"
  class:done={task.completed}
  class:drag-over={isDragOver && !isDragAbove}
  class:drag-over-top={isDragOver && isDragAbove}
  draggable="true"
  ondragstart={(event) => {
    event.dataTransfer?.setData('text/plain', task.id);
    event.dataTransfer!.effectAllowed = 'move';
    event.stopPropagation();
    onDragStart?.(task.id);
  }}
  ondragover={(event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer!.dropEffect = 'move';
  }}
  ondragenter={(event) => {
    event.preventDefault();
    event.stopPropagation();
    onDragEnter?.(task.id);
  }}
  ondrop={(event) => {
    event.preventDefault();
    event.stopPropagation();
    onDropOn?.(task.id);
  }}
  ondragend={(event) => event.stopPropagation()}
>
  <div class="row top-row">
    <label class="checkbox-row">
      <input type="checkbox" checked={task.completed} onchange={() => toggleTaskComplete(task.id)} />
      <span class="title">{task.title}</span>
    </label>
    <div class="right-controls">
      {#if showCategory && catName && catName !== 'Uncategorized'}
        <button
          type="button"
          class="cat-badge"
          title="Go to {catName}"
          onclick={() => task.categoryId && onGoToCategory?.(task.categoryId)}
        >{catName}</button>
      {/if}
      {#if !editing}
        <button type="button" class="ghost icon-btn" title="Enlarge" onclick={() => onEnlarge?.(task)}>⧉</button>
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
    cursor: grab;
    position: relative;
  }

  .task-card.drag-over::after,
  .task-card.drag-over-top::before {
    content: '';
    position: absolute;
    left: 0.5rem;
    right: 0.5rem;
    height: 2px;
    background: var(--interactive-accent, #7c3aed);
    border-radius: 1px;
    pointer-events: none;
  }

  .task-card.drag-over::after {
    bottom: -0.3rem;
  }

  .task-card.drag-over-top::before {
    top: -0.3rem;
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

  .cat-badge {
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    font-size: 0.65rem;
    font-weight: 600;
    background: color-mix(in srgb, var(--interactive-accent, #7c3aed) 18%, var(--surface-2, #2a2a3e));
    border: 1px solid var(--border-color);
    color: var(--text-normal);
    cursor: pointer;
    white-space: nowrap;
    transition: background 120ms ease;
  }

  .cat-badge:hover {
    background: color-mix(in srgb, var(--interactive-accent, #7c3aed) 35%, var(--surface-2, #2a2a3e));
  }

  .icon-btn {
    all: unset;
    display: grid;
    place-items: center;
    min-width: 1.2rem;
    min-height: 1.2rem;
    padding: 0;
    line-height: 1;
    font-size: 0.8rem;
    cursor: pointer;
    opacity: 0.6;
  }

  .icon-btn:hover {
    opacity: 1;
  }

  .actions .ghost {
    background: transparent;
  }

  .danger {
    color: #ff6b6b;
  }

  .note {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  @media (max-width: 600px) {
    .task-card {
      padding: 0.35rem 0.4rem;
    }

    .checkbox-row {
      gap: 0.35rem;
    }

    .grid2 { grid-template-columns: 1fr; }

    .actions {
      justify-content: flex-start;
    }
  }

  @media (max-width: 400px) {
    .top-row {
      flex-wrap: wrap;
    }

    .icon-btn {
      min-width: 1.65rem;
      min-height: 1.65rem;
    }
  }
</style>
