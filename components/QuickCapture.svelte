<script lang="ts">
  import { addTask, categories } from '../state.svelte.ts';
  import RecurrencePicker from './RecurrencePicker.svelte';
  import type { Priority, Recurrence } from '../types';

  let { defaultCategoryId }: { defaultCategoryId?: string } = $props();

  let title = $state('');
  let priority = $state<Priority>('medium');
  let categoryId = $state<string>('');
  let recurrence = $state<Recurrence | undefined>(undefined);
  let submitting = $state(false);

  $effect(() => {
    categoryId = defaultCategoryId ?? '';
  });

  async function submit() {
    if (!title.trim() || submitting) return;
    submitting = true;
    try {
      await addTask({ title, priority, categoryId: categoryId || undefined });
      title = '';
      priority = 'medium';
      recurrence = undefined;
    } finally {
      submitting = false;
    }
  }
</script>

<section class="quick-capture">
  <div class="header">
    <h2>Quick Capture</h2>
    <p>Fast task entry into your vault inbox file.</p>
  </div>
  <form
    onsubmit={(event) => {
      event.preventDefault();
      void submit();
    }}
  >
    <input
      type="text"
      bind:value={title}
      placeholder="What needs to happen next?"
      maxlength="140"
    />
    <div class="row">
      <label>
        <span>Priority</span>
        <select bind:value={priority}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      <label>
        <span>Category</span>
        <select bind:value={categoryId}>
          <option value="">Uncategorized (uses #todo)</option>
          {#each [...categories].sort((a, b) => a.sortOrder - b.sortOrder) as category}
            <option value={category.id}>{category.emoji ? `${category.emoji} ` : ''}{category.name}</option>
          {/each}
        </select>
      </label>
      <button type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add Task'}</button>
    </div>
    <RecurrencePicker value={recurrence} onChange={(value) => (recurrence = value)} />
    <p class="note">Recurrence is UI-only for now; vault writeback stores title, category tag, and priority marker.</p>
  </form>
</section>

<style>
  .quick-capture {
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 1rem;
    border: 1px solid var(--border-color);
    background: var(--surface-1);
  }

  .header h2 {
    margin: 0;
    font-size: 1.05rem;
  }

  .header p {
    margin: 0.2rem 0 0;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  form {
    display: grid;
    gap: 0.75rem;
  }

  input[type='text'] {
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--border-color);
    border-radius: 0.7rem;
    padding: 0.7rem 0.85rem;
    color: inherit;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: end;
  }

  label {
    display: grid;
    gap: 0.25rem;
    font-size: 0.8rem;
  }

  select,
  button {
    background: var(--surface-2);
    border: 1px solid var(--border-color);
    color: inherit;
    border-radius: 0.6rem;
    padding: 0.5rem 0.65rem;
  }

  button[type='submit'] {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
    font-weight: 700;
  }

  .note {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  @media (max-width: 700px) {
    .row > * {
      flex: 1 1 100%;
    }
  }
</style>
