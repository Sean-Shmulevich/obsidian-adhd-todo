<script lang="ts">
  import {
    categoriesByGroup,
    nav,
    setNavCategory,
    setNavDashboard,
    setNavFocus,
    setNavGroup,
    toggleGroupCollapsed,
    ungroupedCategories
  } from '../state.svelte.ts';

  let { mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void } = $props();

  const grouped = $derived(categoriesByGroup());
  const looseCategories = $derived(ungroupedCategories());

  function goDashboard() {
    setNavDashboard();
    onNavigate?.();
  }

  function goFocus() {
    setNavFocus();
    onNavigate?.();
  }

  function goGroup(id: string) {
    setNavGroup(id);
    onNavigate?.();
  }

  function goCategory(id: string) {
    setNavCategory(id);
    onNavigate?.();
  }
</script>

<nav class="sidebar" class:mobile aria-label="Sidebar navigation">
  <div class="brand">
    <div class="logo">✓</div>
    <div>
      <strong>ADHD Todo</strong>
      <small>Vault-backed task board</small>
    </div>
  </div>

  <button type="button" class:active={nav.view !== 'focus' && !nav.groupId && !nav.categoryId} onclick={goDashboard}>🏡 Dashboard</button>
  <button type="button" class:active={nav.view === 'focus'} onclick={goFocus}>🍅 Focus Mode</button>

  <div class="group-list">
    {#each grouped as section (section.group.id)}
      <div class="group-block">
        <div class="group-header-row">
          <button type="button" class="group-collapse" onclick={() => toggleGroupCollapsed(section.group.id)}>
            <span class:rotated={section.group.collapsed}>▸</span>
          </button>
          <button type="button" class="group-label" onclick={() => goGroup(section.group.id)}>
            {section.group.name}
          </button>
        </div>
        {#if !section.group.collapsed}
          <div class="items">
            {#each section.categories as category (category.id)}
              <button
                type="button"
                class="category-item"
                class:active={nav.categoryId === category.id}
                onclick={() => goCategory(category.id)}
              >
                <span class="accent" style={`background:${category.color ?? 'var(--accent)'}`}></span>
                <span class="emoji">{category.emoji ?? '•'}</span>
                <span>{category.name}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}

    {#if looseCategories.length}
      <div class="group-block">
        <div class="group-header-static">UNGROUPED</div>
        <div class="items">
          {#each looseCategories as category (category.id)}
            <button
              type="button"
              class="category-item"
              class:active={nav.categoryId === category.id}
              onclick={() => goCategory(category.id)}
            >
              <span class="accent" style={`background:${category.color ?? 'var(--accent)'}`}></span>
              <span class="emoji">{category.emoji ?? '•'}</span>
              <span>{category.name}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</nav>

<style>
  .sidebar {
    display: grid;
    grid-template-rows: auto auto auto 1fr;
    gap: 0.35rem;
    height: 100%;
    min-height: 0;
    padding: 0.5rem;
    background: var(--sidebar-bg);
    color: var(--sidebar-text);
    border-right: 1px solid var(--sidebar-border);
  }

  .brand {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.25rem 0.25rem 0.35rem;
  }

  .logo {
    width: 2rem;
    height: 2rem;
    display: grid;
    place-items: center;
    border-radius: 0.6rem;
    background: color-mix(in srgb, var(--accent) 20%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 50%, var(--sidebar-border));
    font-weight: 800;
  }

  .brand small {
    color: var(--sidebar-muted);
  }

  .sidebar button {
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    color: inherit;
    border-radius: 0.5rem;
    padding: 0.35rem 0.5rem;
    font: inherit;
  }

  .sidebar > button.active {
    background: var(--sidebar-active-bg);
    border-color: var(--sidebar-border);
  }

  .group-list {
    overflow: auto;
    display: grid;
    gap: 0.4rem;
    align-content: start;
    padding-right: 0.1rem;
  }

  .group-header-row {
    display: flex;
    gap: 0.15rem;
    align-items: center;
  }

  .group-collapse {
    border: 0;
    color: var(--sidebar-muted);
    padding: 0.05rem 0.2rem;
  }

  .group-collapse span {
    display: inline-block;
    transition: transform 120ms ease;
  }

  .group-collapse span.rotated {
    transform: rotate(90deg);
  }

  .group-label,
  .group-header-static {
    color: var(--sidebar-muted);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.1rem 0.15rem;
  }

  .group-header-static {
    padding-inline: 0.35rem;
  }

  .items {
    display: grid;
    gap: 0.05rem;
  }

  .category-item {
    display: grid;
    grid-template-columns: 3px 1.1rem 1fr;
    gap: 0.4rem;
    align-items: center;
    padding: 0.3rem 0.5rem;
    border-radius: 0.4rem;
    border: 1px solid transparent;
    font-size: 0.85rem;
  }

  .category-item .accent {
    width: 3px;
    height: 1.2rem;
    border-radius: 999px;
    opacity: 0.7;
  }

  .category-item.active {
    background: var(--sidebar-active-bg);
    border-color: var(--sidebar-border);
  }

  .category-item.active .accent {
    opacity: 1;
  }
</style>
