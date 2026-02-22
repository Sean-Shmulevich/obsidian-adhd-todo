<script lang="ts">
  import type ADHDTodoPlugin from '../main';
  import {
    categoryGroups,
    getCategory,
    initializeTodoState,
    nav,
    refreshVaultState,
    setNavCategory,
    setNavDashboard,
    setNavUncategorized,
    ui
  } from '../state.svelte.ts';
  import Sidebar from './Sidebar.svelte';
  import TaskBoard from './TaskBoard.svelte';

  let { plugin }: { plugin: ADHDTodoPlugin } = $props();

  $effect(() => {
    initializeTodoState(plugin);
  });

  const activeGroup = $derived(nav.groupId ? categoryGroups.find((g) => g.id === nav.groupId) : undefined);
  const activeCategory = $derived(nav.categoryId ? getCategory(nav.categoryId) : undefined);
  const isDashboardView = $derived(!nav.groupId && !nav.categoryId && !nav.uncategorizedOnly);
  const pageTitle = $derived(
    activeCategory
      ? `${activeCategory.emoji ? `${activeCategory.emoji} ` : ''}${activeCategory.name}`
      : nav.uncategorizedOnly
        ? 'Uncategorized / Group-level'
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
    {#if ui.errorMessage}
      <div class="error-banner">Scan failed: {ui.errorMessage}</div>
    {/if}

    <TaskBoard
      title={pageTitle}
      filterCategoryId={nav.categoryId}
      filterGroupId={nav.groupId}
      filterUncategorized={nav.uncategorizedOnly}
      showCategoriesCard={isDashboardView}
      boardActive={isDashboardView}
      rescanLoading={ui.loading}
      onSelectCategory={(categoryId) => setNavCategory(categoryId)}
      onSelectUncategorized={setNavUncategorized}
      onBoard={setNavDashboard}
      onRescan={() => refreshVaultState()}
    />
  </main>
</div>
