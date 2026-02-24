<script lang="ts">
  import {
    categories,
    categoryLabel,
    changeTaskCategory,
    changeTaskSubTag,
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
    showInlineCategoryPicker = false,
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
    showInlineCategoryPicker?: boolean;
    onGoToCategory?: (categoryId: string) => void;
    onEnlarge?: (task: Task) => void;
  } = $props();

  const catName = $derived(showCategory ? categoryLabel(task.categoryId) : '');

  let editing = $state(false);
  let editTitle = $state('');
  let holdReady = $state(false);
  let holdTimer: ReturnType<typeof setTimeout> | null = null;

  function startHold() {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      holdReady = true;
      holdTimer = null;
    }, 10);
  }

  function cancelHold() {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  }

  function endHold() {
    cancelHold();
    holdReady = false;
  }

  let inlineCategoryId = $state('');
  let inlineSubTag = $state('');

  $effect(() => {
    inlineCategoryId = task.categoryId ?? '';
    inlineSubTag = task.subTag ?? '';
  });

  function startEditing() {
    editTitle = task.title;
    editing = true;
  }

  function cancelEditing() {
    editing = false;
  }

  async function saveTitle() {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      await updateTask(task.id, { title: trimmed });
    }
    editing = false;
  }

  function cancelInline() {
    inlineCategoryId = task.categoryId ?? '';
    inlineSubTag = task.subTag ?? '';
    editing = false;
  }

  async function saveInline() {
    const newCatId = inlineCategoryId || undefined;
    const newSubTag = inlineSubTag.trim().replace(/\s+/g, '-').toLowerCase() || undefined;
    if (newCatId !== task.categoryId) {
      await changeTaskCategory(task.id, newCatId);
    }
    if (newSubTag !== (task.subTag ?? undefined)) {
      await changeTaskSubTag(task.id, newSubTag);
    }
    editing = false;
  }
</script>

<article
  class="task-card"
  class:done={task.completed}
  class:drag-over={isDragOver && !isDragAbove}
  class:drag-over-top={isDragOver && isDragAbove}
  draggable="true"
  onpointerdown={startHold}
  onpointerup={endHold}
  onpointercancel={cancelHold}
  ondragstart={(event) => {
    if (!holdReady) {
      event.preventDefault();
      return;
    }
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
  ondragend={(event) => {
    event.stopPropagation();
    endHold();
  }}
>
  <div class="row top-row">
    {#if editing}
      <div class="edit-title-row">
        <input type="text" class="edit-title-input" bind:value={editTitle} maxlength="140"
          onkeydown={(e) => { e.stopPropagation(); if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') cancelEditing(); }} />
        <button type="button" class="inline-picker-save" title="Save" onclick={saveTitle}>&#10003;</button>
        <button type="button" class="inline-picker-cancel" title="Cancel" onclick={cancelEditing}>&#10005;</button>
      </div>
    {:else}
      <div class="checkbox-row" onclick={() => toggleTaskComplete(task.id)} onkeydown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleTaskComplete(task.id); }}} role="checkbox" aria-checked={task.completed} tabindex="0">
        <input type="checkbox" checked={task.completed} tabindex="-1" style="pointer-events: none;" />
        <span class="title">{task.title}</span>
      </div>
    {/if}
    <div class="right-controls">
      {#if showCategory && catName && catName !== 'Uncategorized'}
        <button
          type="button"
          class="cat-badge"
          title="Go to {catName}"
          onclick={() => task.categoryId && onGoToCategory?.(task.categoryId)}
        >{catName}</button>
      {/if}
      <button type="button" class="ghost icon-btn" title="Enlarge" onclick={() => onEnlarge?.(task)}>⧉</button>
      <button type="button" class="ghost icon-btn" title="Open in Obsidian" onclick={() => openTaskInObsidian(task.id)}>↗</button>
      <button type="button" class="ghost icon-btn" title={editing ? 'Cancel edit' : 'Edit'} onclick={() => editing ? cancelEditing() : startEditing()}>{editing ? '✕' : '✎'}</button>
      <button type="button" class="danger icon-btn" title="Delete" onclick={() => deleteTask(task.id)}>🗑</button>
    </div>
  </div>

  {#if showInlineCategoryPicker || editing}
    <div class="inline-picker-row">
      <select class="inline-picker-select" bind:value={inlineCategoryId}>
        <option value="">Category…</option>
        {#each [...categories].sort((a, b) => a.sortOrder - b.sortOrder) as cat}
          <option value={cat.id}>{cat.emoji ? `${cat.emoji} ` : ''}{cat.name}</option>
        {/each}
      </select>
      <input class="inline-picker-input" type="text" bind:value={inlineSubTag} placeholder="subtag" onkeydown={(e) => e.stopPropagation()} />
      <button type="button" class="inline-picker-save" title="Save" onclick={saveInline}>&#10003;</button>
      <button type="button" class="inline-picker-cancel" title="Cancel" onclick={cancelInline}>&#10005;</button>
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

  .edit-title-row {
    display: flex;
    flex: 1 1 auto;
    gap: 0.35rem;
    align-items: center;
    min-width: 0;
  }

  .edit-title-input {
    flex: 1 1 auto;
    min-width: 0;
    background: var(--surface-2);
    border: 1px solid var(--border-color);
    color: inherit;
    border-radius: 0.55rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .inline-picker-row {
    display: grid;
    grid-template-columns: 1fr 1fr auto auto;
    gap: 0.35rem;
    align-items: center;
  }

  .inline-picker-select,
  .inline-picker-input {
    background: var(--surface-2);
    border: 1px solid var(--border-color);
    color: inherit;
    border-radius: 0.55rem;
    padding: 0.3rem 0.5rem;
    font-size: 0.8rem;
    min-width: 0;
  }

  .inline-picker-save {
    all: unset;
    display: grid;
    place-items: center;
    min-width: 1.4rem;
    min-height: 1.4rem;
    border-radius: 0.45rem;
    background: var(--interactive-accent, #7c3aed);
    color: var(--text-on-accent, #fff);
    font-size: 0.75rem;
    cursor: pointer;
    opacity: 0.85;
  }

  .inline-picker-save:hover,
  .inline-picker-cancel:hover {
    opacity: 1;
  }

  .inline-picker-cancel {
    all: unset;
    display: grid;
    place-items: center;
    min-width: 1.4rem;
    min-height: 1.4rem;
    border-radius: 0.45rem;
    background: var(--surface-2);
    border: 1px solid var(--border-color);
    color: inherit;
    font-size: 0.75rem;
    cursor: pointer;
    opacity: 0.6;
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
