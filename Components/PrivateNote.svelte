<script lang="ts">
	import { decryptString, encryptString } from "Utils/utils";
	import { onMount } from "svelte";

  export let onInput: (event: any) => void;
  export let readingMode: boolean;
  export let content: string;
  export let settings: any; // add this line
  const verificationCode = "facf5f14-ecd7-4d28-9d2c-96391c660052";

  async function handleContentChange(event: any){
    const newContent = verificationCode + event.target.textContent;
    const decryptedKey = await decryptString(settings.masterPassword);
    const encryptedContent = await encryptString(newContent, decryptedKey);
    onInput({ 
      target: { 
        value: encryptedContent,
      } 
    });
  }

  onMount(async () => {
    if(content === "") return;
    const decryptedKey = await decryptString(settings.masterPassword);
    const decryptedContent = await decryptString(content, decryptedKey);
    content = decryptedContent.replace(verificationCode, "");
    let success = verifyContent(decryptedContent);
  });

  function verifyContent(decryptedContent: string){
    return decryptedContent.startsWith(verificationCode);
  };

  // Add your fetch, decrypt, encrypt, and save functions here
</script>

<div class="private-notes-container">
  {#if readingMode}
    <div class="private-notes-content">
      {content}
    </div>
  {:else}
    <div 
      class="private-notes-content" 
      contenteditable="true"
      bind:textContent={content} 
      on:input={handleContentChange}>
    </div>
  {/if}
</div>

<style>
  .private-notes-container {
    border: 1px solid var(--accent);
    border-radius: 10px;
    padding: 1rem;
    margin: 1rem;
    box-shadow: 3px 3px 1px 1px var(--accent);
  }

  .private-notes-content {
    border: 1px solid black;
  }
</style>