import { App, PluginSettingTab } from "obsidian";
import { v4 as uuidv4 } from 'uuid';
import PasswordSetting from '../Components/PasswordSetting.svelte';
import type PrivateNotesPlugin from '../main.ts'; // Add curly braces around PrivateNotesPlugin

export class PrivateNotesPluginSettingTab extends PluginSettingTab {
  plugin: PrivateNotesPlugin;

  constructor(app: App, plugin: PrivateNotesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let {containerEl} = this;

    containerEl.empty();

      const id = uuidv4();
      new PasswordSetting({
        target: containerEl,
        props: {
          name: 'Master password',
          desc: `Enter a master password used to encrypt or decrypt your notes.
            The password must be the same as the one used to encrypt the note
            or it will not be viewable.`,
          warning: `Do not use real passwords. This is not super secure. For most, it'll
            stop a standard user from reading the private notes. Tech savy individuals
            can break this.`,
          onInput: async (event: { target: { value: string; }; }) => {
            this.plugin.settings.masterPassword = event.target.value;
            await this.plugin.saveSettings();
          },
          value: this.plugin.settings.masterPassword,
          id: id
        }
      });
  }
}