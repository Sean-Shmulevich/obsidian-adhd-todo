import type { App } from 'obsidian';
import type { TodoSettings } from './settings';
import type { Category, CategoryGroup, Priority, Recurrence, ScanResult, Task } from './types';

const CHECKBOX_RE = /^\s*[-*+]\s*\[(.)\]\s*/;
const LIST_ITEM_RE = /^\s*[-*+]\s+/;
const DATE_RE = /\b(\d{4}-\d{2}-\d{2})\b/;

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

function parseRecurrence(line: string): Recurrence | undefined {
  const match = line.match(/🔁\s*every\s+(\d+\s+)?(\w+)/i);
  if (!match) return undefined;
  const interval = Math.max(1, Number.parseInt(match[1]?.trim() ?? '1', 10) || 1);
  const unit = match[2].toLowerCase();
  if (['day', 'days', 'daily'].includes(unit)) return { type: 'daily', interval };
  if (['week', 'weeks', 'weekly'].includes(unit)) return { type: 'weekly', interval };
  if (['month', 'months', 'monthly'].includes(unit)) return { type: 'monthly', interval };
  return undefined;
}

function parseDueDate(line: string): string | undefined {
  const idx = line.indexOf('📅');
  if (idx < 0) return undefined;
  const tail = line.slice(idx);
  return tail.match(DATE_RE)?.[1];
}

function parseTaskTitle(line: string, tagPrefix: string): string {
  return line
    .replace(CHECKBOX_RE, '')
    .replace(LIST_ITEM_RE, '')
    .replace(new RegExp(`${escapeRegex(tagPrefix)}(?:\\/[\\w-]+)*`, 'g'), '')
    .replace(/✅\s*\d{4}-\d{2}-\d{2}/g, '')
    .replace(/📅\s*\d{4}-\d{2}-\d{2}/g, '')
    .replace(/🔁\s*every\s+(\d+\s+)?\w+/gi, '')
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
  const files = app.vault.getMarkdownFiles();
  const tagPrefix = settings.tagPrefix || '#todo';

  const groupsByKey = new Map<string, CategoryGroup>();
  const categoriesByKey = new Map<string, Category>();
  const tasks: Task[] = [];

  let taskSort = 0;

  for (const file of files) {
    const content = await app.vault.cachedRead(file);
    const lines = content.split(/\r?\n/);

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
          category = {
            id: makeId(),
            name: displayNameFromSlug(parts[1]),
            emoji: DEFAULT_EMOJI_MAP[categoryKey],
            sortOrder: [...categoriesByKey.values()].filter((c) => c.sourceGroupKey === groupKey).length,
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

      const task: Task = {
        id: makeId(),
        title,
        priority: parsePriority(trimmed),
        completed: completion.completed,
        createdAt,
        updatedAt,
        completedAt: completion.completedAt ? `${completion.completedAt}T00:00:00.000Z` : undefined,
        sortOrder: taskSort++,
        categoryId,
        recurrence: parseRecurrence(trimmed),
        nextDueAt: parseDueDate(trimmed) ? `${parseDueDate(trimmed)}T00:00:00.000Z` : undefined,
        source: `obsidian:${file.path}`,
        sourceTag: tag,
        sourceFile: file.path,
        sourceLine: i + 1,
        groupTag: !categoryId && groupKey ? groupKey : undefined,
        subTag: parts.length >= 3 ? parts.slice(2).join('/') : undefined
      };

      tasks.push(task);
    }
  }

  const categoryGroups = [...groupsByKey.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  const categories = [...categoriesByKey.values()].sort((a, b) => a.sortOrder - b.sortOrder);

  return { tasks, categories, categoryGroups };
}
