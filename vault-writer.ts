import type { App, TFile } from 'obsidian';
import type { TodoSettings } from './settings';
import type { Category, Task } from './types';

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function splitLines(content: string) {
  return content.split(/\r?\n/);
}

function joinLines(lines: string[]) {
  return lines.join('\n');
}

function normalizeCheckPrefix(line: string, checked: boolean): string {
  if (/^\s*[-*+]\s*\[[ xX-]\]/.test(line)) {
    return line.replace(/^(\s*[-*+]\s*)\[[ xX-]\]/, `$1[${checked ? 'x' : ' '}]`);
  }
  if (/^\s*[-*+]\s+/.test(line)) {
    return line.replace(/^(\s*[-*+]\s+)/, `$1[${checked ? 'x' : ' '}] `);
  }
  return `- [${checked ? 'x' : ' '}] ${line}`;
}

function addCompletionDate(line: string): string {
  const withoutOld = line.replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/g, '');
  return `${withoutOld} ✅ ${todayDate()}`;
}

function removeCompletionDate(line: string): string {
  return line.replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/g, '');
}

function ensureMdExtension(path: string) {
  return path.endsWith('.md') ? path : `${path}.md`;
}

function buildTagForCategory(categoryId: string | undefined, categories: Category[], tagPrefix: string): string {
  if (!categoryId) return tagPrefix;
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return tagPrefix;
  const group = category.sourceGroupKey;
  const cat = category.sourceCategoryKey;
  if (group && cat) return `${tagPrefix}/${group}/${cat}`;
  if (group) return `${tagPrefix}/${group}`;
  return tagPrefix;
}

async function getFileOrCreate(app: App, path: string): Promise<TFile> {
  const normalized = ensureMdExtension(path);
  const existing = app.vault.getFileByPath(normalized);
  if (existing) return existing;

  const parts = normalized.split('/');
  if (parts.length > 1) {
    const folders = parts.slice(0, -1);
    let current = '';
    for (const folder of folders) {
      current = current ? `${current}/${folder}` : folder;
      if (!app.vault.getAbstractFileByPath(current)) {
        await app.vault.createFolder(current);
      }
    }
  }

  return app.vault.create(normalized, '');
}

export class VaultTodoWriter {
  constructor(
    private app: App,
    private settings: TodoSettings,
    private getCategories: () => Category[]
  ) {}

  async toggleComplete(task: Task, completed: boolean) {
    return this.updateLine(task, (line) => {
      let next = normalizeCheckPrefix(line, completed);
      next = completed ? addCompletionDate(next) : removeCompletionDate(next);
      return next;
    });
  }

  async deleteTask(task: Task) {
    return this.updateFile(task.sourceFile, task.sourceLine, (lines, idx) => {
      lines.splice(idx, 1);
      return lines;
    });
  }

  async editTaskTitle(task: Task, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return false;
    return this.updateLine(task, (line) => {
      const tagMatch = line.match(/#todo(?:\/[\w-]+)*/);
      const tag = tagMatch?.[0] ?? this.settings.tagPrefix;
      const checked = /^\s*[-*+]\s*\[[xX-]\]/.test(line);
      const base = `- [${checked ? 'x' : ' '}] ${tag} ${trimmed}`;
      const completion = line.match(/✅\s*\d{4}-\d{2}-\d{2}/)?.[0];
      return completion && checked ? `${base} ${completion}` : base;
    });
  }

  async addTask(input: { title: string; categoryId?: string; priority?: string }) {
    const title = input.title.trim();
    if (!title) return false;

    const file = await getFileOrCreate(this.app, this.settings.inboxFile);
    const content = await this.app.vault.cachedRead(file);
    const lines = splitLines(content);
    const tag = buildTagForCategory(input.categoryId, this.getCategories(), this.settings.tagPrefix);
    const priorityMarker = input.priority === 'high' ? ' 🔼' : input.priority === 'low' ? ' 🔽' : '';
    const line = `- [ ] ${tag} ${title}${priorityMarker}`.trim();
    lines.push(line);
    await this.app.vault.modify(file, joinLines(lines.filter((_, i) => !(lines.length === 1 && lines[0] === ''))));
    return true;
  }

  private async updateLine(task: Task, transform: (line: string) => string) {
    if (!task.sourceFile || !task.sourceLine) return false;
    return this.updateFile(task.sourceFile, task.sourceLine, (lines, idx) => {
      lines[idx] = transform(lines[idx] ?? '');
      return lines;
    });
  }

  private async updateFile(
    path: string | undefined,
    lineNo: number | undefined,
    mutate: (lines: string[], index: number) => string[]
  ) {
    if (!path || !lineNo) return false;
    const file = this.app.vault.getFileByPath(path);
    if (!file) return false;

    const content = await this.app.vault.cachedRead(file);
    const lines = splitLines(content);
    const idx = lineNo - 1;
    if (idx < 0 || idx >= lines.length) return false;

    const next = mutate(lines, idx);
    await this.app.vault.modify(file, joinLines(next));
    return true;
  }
}
