import { type MarkdownPostProcessorContext, Plugin, PluginSettingTab, Setting, TFile, App} from 'obsidian';
import PrivateNote from './Components/PrivateNote.svelte';
import PasswordSetting from './Components/PasswordSetting.svelte';
import { v4 as uuidv4 } from 'uuid';

interface PrivateNoteBlock {
  uuid: string;
  content: string;
}

interface PrivateNotesPluginSettings {
  masterPassword: string;
}

class PrivateNotesPlugin extends Plugin {
  settings!: PrivateNotesPluginSettings;
  private isAddingUuid: boolean = false;
  private uuidLockWaitTime: number = 5000;

  private extractBlocks<T extends { content: string }>(
    content: string,
    regex: RegExp
  ): T[] {
    const blocks: T[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const extractedContent = match[1].trim();
      blocks.push({ content: extractedContent } as T);
    }

    return blocks;
  };

  private async addUniqueIdentifierIfNotExist(file: TFile) {
    this.isAddingUuid = true; //lock

    const currentFileContent = await this.app.vault.read(file);
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const frontmatterMatch = frontmatterRegex.exec(currentFileContent);
    let frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
    const uuidRegex = /^uuid: (.*)$/im;
    let uuidMatch: RegExpExecArray | null = uuidRegex.exec(frontmatter);
    let uuid: string | null = uuidMatch ? uuidMatch[1] : null;

    if (!uuidMatch){
      console.log("No uuid found, making one");
      uuid = uuidv4();
      frontmatter = frontmatter ? `${frontmatter}\nuuid: ${uuid}` : `uuid: ${uuid}`;
      const updatedContent = `---\n${frontmatter}\n---\n${currentFileContent.replace(/^---\n[\s\S]*?\n---\n/, '')}`;
      await this.app.vault.modify(file, updatedContent);
    }

    this.isAddingUuid = false; //unlock
    return uuid as string;
  }

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new PrivateNotesPluginSettingTab(this.app, this));

    this.registerMarkdownCodeBlockProcessor(
      'privateNote',
      async (source: string, el: HTMLElement, _: MarkdownPostProcessorContext) => 
        { 
          let currentUniqueIdentifier = '';

          const currentFile = this.app.workspace.getActiveFile();
          if (currentFile) {
            const startTime = Date.now();
            while (this.isAddingUuid){
              if (Date.now() - startTime > 5000){
                console.error('Timeout waiting for UUID lock');
                return;
              }
              await new Promise(resolve => setTimeout(resolve, 100));  // wait for 100 ms to try again
            };

            currentUniqueIdentifier = await this.addUniqueIdentifierIfNotExist(currentFile);
          }

          console.log('UUID: ', currentUniqueIdentifier);

          new PrivateNote({
            target: el,
            props: {
              content: 'I replaced a private note, dude!!'
            }
          });
        }
    );
  }
  
  async loadSettings() {
    this.settings = Object.assign({}, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class PrivateNotesPluginSettingTab extends PluginSettingTab {
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

module.exports = PrivateNotesPlugin;