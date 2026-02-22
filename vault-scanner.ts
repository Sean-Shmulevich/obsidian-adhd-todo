import { TFile, type App } from 'obsidian';
import type { TodoSettings } from './settings';
import type { Category, CategoryGroup, Priority, ScanResult, Task } from './types';

const CHECKBOX_RE = /^\s*[-*+]\s*\[(.)\]\s*/;
const LIST_ITEM_RE = /^\s*[-*+]\s+/;

const DEFAULT_EMOJI_MAP: Record<string, string> = {
  school: '🎓',
  programming: '💻',
  personal: '🏠',
  apps: '📱',
  learning: '📚',
  work: '💼',
  tech: '⚙️',
  health: '💪',
  finance: '💰'
};

function makeId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validTagRegex(tagPrefix: string) {
  return new RegExp(`^${escapeRegex(tagPrefix)}(?:\\/[\\w-]+)*$`);
}

function extractTag(line: string, tagPrefix: string): string | undefined {
  const raw = line.match(new RegExp(`${escapeRegex(tagPrefix)}(?:\\/[\\w-]+)*`, 'g')) ?? [];
  const validator = validTagRegex(tagPrefix);
  return raw.find((tag) => validator.test(tag));
}

function parseTagParts(tag: string, tagPrefix: string): string[] {
  return tag.slice(tagPrefix.length).split('/').filter(Boolean);
}

function parsePriority(line: string): Priority {
  if (line.includes('⏫') || line.includes('🔺')) return 'urgent';
  if (line.includes('🔼')) return 'high';
  if (line.includes('🔽')) return 'low';
  return 'medium';
}

function parseCompleted(line: string): { completed: boolean; completedAt?: string } {
  const match = line.match(CHECKBOX_RE);
  if (!match) return { completed: false };
  const mark = match[1].toLowerCase();
  if (mark !== 'x' && mark !== '-') return { completed: false };

  const doneDateMatch = line.match(/✅\s*(\d{4}-\d{2}-\d{2})/);
  return {
    completed: true,
    completedAt: doneDateMatch?.[1]
  };
}

function parseTaskTitle(line: string, tagPrefix: string): string {
  return line
    .replace(CHECKBOX_RE, '')
    .replace(LIST_ITEM_RE, '')
    .replace(new RegExp(`${escapeRegex(tagPrefix)}(?:\\/[\\w-]+)*`, 'g'), '')
    .replace(/✅\s*\d{4}-\d{2}-\d{2}/g, '')
    .replace(/📅\s*\d{4}-\d{2}-\d{2}/g, '')
    .replace(/[⏫🔺🔼🔽]/g, '')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function displayNameFromSlug(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function scanVaultTodos(app: App, settings: TodoSettings): Promise<ScanResult> {
  const scans: ScanResult[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    scans.push(await scanSingleFile(app, settings, file));
  }
  return combineScanResults(scans);
}

export async function scanSingleFile(app: App, settings: TodoSettings, file: TFile): Promise<ScanResult> {
  const tagPrefix = settings.tagPrefix || '#todo';
  const content = await app.vault.cachedRead(file);
  const lines = content.split(/\r?\n/);

  const groupsByKey = new Map<string, CategoryGroup>();
  const categoriesByKey = new Map<string, Category>();
  const tasks: Task[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(tagPrefix)) continue;

    const hasCheckbox = CHECKBOX_RE.test(trimmed);
    const isPlainListItem = /^[-*+]\s+#/.test(trimmed);
    if (!hasCheckbox && !isPlainListItem) continue;

    const tag = extractTag(trimmed, tagPrefix);
    if (!tag) continue;

    const title = parseTaskTitle(trimmed, tagPrefix);
    if (!title) continue;

    const parts = parseTagParts(tag, tagPrefix);
    const groupKey = parts[0]?.toLowerCase();
    const categoryKey = parts[1]?.toLowerCase();

    let groupId: string | undefined;
    if (groupKey) {
      let group = groupsByKey.get(groupKey);
      if (!group) {
        group = {
          id: makeId(),
          name: displayNameFromSlug(parts[0]),
          sortOrder: groupsByKey.size,
          collapsed: settings.archivedGroups.includes(groupKey),
          archived: settings.archivedGroups.includes(groupKey),
          sourceGroupKey: groupKey
        };
        groupsByKey.set(groupKey, group);
      }
      groupId = group.id;
    }

    let categoryId: string | undefined;
    if (groupKey && categoryKey) {
      const catMapKey = `${groupKey}/${categoryKey}`;
      let category = categoriesByKey.get(catMapKey);
      if (!category) {
        const groupLocalCategoryCount = [...categoriesByKey.values()].filter((c) => c.sourceGroupKey === groupKey).length;
        category = {
          id: makeId(),
          name: displayNameFromSlug(parts[1]),
          emoji: DEFAULT_EMOJI_MAP[categoryKey],
          sortOrder: groupLocalCategoryCount,
          groupId,
          sourceGroupKey: groupKey,
          sourceCategoryKey: categoryKey
        };
        categoriesByKey.set(catMapKey, category);
      }
      categoryId = category.id;
    }

    const completion = parseCompleted(trimmed);
    const createdAt = file.stat?.ctime ? new Date(file.stat.ctime).toISOString() : new Date().toISOString();
    const updatedAt = file.stat?.mtime ? new Date(file.stat.mtime).toISOString() : createdAt;
    tasks.push({
      id: makeId(),
      title,
      priority: parsePriority(trimmed),
      completed: completion.completed,
      createdAt,
      updatedAt,
      completedAt: completion.completedAt ? `${completion.completedAt}T00:00:00.000Z` : undefined,
      sortOrder: tasks.length,
      categoryId,
      source: `obsidian:${file.path}`,
      sourceTag: tag,
      sourceFile: file.path,
      sourceLine: i + 1,
      groupTag: !categoryId && groupKey ? groupKey : undefined,
      subTag: parts.length >= 3 ? parts.slice(2).join('/') : undefined
    });
  }

  return {
    tasks,
    categories: [...categoriesByKey.values()].sort((a, b) => a.sortOrder - b.sortOrder),
    categoryGroups: [...groupsByKey.values()].sort((a, b) => a.sortOrder - b.sortOrder)
  };
}

export function combineScanResults(scans: Iterable<ScanResult>): ScanResult {
  const groupsByKey = new Map<string, CategoryGroup>();
  const categoriesByKey = new Map<string, Category>();
  const tasks: Task[] = [];

  for (const scan of scans) {
    const localGroupIdToGlobalId = new Map<string, string>();
    for (const group of [...scan.categoryGroups].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const groupKey = group.sourceGroupKey ?? group.name.toLowerCase();
      let existing = groupsByKey.get(groupKey);
      if (!existing) {
        existing = {
          ...group,
          id: group.id ?? makeId(),
          sortOrder: groupsByKey.size
        };
        groupsByKey.set(groupKey, existing);
      }
      localGroupIdToGlobalId.set(group.id, existing.id);
    }

    const localCategoryIdToGlobalId = new Map<string, string>();
    for (const category of [...scan.categories].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const categoryKey = `${category.sourceGroupKey ?? ''}/${category.sourceCategoryKey ?? category.name.toLowerCase()}`;
      let existing = categoriesByKey.get(categoryKey);
      if (!existing) {
        existing = {
          ...category,
          id: category.id ?? makeId(),
          groupId: category.groupId ? (localGroupIdToGlobalId.get(category.groupId) ?? category.groupId) : undefined,
          sortOrder: categoriesByKey.size
        };
        categoriesByKey.set(categoryKey, existing);
      }
      localCategoryIdToGlobalId.set(category.id, existing.id);
    }

    for (const task of [...scan.tasks].sort((a, b) => a.sortOrder - b.sortOrder)) {
      tasks.push({
        ...task,
        categoryId: task.categoryId ? (localCategoryIdToGlobalId.get(task.categoryId) ?? task.categoryId) : undefined,
        sortOrder: tasks.length
      });
    }
  }

  return {
    tasks,
    categories: [...categoriesByKey.values()],
    categoryGroups: [...groupsByKey.values()]
  };
}
