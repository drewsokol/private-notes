import { type MarkdownPostProcessorContext, Plugin, PluginSettingTab, Setting, TFile, App, MarkdownView, Vault, normalizePath} from 'obsidian';
import PrivateNote from './Components/PrivateNote.svelte';
import { PrivateNotesPluginSettingTab } from 'settings/PrivateNotesPluginSettingTab';
import { v4 as uuidv4 } from 'uuid';
import type { PrivateNotesPluginSettings } from 'settings/PrivateNotesPluginSettings';
import { normalize } from 'path';

interface PrivateNoteBlock {
  uuid: string;
  content: string;
}

export default class PrivateNotesPlugin extends Plugin {
  settings!: PrivateNotesPluginSettings;
  private isAddingUuid: boolean = false;
  private uuidLockWaitTime: number = 5000;
  private privateNotes: PrivateNote[] = [];

  private async addUniqueIdentifierToFileIfNotExist(file: TFile) {
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

  private async addUniqueIdentifierToBlockIfNotExist(source: string, currentFile: TFile | null) {
    const uuid = uuidv4();
    let newSource = `uuid: ${uuid}\n${source}`; //create a new source including the uuid

    if (currentFile){
      const currentFileContent = await this.app.vault.read(currentFile);
      const blockRegex = new RegExp(`\\\`{3}privateNote\\n${source}\\\`{3}`, 's');
      const updatedContent = currentFileContent.replace(blockRegex, "```privateNote\n" + newSource + "```");
      await this.app.vault.modify(currentFile, updatedContent);
    }

    return uuid;
  }

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

  private async updateNoteContent(fileId: string | null, noteId: string, content: string) {
    if(!fileId) {
      console.error('No file id to update note content');  
      return;
    }

    const filePath = `.obsidian/plugins/private-notes/pn.json`;
    if (await this.app.vault.adapter.exists(filePath)) {
      await this.app.vault.adapter.process(
        normalizePath(filePath), 
        (currentContent: string) => {
          let pnData = JSON.parse(currentContent);
          if (!pnData[fileId]) {
            pnData[fileId] = {};
            pnData[fileId][noteId] = content;
            content = JSON.stringify(pnData);
          }
          return content;
        });
    }
  }

  private async retrieveNoteContent(fileId: string | null, noteId: string) {
    if(!fileId) {
      console.error('No file id to retrieve note content');  
      return '';
    }

    const filePath = `.obsidian/plugins/private-notes/pn.json`;
    if (await this.app.vault.adapter.exists(filePath)) {
      const pnContent = await this.app.vault.adapter.read(normalizePath(filePath));
      let pnData = JSON.parse(pnContent);
      if (pnData[fileId] && pnData[fileId][noteId]) {
        console.log(pnData[fileId][noteId]);
        return pnData[fileId][noteId];
      }else{
        return '';
      }
    }

    return '';
  }

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new PrivateNotesPluginSettingTab(this.app, this));

    // Create the private notes storage if it doesn't exist
    const filePath = '.obsidian/plugins/private-notes/pn.json';
    let fileAlreadyExists = await this.app.vault.adapter.exists(normalizePath(filePath));
    if (!fileAlreadyExists) {
      await this.app.vault.adapter.write(filePath, '{}');
    }

    // Monitor the active mode of the current view, and update the private notes accordingly
    this.app.workspace.on('active-leaf-change', (leaf) => {
      if(leaf){
        const view = leaf.view;
        if (view instanceof MarkdownView) {
          const readingMode = view.getMode() === 'preview';
          this.privateNotes.forEach(note => {
            note.$set({readingMode});
          });
        }
      }
    });

    // Monitor the active file, and replace all private note blocks with the component
    this.registerMarkdownCodeBlockProcessor(
      'privateNote',
      async (source: string, el: HTMLElement, _: MarkdownPostProcessorContext) => 
        {
          const currentFile = this.app.workspace.getActiveFile();

          //check for uuid on parent note file. If it doesn't exist, add it.
          var noteIdentifier: string | null = null;
          if (currentFile) {
            await this.aquireUuidLock();
            noteIdentifier = await this.addUniqueIdentifierToFileIfNotExist(currentFile);
            this.releaseUuidLock();
          }

          //check for uuid in the block. If it doesn't exist, add it.
          const uuidRegex = /uuid: (.*)/i;
          const uuidMatch = uuidRegex.exec(source);
          let uuid: string | null = uuidMatch ? uuidMatch[1] : null;
          if (!uuid){
            await this.aquireUuidLock();
            uuid = await this.addUniqueIdentifierToBlockIfNotExist(source, currentFile);
            this.releaseUuidLock();
          }

          //get mode of current view
          let activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
          let mode = activeView ? activeView.getMode() : null;
          let content = await this.retrieveNoteContent(noteIdentifier, uuid!);

          const noteComponent = new PrivateNote({
            target: el,
            props: {
              content: await this.retrieveNoteContent(noteIdentifier, uuid!),
              readingMode: mode === 'preview',
              settings: this.settings,
              onInput: async (event: { target: { value: string; }; }) => {
                await this.updateNoteContent(noteIdentifier, uuid!, event.target.value);
              },
            }
          });

          //store a reference to the private note
          this.privateNotes.push(noteComponent);
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