import { type MarkdownPostProcessorContext, Plugin, Component} from 'obsidian';
import PrivateNote from './PrivateNote.svelte';

interface PrivateNoteBlock {
  uuid: string;
  content: string;
}

class PrivateNotesPlugin extends Plugin {
  private canvasMap: Record<string, string> = {};

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
  }

onload() {
  this.registerMarkdownCodeBlockProcessor(
    'privateNote',
    async (source: string, el: HTMLElement, _: MarkdownPostProcessorContext) => 
      {
        console.log("source for this", source);
        new PrivateNote({
          target: el,
          props: {
            content: 'I replaced a private note, dude!!'
          }
        });
      }
    );
  }
}

module.exports = PrivateNotesPlugin;