import { Plugin, WorkspaceLeaf } from 'obsidian';
import { TodoView, VIEW_TYPE_TODO } from './TodoView';
import { DEFAULT_SETTINGS, TodoSettingTab, type TodoSettings } from './settings';
import { initializeTodoState, refreshVaultState } from './state.svelte.ts';

// taskKey → sortOrder number. Keys are "sourceFile:sourceLine" to survive re-scans.
export type SortOrderMap = Record<string, number>;

export interface PluginData {
  settings: TodoSettings;
  customSortOrders: SortOrderMap;
}

export default class TodoPlugin extends Plugin {
  settings: TodoSettings = DEFAULT_SETTINGS;
  customSortOrders: SortOrderMap = {};

  async onload() {
    await this.loadPluginData();

    this.registerView(VIEW_TYPE_TODO, (leaf: WorkspaceLeaf) => new TodoView(leaf, this));

    this.addRibbonIcon('check-square', 'Todo Planner', () => {
      void this.activateView();
    });

    this.addCommand({
      id: 'open-tasks-dashboard',
      name: 'Open Todo Planner',
      callback: () => {
        void this.activateView();
      }
    });

    this.addCommand({
      id: 'rescan-tasks-dashboard-vault',
      name: 'Rescan Todo Planner tasks',
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
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE_TODO, active: true });
    }

    workspace.revealLeaf(leaf);
  }

  async loadPluginData() {
    const data = (await this.loadData()) as Partial<PluginData> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings ?? data ?? {});
    this.customSortOrders = data?.customSortOrders ?? {};
  }

  async savePluginData() {
    await this.saveData({ settings: this.settings, customSortOrders: this.customSortOrders } satisfies PluginData);
  }

  async saveSettings() {
    await this.savePluginData();
  }

  async saveSortOrders() {
    await this.savePluginData();
  }

  async refreshTodoState() {
    await refreshVaultState();
  }
}
