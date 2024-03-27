import { type MarkdownPostProcessorContext, Plugin, PluginSettingTab, Setting, TFile, App} from 'obsidian';
import PrivateNote from './Components/PrivateNote.svelte';
import { PrivateNotesPluginSettingTab } from 'settings/PrivateNotesPluginSettingTab';
import { v4 as uuidv4 } from 'uuid';
import type { PrivateNotesPluginSettings } from 'settings/PrivateNotesPluginSettings';

interface PrivateNoteBlock {
  uuid: string;
  content: string;
}

export default class PrivateNotesPlugin extends Plugin {
  settings!: PrivateNotesPluginSettings;
  private isAddingUuid: boolean = false;
  private uuidLockWaitTime: number = 5000;

  private async addUniqueIdentifierIfNotExist(file: TFile) {
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

    return uuid as string;
  };

  private async aquireUuidLock() {
    const startTime = Date.now();
    while (this.isAddingUuid){
      if (Date.now() - startTime > this.uuidLockWaitTime){
        console.error('Timeout waiting for UUID lock');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));  // wait for 100 ms to try again
    };

    this.isAddingUuid = true;
  };

  private releaseUuidLock() {
    this.isAddingUuid = false;
  }

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new PrivateNotesPluginSettingTab(this.app, this));

    this.registerMarkdownCodeBlockProcessor(
      'privateNote',
      async (source: string, el: HTMLElement, _: MarkdownPostProcessorContext) => 
        { 
          const currentFile = this.app.workspace.getActiveFile();

          //check for uuid on parent note file. If it doesn't exist, add it.
          if (currentFile) {
            await this.aquireUuidLock();
            await this.addUniqueIdentifierIfNotExist(currentFile);
            this.releaseUuidLock();
          }

          //check for uuid in the block. If it doesn't exist, add it.
          const uuidRegex = /uuid: (.*)/i;
          const uuidMatch = uuidRegex.exec(source);
          let uuid: string | null = uuidMatch ? uuidMatch[1] : null;

          if (!uuid){
            uuid = uuidv4();
            let newSource = `uuid: ${uuid}\n${source}`; //create a new source including the uuid

            if (currentFile){
              await this.aquireUuidLock();
              const currentFileContent = await this.app.vault.read(currentFile);
              const blockRegex = new RegExp(`\\\`{3}privateNote\\n${source}\\\`{3}`, 's');
              const updatedContent = currentFileContent.replace(blockRegex, "```privateNote\n" + newSource + "```");
              await this.app.vault.modify(currentFile, updatedContent);
              this.releaseUuidLock();
            }
          }

          console.log('source', source);

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