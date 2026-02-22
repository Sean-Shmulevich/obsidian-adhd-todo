<script lang="ts">
  let {
    initialMinutes = 25,
    compact = false
  }: {
    initialMinutes?: number;
    compact?: boolean;
  } = $props();

  let durationMinutes = $state(25);
  let secondsRemaining = $state(25 * 60);
  let running = $state(false);
  let seededFromProp = $state(false);

  const desiredInitialMinutes = $derived(Math.max(1, initialMinutes));

  const mm = $derived(String(Math.floor(secondsRemaining / 60)).padStart(2, '0'));
  const ss = $derived(String(secondsRemaining % 60).padStart(2, '0'));

  function resetTimer() {
    running = false;
    secondsRemaining = durationMinutes * 60;
  }

  function toggle() {
    running = !running;
  }

  $effect(() => {
    if (!seededFromProp) {
      durationMinutes = desiredInitialMinutes;
      secondsRemaining = desiredInitialMinutes * 60;
      seededFromProp = true;
    }
  });

  $effect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (secondsRemaining <= 1) {
        secondsRemaining = 0;
        running = false;
        return;
      }
      secondsRemaining -= 1;
    }, 1000);
    return () => clearInterval(id);
  });

  $effect(() => {
    if (running) return;
    if (secondsRemaining === 0) {
      secondsRemaining = durationMinutes * 60;
    }
  });
</script>

<section class="focus-mode" class:compact aria-label="Focus Mode Pomodoro">
  <div>
    <h3>Focus Mode</h3>
    <p>Pomodoro timer for short, reliable bursts.</p>
  </div>
  <div class="timer">{mm}:{ss}</div>
  <div class="controls">
    <label>
      <span>Minutes</span>
      <input type="number" min="5" max="90" bind:value={durationMinutes} disabled={running} />
    </label>
    <button type="button" onclick={toggle}>{running ? 'Pause' : 'Start'}</button>
    <button type="button" onclick={resetTimer}>Reset</button>
  </div>
</section>

<style>
  .focus-mode {
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 1rem;
    border: 1px solid var(--border-color);
    background: linear-gradient(180deg, var(--surface-2), var(--surface-1));
  }

  .focus-mode.compact h3 { font-size: 0.95rem; }

  h3 {
    margin: 0;
    font-size: 1rem;
  }

  p {
    margin: 0.2rem 0 0;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .timer {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: end;
  }

  label {
    display: grid;
    gap: 0.2rem;
    font-size: 0.8rem;
  }

  input,
  button {
    background: var(--surface-1);
    border: 1px solid var(--border-color);
    color: inherit;
    border-radius: 0.6rem;
    padding: 0.45rem 0.65rem;
  }

  input { width: 4.75rem; }
</style>
