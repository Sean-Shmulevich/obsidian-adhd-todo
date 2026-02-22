import { ItemView, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import App from './components/App.svelte';
import type ADHDTodoPlugin from './main';

export const VIEW_TYPE_TODO = 'adhd-todo-view';

export class TodoView extends ItemView {
  plugin: ADHDTodoPlugin;
  component: object | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: ADHDTodoPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_TODO;
  }

  getDisplayText() {
    return 'ADHD Todo';
  }

  getIcon() {
    return 'check-square';
  }

  async onOpen() {
    this.contentEl.empty();
    this.contentEl.addClass('adhd-todo-root');
    this.component = mount(App, {
      target: this.contentEl,
      props: { plugin: this.plugin }
    });
  }

  async onClose() {
    if (this.component) {
      unmount(this.component);
      this.component = null;
    }
    this.contentEl.removeClass('adhd-todo-root');
  }
}
