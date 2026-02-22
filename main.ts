import { Plugin, WorkspaceLeaf } from 'obsidian';
import { TodoView, VIEW_TYPE_TODO } from './TodoView';
import { DEFAULT_SETTINGS, TodoSettingTab, type TodoSettings } from './settings';
import { initializeTodoState, refreshVaultState } from './state.svelte.ts';

export default class ADHDTodoPlugin extends Plugin {
  settings: TodoSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_TODO, (leaf: WorkspaceLeaf) => new TodoView(leaf, this));

    this.addRibbonIcon('check-square', 'ADHD Todo', () => {
      void this.activateView();
    });

    this.addCommand({
      id: 'open-adhd-todo',
      name: 'Open ADHD Todo',
      callback: () => {
        void this.activateView();
      }
    });

    this.addCommand({
      id: 'rescan-adhd-todo-vault',
      name: 'Rescan ADHD Todo tasks',
      callback: () => {
        void this.refreshTodoState();
      }
    });

    this.addSettingTab(new TodoSettingTab(this.app, this));

    initializeTodoState(this);
    await this.refreshTodoState();
  }

  async onunload() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_TODO)) {
      leaf.detach();
    }
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_TODO)[0];

    if (!leaf) {
      leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE_TODO, active: true });
    }

    workspace.revealLeaf(leaf);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async refreshTodoState() {
    await refreshVaultState();
  }
}
