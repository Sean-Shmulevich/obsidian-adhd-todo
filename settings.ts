import { App, PluginSettingTab, Setting } from 'obsidian';
import type ADHDTodoPlugin from './main';

export interface TodoSettings {
  tagPrefix: string;
  inboxFile: string;
  archivedGroups: string[];
  showCompleted: boolean;
  focusDuration: number;
  breakDuration: number;
}

export const DEFAULT_SETTINGS: TodoSettings = {
  tagPrefix: '#todo',
  inboxFile: 'Todo Inbox.md',
  archivedGroups: [],
  showCompleted: true,
  focusDuration: 25,
  breakDuration: 5
};

export class TodoSettingTab extends PluginSettingTab {
  plugin: ADHDTodoPlugin;

  constructor(app: App, plugin: ADHDTodoPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'ADHD Todo Settings' });

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

    new Setting(containerEl)
      .setName('Focus duration (minutes)')
      .addSlider((slider) =>
        slider
          .setLimits(5, 90, 1)
          .setValue(this.plugin.settings.focusDuration)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.focusDuration = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Break duration (minutes)')
      .addSlider((slider) =>
        slider
          .setLimits(1, 30, 1)
          .setValue(this.plugin.settings.breakDuration)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.breakDuration = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
