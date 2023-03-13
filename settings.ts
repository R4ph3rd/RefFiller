import RefFiller from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";

export class RefFillerSettingTab extends PluginSettingTab {
  plugin: RefFiller;

  constructor(app: App, plugin: RefFiller) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Template path")
      .setDesc("Template file path")
      .addText((text) =>
        text
          .setPlaceholder("template Path Placeholder")
          .setValue('')
          .onChange(async (value) => {
            this.plugin.settings.templatePath = value;
            await this.plugin.saveSettings();
          })
      );
  }
}