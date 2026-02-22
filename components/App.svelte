<script lang="ts">
  import type ADHDTodoPlugin from '../main';
  import {
    categories,
    categoryGroups,
    getCategory,
    initializeTodoState,
    nav,
    refreshVaultState,
    setNavDashboard,
    setNavFocus,
    ui
  } from '../state.svelte.ts';
  import Sidebar from './Sidebar.svelte';
  import TaskBoard from './TaskBoard.svelte';
  import FocusMode from './FocusMode.svelte';

  let { plugin }: { plugin: ADHDTodoPlugin } = $props();

  $effect(() => {
    initializeTodoState(plugin);
  });

  const activeGroup = $derived(nav.groupId ? categoryGroups.find((g) => g.id === nav.groupId) : undefined);
  const activeCategory = $derived(nav.categoryId ? getCategory(nav.categoryId) : undefined);
  const pageTitle = $derived(
    nav.view === 'focus'
      ? 'Focus Mode'
      : activeCategory
        ? `${activeCategory.emoji ? `${activeCategory.emoji} ` : ''}${activeCategory.name}`
        : activeGroup
          ? activeGroup.name
          : 'Dashboard'
  );
</script>

<div class="adhd-todo-container">
  <aside class="adhd-todo-sidebar-pane">
    <Sidebar />
  </aside>

  <main class="adhd-todo-main">
    <header class="topbar">
      <div>
        <h1>{pageTitle}</h1>
        <p>
          {#if nav.view === 'focus'}
            Pomodoro timer inside Obsidian.
          {:else if activeCategory}
            Tasks from this category sourced from `#todo` tags in your vault.
          {:else if activeGroup}
            Group view across categories and group-level tagged tasks.
          {:else}
            All scanned tasks from your vault.
          {/if}
        </p>
      </div>
      <div class="topbar-actions">
        <button type="button" class:active={nav.view !== 'focus'} onclick={setNavDashboard}>Board</button>
        <button type="button" class:active={nav.view === 'focus'} onclick={setNavFocus}>Focus</button>
        <button type="button" onclick={() => refreshVaultState()} disabled={ui.loading}>
          {ui.loading ? 'Scanning…' : 'Rescan'}
        </button>
      </div>
    </header>

    {#if ui.errorMessage}
      <div class="error-banner">Scan failed: {ui.errorMessage}</div>
    {/if}

    {#if nav.view === 'focus'}
      <div class="focus-layout">
        <FocusMode initialMinutes={plugin.settings.focusDuration} />
        <section class="panel">
          <h3>Plugin Status</h3>
          <p>Tag prefix: <code>{plugin.settings.tagPrefix}</code></p>
          <p>Inbox file: <code>{plugin.settings.inboxFile}</code></p>
          <p>Categories: {categories.length} · Groups: {categoryGroups.length}</p>
          <p>Last scan: {ui.lastScanAt ? new Date(ui.lastScanAt).toLocaleString() : 'Never'}</p>
        </section>
      </div>
    {:else}
      <TaskBoard title={pageTitle} filterCategoryId={nav.categoryId} filterGroupId={nav.groupId} />
    {/if}
  </main>
</div>
