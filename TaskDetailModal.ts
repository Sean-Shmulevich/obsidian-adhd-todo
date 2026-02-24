import { Modal, type App } from 'obsidian';
import { toggleTaskComplete, updateTask } from './state.svelte.ts';
import type { Task } from './types';

export class TaskDetailModal extends Modal {
  private task: Task;

  constructor(app: App, task: Task) {
    super(app);
    this.task = task;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('task-detail-modal');

    const row = contentEl.createEl('label');
    row.style.display = 'flex';
    row.style.gap = '0.6rem';
    row.style.alignItems = 'flex-start';
    row.style.cursor = 'pointer';

    const checkbox = row.createEl('input', { type: 'checkbox' });
    checkbox.checked = this.task.completed;
    checkbox.style.marginTop = '0.25rem';
    checkbox.addEventListener('change', () => {
      void toggleTaskComplete(this.task.id);
      this.close();
    });

    const titleEl = row.createEl('span', { text: this.task.title });
    titleEl.style.whiteSpace = 'pre-wrap';
    titleEl.style.wordBreak = 'break-word';
    titleEl.style.fontSize = '1.1rem';
    titleEl.style.lineHeight = '1.5';
    if (this.task.completed) {
      titleEl.style.textDecoration = 'line-through';
      titleEl.style.opacity = '0.72';
    }

    const actions = contentEl.createEl('div');
    actions.style.display = 'flex';
    actions.style.gap = '0.5rem';
    actions.style.marginTop = '1rem';

    const editBtn = actions.createEl('button', { text: '✎ Edit' });
    editBtn.addEventListener('click', () => {
      this.showEditMode(contentEl);
    });

    const closeBtn = actions.createEl('button', { text: 'Close' });
    closeBtn.addEventListener('click', () => {
      this.close();
    });
  }

  private showEditMode(contentEl: HTMLElement) {
    contentEl.empty();

    const input = contentEl.createEl('textarea');
    input.value = this.task.title;
    input.style.width = '100%';
    input.style.minHeight = '6rem';
    input.style.fontSize = '1.1rem';
    input.style.lineHeight = '1.5';
    input.style.resize = 'vertical';
    input.focus();

    const actions = contentEl.createEl('div');
    actions.style.display = 'flex';
    actions.style.gap = '0.5rem';
    actions.style.marginTop = '0.75rem';

    const saveBtn = actions.createEl('button', { text: 'Save' });
    saveBtn.addEventListener('click', () => {
      const newTitle = input.value.trim();
      if (newTitle && newTitle !== this.task.title) {
        this.task = { ...this.task, title: newTitle };
        void updateTask(this.task.id, { title: newTitle });
      }
      contentEl.empty();
      this.onOpen();
    });

    const cancelBtn = actions.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => {
      contentEl.empty();
      this.onOpen();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
