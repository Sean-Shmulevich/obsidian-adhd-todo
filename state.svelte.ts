import { TFile } from 'obsidian';
import type TodoPlugin from './main';
import { combineScanResults, scanSingleFile } from './vault-scanner';
import { VaultTodoWriter } from './vault-writer';
import type { Category, CategoryGroup, ScanResult, Task } from './types';

type NavView = 'dashboard';

type NavState = {
  view: NavView;
  groupId?: string;
  categoryId?: string;
  uncategorizedOnly?: boolean;
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

let pluginRef: TodoPlugin | null = null;
let writerRef: VaultTodoWriter | null = null;
let initialized = false;
let refreshTimer: number | null = null;
let scanQueue = Promise.resolve();
const fileScanCache = new Map<string, ScanResult>();
const queuedChangedPaths = new Set<string>();
const queuedDeletedPaths = new Set<string>();

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

  if (nav.uncategorizedOnly) {
    list = list.filter((task) => !task.categoryId);
  } else if (nav.categoryId) list = list.filter((task) => task.categoryId === nav.categoryId);
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

export function initializeTodoState(plugin: TodoPlugin) {
  pluginRef = plugin;
  writerRef = new VaultTodoWriter(plugin.app, plugin.settings, () => categories);

  if (initialized) return;
  initialized = true;

  const queueRefresh = (path?: string) => {
    if (path) {
      queuedDeletedPaths.delete(path);
      queuedChangedPaths.add(path);
    }
    if (refreshTimer != null) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      void flushQueuedVaultChanges();
    }, 300);
  };

  const queueDelete = (path: string) => {
    queuedChangedPaths.delete(path);
    queuedDeletedPaths.add(path);
    if (refreshTimer != null) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      void flushQueuedVaultChanges();
    }, 300);
  };

  plugin.registerEvent(plugin.app.vault.on('modify', (file) => {
    if (file instanceof TFile && file.extension === 'md') queueRefresh(file.path);
  }));
  plugin.registerEvent(plugin.app.vault.on('create', (file) => {
    if (file instanceof TFile && file.extension === 'md') queueRefresh(file.path);
  }));
  plugin.registerEvent(plugin.app.vault.on('delete', (file) => {
    if (file instanceof TFile && file.extension === 'md') queueDelete(file.path);
  }));
  plugin.registerEvent(plugin.app.vault.on('rename', (file, oldPath) => {
    if (typeof oldPath === 'string' && oldPath.endsWith('.md')) queueDelete(oldPath);
    if (file instanceof TFile && file.extension === 'md') queueRefresh(file.path);
  }));
}

export async function refreshVaultState() {
  return queueScanWork(performFullRefresh);
}

async function flushQueuedVaultChanges() {
  return queueScanWork(async () => {
    if (!pluginRef) return;

    const changedPaths = [...queuedChangedPaths];
    const deletedPaths = [...queuedDeletedPaths];
    queuedChangedPaths.clear();
    queuedDeletedPaths.clear();

    if (changedPaths.length === 0 && deletedPaths.length === 0) return;
    if (fileScanCache.size === 0) {
      await performFullRefresh();
      return;
    }

    ui.loading = true;
    ui.errorMessage = null;
    try {
      for (const path of deletedPaths) fileScanCache.delete(path);

      for (const path of changedPaths) {
        const file = pluginRef.app.vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile) || file.extension !== 'md') {
          fileScanCache.delete(path);
          continue;
        }
        const scan = await scanSingleFile(pluginRef.app, pluginRef.settings, file);
        fileScanCache.set(path, scan);
      }

      const scans = [...fileScanCache.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, scan]) => scan);
      applyScanResult(combineScanResults(scans));
      ui.lastScanAt = new Date().toISOString();
    } catch (error) {
      ui.errorMessage = error instanceof Error ? error.message : String(error);
      await performFullRefresh();
    } finally {
      ui.loading = false;
    }
  });
}

async function performFullRefresh() {
  if (!pluginRef) return;
  ui.loading = true;
  ui.errorMessage = null;
  try {
    const files = pluginRef.app.vault.getMarkdownFiles();
    const scans = await Promise.all(files.map((file) => scanSingleFile(pluginRef.app, pluginRef.settings, file)));

    fileScanCache.clear();
    files.forEach((file, idx) => {
      fileScanCache.set(file.path, scans[idx]);
    });

    applyScanResult(combineScanResults(scans));
    ui.lastScanAt = new Date().toISOString();
  } catch (error) {
    ui.errorMessage = error instanceof Error ? error.message : String(error);
  } finally {
    ui.loading = false;
  }
}

function queueScanWork(work: () => Promise<void>) {
  scanQueue = scanQueue.then(work, work);
  return scanQueue;
}

function applyScanResult(scanned: ScanResult) {
  reconcileGroups(scanned.categoryGroups);
  reconcileCategories(scanned.categories);
  reconcileTasks(scanned.tasks);
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
  const categoryIdBySourceKey = new Map(
    categories.map((category) => [
      `${category.sourceGroupKey ?? ''}/${category.sourceCategoryKey ?? category.name.toLowerCase()}`,
      category.id
    ])
  );
  const prevByKey = new Map(
    tasks.map((task) => [`${task.sourceFile ?? ''}:${task.sourceLine ?? ''}:${task.title.toLowerCase()}`, task])
  );

  const merged = nextTasks.map((task, idx) => {
    const key = `${task.sourceFile ?? ''}:${task.sourceLine ?? ''}:${task.title.toLowerCase()}`;
    const prev = prevByKey.get(key);
    const sourceKey = taskCategorySourceKey(task);
    const sortKey = task.sourceFile && task.sourceLine != null ? `${task.sourceFile}:${task.sourceLine}` : undefined;
    const customSort = sortKey && pluginRef ? pluginRef.customSortOrders[sortKey] : undefined;
    return {
      ...task,
      id: prev?.id ?? task.id ?? makeId(),
      categoryId: sourceKey ? categoryIdBySourceKey.get(sourceKey) : undefined,
      sortOrder: customSort ?? idx
    } satisfies Task;
  });

  tasks.splice(0, tasks.length, ...merged);
}

function taskCategorySourceKey(task: Task): string | undefined {
  if (!task.sourceTag) return undefined;
  const tagPrefix = pluginRef?.settings.tagPrefix || '#todo';
  if (!task.sourceTag.startsWith(`${tagPrefix}/`)) return undefined;
  const parts = task.sourceTag.slice(tagPrefix.length).split('/').filter(Boolean);
  if (parts.length < 2) return undefined;
  return `${parts[0].toLowerCase()}/${parts[1].toLowerCase()}`;
}

export function setNavDashboard() {
  nav.view = 'dashboard';
  nav.groupId = undefined;
  nav.categoryId = undefined;
  nav.uncategorizedOnly = undefined;
}

export function setNavGroup(groupId: string) {
  nav.view = 'dashboard';
  nav.groupId = groupId;
  nav.categoryId = undefined;
  nav.uncategorizedOnly = undefined;
}

export function setNavCategory(categoryId: string) {
  nav.view = 'dashboard';
  nav.categoryId = categoryId;
  nav.groupId = undefined;
  nav.uncategorizedOnly = undefined;
}

export function setNavUncategorized() {
  nav.view = 'dashboard';
  nav.categoryId = undefined;
  nav.groupId = undefined;
  nav.uncategorizedOnly = true;
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

export async function addTask(input: { title: string; categoryId?: string; subTag?: string }) {
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

/** Reorder: move draggedTaskId to the position of targetTaskId within the current visible list */
export function moveTask(draggedTaskId: string, targetTaskId: string) {
  if (draggedTaskId === targetTaskId || !pluginRef) return;

  const visible = visibleTasksValue;
  const dragIdx = visible.findIndex(t => t.id === draggedTaskId);
  const targetIdx = visible.findIndex(t => t.id === targetTaskId);
  if (dragIdx === -1 || targetIdx === -1) return;

  // Build new sort order for all visible tasks
  const reordered = [...visible];
  const [moved] = reordered.splice(dragIdx, 1);
  // The drop indicator shows below the target card, meaning "insert after".
  // When dragging down, the splice removal shifts targetIdx down by 1,
  // so inserting at targetIdx already lands after the target. When dragging
  // up, indices before dragIdx are unchanged, so we need targetIdx + 1.
  const insertIdx = dragIdx > targetIdx ? targetIdx + 1 : targetIdx;
  reordered.splice(insertIdx, 0, moved);

  // Persist custom sort orders keyed by sourceFile:sourceLine
  for (let i = 0; i < reordered.length; i++) {
    const t = reordered[i];
    const key = taskSortKey(t);
    if (key) {
      pluginRef.customSortOrders[key] = i;
    }
    // Also update the in-memory sortOrder for immediate reactivity
    const real = tasks.find(rt => rt.id === t.id);
    if (real) real.sortOrder = i;
  }

  void pluginRef.saveSortOrders();
}

function taskSortKey(task: Task): string | undefined {
  if (task.sourceFile && task.sourceLine != null) {
    return `${task.sourceFile}:${task.sourceLine}`;
  }
  return undefined;
}

/** Move a task to a different subtag within its category (rewrites the #todo tag in vault) */
export async function changeTaskSubTag(taskId: string, newSubTag: string | undefined) {
  if (!writerRef) return;
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  await writerRef.changeSubTag(task, newSubTag);
  await refreshVaultState();
}

export async function openTaskInObsidian(taskId: string) {
  if (!pluginRef) return;
  const task = tasks.find((t) => t.id === taskId);
  if (!task?.sourceFile) return;
  await pluginRef.app.workspace.openLinkText(task.sourceFile, '', false);
}
