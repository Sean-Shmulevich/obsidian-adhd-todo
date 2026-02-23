<script lang="ts">
  import { onMount } from 'svelte';
  import type TodoPlugin from '../main';
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

  let { plugin }: { plugin: TodoPlugin } = $props();
  let containerEl = $state<HTMLDivElement | null>(null);
  let isNarrowViewport = $state(false);
  let sidebarOpen = $state(true);

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

  function applyResponsiveLayout(width?: number) {
    const nextIsNarrow = (width ?? containerEl?.clientWidth ?? 0) <= 900;
    if (nextIsNarrow !== isNarrowViewport) {
      isNarrowViewport = nextIsNarrow;
      sidebarOpen = !nextIsNarrow;
    }
  }

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function closeSidebarOnMobileNavigate() {
    if (isNarrowViewport) sidebarOpen = false;
  }

  onMount(() => {
    if (!containerEl) return;
    applyResponsiveLayout(containerEl.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      applyResponsiveLayout(entry.contentRect.width);
    });
    observer.observe(containerEl);
    return () => observer.disconnect();
  });
</script>

<div
  class="tasks-dashboard-container"
  class:is-narrow={isNarrowViewport}
  class:sidebar-open={sidebarOpen}
  bind:this={containerEl}
>
  <aside class="tasks-dashboard-sidebar-pane" id="tasks-dashboard-sidebar">
    <Sidebar mobile={isNarrowViewport} onNavigate={closeSidebarOnMobileNavigate} settings={plugin.settings} />
  </aside>

  {#if isNarrowViewport && sidebarOpen}
    <button
      type="button"
      class="tasks-dashboard-sidebar-backdrop"
      aria-label="Close sidebar"
      onclick={() => (sidebarOpen = false)}
    ></button>
  {/if}

  <main class="tasks-dashboard-main">
    <button
      type="button"
      class="tasks-dashboard-sidebar-toggle"
      aria-controls="tasks-dashboard-sidebar"
      aria-expanded={sidebarOpen}
      onclick={toggleSidebar}
    >
      ☰ Menu
    </button>

    {#if ui.errorMessage}
      <div class="error-banner">Scan failed: {ui.errorMessage}</div>
    {/if}

    <TaskBoard
      app={plugin.app}
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
