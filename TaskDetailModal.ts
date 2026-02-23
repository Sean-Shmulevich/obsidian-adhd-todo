import { Modal, type App } from 'obsidian';
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

    const title = contentEl.createEl('p', { text: this.task.title });
    title.style.whiteSpace = 'pre-wrap';
    title.style.wordBreak = 'break-word';
    title.style.fontSize = '1.1rem';
    title.style.lineHeight = '1.5';
    title.style.margin = '0';
  }

  onClose() {
    this.contentEl.empty();
  }
}
