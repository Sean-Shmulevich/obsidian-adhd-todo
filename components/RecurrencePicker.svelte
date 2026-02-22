<script lang="ts">
  import type { Recurrence } from '../types';

  let {
    value,
    onChange,
    compact = false
  }: {
    value?: Recurrence;
    onChange: (value?: Recurrence) => void;
    compact?: boolean;
  } = $props();

  let enabled = $state(false);
  let type = $state<Recurrence['type']>('daily');
  let interval = $state<number>(1);
  let daysOfWeek = $state<number[]>([]);

  $effect(() => {
    enabled = Boolean(value);
    type = value?.type ?? 'daily';
    interval = value?.interval ?? 1;
    daysOfWeek = value?.daysOfWeek ? [...value.daysOfWeek] : [];
  });

  function emit() {
    if (!enabled) {
      onChange(undefined);
      return;
    }
    onChange({
      type,
      interval: Math.max(1, Number(interval) || 1),
      ...(type === 'weekly' && daysOfWeek.length
        ? { daysOfWeek: [...daysOfWeek].sort((a, b) => a - b) }
        : {})
    });
  }

  function toggleDay(day: number) {
    daysOfWeek = daysOfWeek.includes(day)
      ? daysOfWeek.filter((value) => value !== day)
      : [...daysOfWeek, day];
    emit();
  }
</script>

<div class:compact class="recurrence-picker">
  <label class="inline-toggle">
    <input
      type="checkbox"
      checked={enabled}
      onchange={(event) => {
        enabled = (event.currentTarget as HTMLInputElement).checked;
        emit();
      }}
    />
    <span>Recurring</span>
  </label>

  {#if enabled}
    <div class="recurrence-fields">
      <select bind:value={type} onchange={() => emit()}>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
      <label>
        <span>Every</span>
        <input type="number" min="1" bind:value={interval} onchange={() => emit()} />
        <span>{type === 'daily' ? 'day(s)' : type === 'weekly' ? 'week(s)' : 'month(s)'}</span>
      </label>
    </div>
    {#if type === 'weekly'}
      <div class="dow-row" aria-label="days of week">
        {#each ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as label, day}
          <button type="button" class:selected={daysOfWeek.includes(day)} onclick={() => toggleDay(day)}>
            {label}
          </button>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .recurrence-picker {
    display: grid;
    gap: 0.5rem;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.65rem;
    background: var(--surface-2);
  }

  .recurrence-picker.compact {
    padding: 0.4rem;
    gap: 0.35rem;
  }

  .inline-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .recurrence-fields {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .recurrence-fields label {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    font-size: 0.85rem;
  }

  select,
  input[type='number'] {
    background: var(--surface-1);
    border: 1px solid var(--border-color);
    color: inherit;
    border-radius: 0.45rem;
    padding: 0.35rem 0.5rem;
  }

  input[type='number'] {
    width: 4rem;
  }

  .dow-row {
    display: flex;
    gap: 0.35rem;
  }

  .dow-row button {
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 999px;
    border: 1px solid var(--border-color);
    background: var(--surface-1);
    color: inherit;
  }

  .dow-row button.selected {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
  }
</style>
