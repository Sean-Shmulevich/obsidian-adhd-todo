import { App, PluginSettingTab, Setting } from 'obsidian';
import type TodoPlugin from './main';

export interface TodoSettings {
  tagPrefix: string;
  inboxFile: string;
  archivedGroups: string[];
  showCompleted: boolean;
  sidebarGroupSpacing: number;
  sidebarCategoryGap: number;
}

export const DEFAULT_SETTINGS: TodoSettings = {
  tagPrefix: '#todo',
  inboxFile: 'Todo Inbox.md',
  archivedGroups: [],
  showCompleted: true,
  sidebarGroupSpacing: 0,
  sidebarCategoryGap: 0
};

export class TodoSettingTab extends PluginSettingTab {
  plugin: TodoPlugin;

  constructor(app: App, plugin: TodoPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Tasks Dashboard Settings' });

    new Setting(containerEl)
      .setName('Tag prefix')
      .setDesc('Tag used to discover tasks in your vault')
      .addText((text) =>
        text
          .setPlaceholder('#todo')
          .setValue(this.plugin.settings.tagPrefix)
          .onChange(async (value) => {
            this.plugin.settings.tagPrefix = value.trim() || '#todo';
            await this.plugin.saveSettings();
            await this.plugin.refreshTodoState();
          })
      );

    new Setting(containerEl)
      .setName('Inbox file')
      .setDesc('File used by Quick Capture for new tasks')
      .addText((text) =>
        text
          .setPlaceholder('Todo Inbox.md')
          .setValue(this.plugin.settings.inboxFile)
          .onChange(async (value) => {
            this.plugin.settings.inboxFile = value.trim() || DEFAULT_SETTINGS.inboxFile;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Show completed')
      .setDesc('Show completed tasks in the task board')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showCompleted).onChange(async (value) => {
          this.plugin.settings.showCompleted = value;
          await this.plugin.saveSettings();
        })
      );

    containerEl.createEl('h3', { text: 'Sidebar Spacing' });

    new Setting(containerEl)
      .setName('Group spacing')
      .setDesc('Space between groups in the sidebar')
      .addSlider((slider) =>
        slider
          .setLimits(0, 2, 0.05)
          .setValue(this.plugin.settings.sidebarGroupSpacing)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.sidebarGroupSpacing = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Category gap')
      .setDesc('Space between category items')
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.02)
          .setValue(this.plugin.settings.sidebarCategoryGap)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.sidebarCategoryGap = value;
            await this.plugin.saveSettings();
          })
      );

  }
}
