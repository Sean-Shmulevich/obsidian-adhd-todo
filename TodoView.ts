import { ItemView, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import App from './components/App.svelte';
import type TodoPlugin from './main';

export const VIEW_TYPE_TODO = 'tasks-dashboard-view';

export class TodoView extends ItemView {
  plugin: TodoPlugin;
  component: object | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: TodoPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_TODO;
  }

  getDisplayText() {
    return 'Tasks Dashboard';
  }

  getIcon() {
    return 'check-square';
  }

  async onOpen() {
    this.contentEl.empty();
    this.contentEl.addClass('tasks-dashboard-root');
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
    this.contentEl.removeClass('tasks-dashboard-root');
  }
}
