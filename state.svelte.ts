import { TFile } from 'obsidian';
import type ADHDTodoPlugin from './main';
import { scanVaultTodos } from './vault-scanner';
import { VaultTodoWriter } from './vault-writer';
import type { Category, CategoryGroup, Task } from './types';

type NavView = 'dashboard' | 'focus';

type NavState = {
  view: NavView;
  groupId?: string;
  categoryId?: string;
};

function makeId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const tasks = $state<Task[]>([]);
export const categories = $state<Category[]>([]);
export const categoryGroups = $state<CategoryGroup[]>([]);
export const ui = $state({
  loading: false,
  lastScanAt: null as string | null,
  errorMessage: null as string | null
});
export const nav = $state<NavState>({ view: 'dashboard' });

let pluginRef: ADHDTodoPlugin | null = null;
let writerRef: VaultTodoWriter | null = null;
let initialized = false;
let refreshTimer: number | null = null;

const categoriesByGroupValue = $derived.by(() => {
  const groups = [...categoryGroups].sort((a, b) => a.sortOrder - b.sortOrder);
  const cats = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  return groups.map((group) => ({
    group,
    categories: cats.filter((category) => category.groupId === group.id)
  }));
});

const ungroupedCategoriesValue = $derived.by(() => {
  const groupIds = new Set(categoryGroups.map((group) => group.id));
  return [...categories]
    .filter((category) => !category.groupId || !groupIds.has(category.groupId))
    .sort((a, b) => a.sortOrder - b.sortOrder);
});

const visibleTasksValue = $derived.by(() => {
  const showCompleted = pluginRef?.settings.showCompleted ?? true;
  let list = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);

  if (nav.categoryId) list = list.filter((task) => task.categoryId === nav.categoryId);
  else if (nav.groupId) {
    const group = categoryGroups.find((g) => g.id === nav.groupId);
    const groupKey = group?.sourceGroupKey?.toLowerCase();
    const catIds = new Set(categories.filter((c) => c.groupId === nav.groupId).map((c) => c.id));
    list = list.filter((task) => catIds.has(task.categoryId ?? '') || (!!groupKey && task.groupTag === groupKey));
  }

  if (!showCompleted) list = list.filter((task) => !task.completed);
  return list;
});

export function categoriesByGroup() {
  return categoriesByGroupValue;
}

export function ungroupedCategories() {
  return ungroupedCategoriesValue;
}

export function visibleTasks() {
  return visibleTasksValue;
}

export function initializeTodoState(plugin: ADHDTodoPlugin) {
  pluginRef = plugin;
  writerRef = new VaultTodoWriter(plugin.app, plugin.settings, () => categories);

  if (initialized) return;
  initialized = true;

  const queueRefresh = () => {
    if (refreshTimer != null) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      void refreshVaultState();
    }, 120);
  };

  plugin.registerEvent(plugin.app.vault.on('modify', (file) => {
    if (file instanceof TFile && file.extension === 'md') queueRefresh();
  }));
  plugin.registerEvent(plugin.app.vault.on('create', (file) => {
    if (file instanceof TFile && file.extension === 'md') queueRefresh();
  }));
  plugin.registerEvent(plugin.app.vault.on('delete', (file) => {
    if (file instanceof TFile && file.extension === 'md') queueRefresh();
  }));
  plugin.registerEvent(plugin.app.vault.on('rename', (file) => {
    if (file instanceof TFile && file.extension === 'md') queueRefresh();
  }));
}

export async function refreshVaultState() {
  if (!pluginRef) return;
  ui.loading = true;
  ui.errorMessage = null;
  try {
    const scanned = await scanVaultTodos(pluginRef.app, pluginRef.settings);
    reconcileGroups(scanned.categoryGroups);
    reconcileCategories(scanned.categories);
    reconcileTasks(scanned.tasks);
    ui.lastScanAt = new Date().toISOString();
  } catch (error) {
    ui.errorMessage = error instanceof Error ? error.message : String(error);
  } finally {
    ui.loading = false;
  }
}

function reconcileGroups(nextGroups: CategoryGroup[]) {
  const prevByKey = new Map(categoryGroups.map((g) => [g.sourceGroupKey ?? g.name.toLowerCase(), g]));
  const merged = nextGroups.map((group, idx) => {
    const key = group.sourceGroupKey ?? group.name.toLowerCase();
    const prev = prevByKey.get(key);
    return {
      ...group,
      id: prev?.id ?? group.id ?? makeId(),
      collapsed: prev?.collapsed ?? group.collapsed ?? false,
      archived: prev?.archived ?? group.archived,
      sortOrder: idx
    } satisfies CategoryGroup;
  });
  categoryGroups.splice(0, categoryGroups.length, ...merged);
}

function reconcileCategories(nextCategories: Category[]) {
  const groupIdByKey = new Map(categoryGroups.map((g) => [g.sourceGroupKey, g.id]));
  const prevByKey = new Map(categories.map((c) => [`${c.sourceGroupKey ?? ''}/${c.sourceCategoryKey ?? c.name.toLowerCase()}`, c]));

  const merged = nextCategories.map((category, idx) => {
    const key = `${category.sourceGroupKey ?? ''}/${category.sourceCategoryKey ?? category.name.toLowerCase()}`;
    const prev = prevByKey.get(key);
    return {
      ...category,
      id: prev?.id ?? category.id ?? makeId(),
      groupId: category.sourceGroupKey ? groupIdByKey.get(category.sourceGroupKey) : category.groupId,
      sortOrder: idx
    } satisfies Category;
  });

  categories.splice(0, categories.length, ...merged);
}

function reconcileTasks(nextTasks: Task[]) {
  const prevByKey = new Map(
    tasks.map((task) => [`${task.sourceFile ?? ''}:${task.sourceLine ?? ''}:${task.title.toLowerCase()}`, task])
  );

  const merged = nextTasks.map((task, idx) => {
    const key = `${task.sourceFile ?? ''}:${task.sourceLine ?? ''}:${task.title.toLowerCase()}`;
    const prev = prevByKey.get(key);
    return {
      ...task,
      id: prev?.id ?? task.id ?? makeId(),
      sortOrder: idx
    } satisfies Task;
  });

  tasks.splice(0, tasks.length, ...merged);
}

export function setNavDashboard() {
  nav.view = 'dashboard';
  nav.groupId = undefined;
  nav.categoryId = undefined;
}

export function setNavFocus() {
  nav.view = 'focus';
  nav.groupId = undefined;
  nav.categoryId = undefined;
}

export function setNavGroup(groupId: string) {
  nav.view = 'dashboard';
  nav.groupId = groupId;
  nav.categoryId = undefined;
}

export function setNavCategory(categoryId: string) {
  nav.view = 'dashboard';
  nav.categoryId = categoryId;
  nav.groupId = undefined;
}

export function getCategory(categoryId: string | undefined) {
  if (!categoryId) return undefined;
  return categories.find((category) => category.id === categoryId);
}

export function categoryLabel(categoryId: string | undefined) {
  return getCategory(categoryId)?.name ?? 'Uncategorized';
}

export function toggleGroupCollapsed(groupId: string) {
  const group = categoryGroups.find((g) => g.id === groupId);
  if (!group) return;
  group.collapsed = !group.collapsed;
}

export async function addTask(input: { title: string; categoryId?: string; priority?: Task['priority'] }) {
  if (!writerRef) return;
  await writerRef.addTask(input);
  await refreshVaultState();
}

export async function toggleTaskComplete(taskId: string) {
  if (!writerRef) return;
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;
  await writerRef.toggleComplete(task, !task.completed);
  await refreshVaultState();
}

export async function deleteTask(taskId: string) {
  if (!writerRef) return;
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;
  await writerRef.deleteTask(task);
  await refreshVaultState();
}

export async function updateTask(taskId: string, patch: Partial<Task>) {
  if (!writerRef) return;
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;
  if (typeof patch.title === 'string' && patch.title.trim() && patch.title !== task.title) {
    await writerRef.editTaskTitle(task, patch.title);
  }
  if (typeof patch.completed === 'boolean' && patch.completed !== task.completed) {
    await writerRef.toggleComplete(task, patch.completed);
  }
  await refreshVaultState();
}

export function moveTask(_taskId: string, _targetTaskId: string) {
  // Ordering is source-file based in this plugin; drag UI is kept but does not persist ordering yet.
}

export async function openTaskInObsidian(taskId: string) {
  if (!pluginRef) return;
  const task = tasks.find((t) => t.id === taskId);
  if (!task?.sourceFile) return;
  await pluginRef.app.workspace.openLinkText(task.sourceFile, '', false);
}
