<script>
	import { initializeEncryptionKey, encryptString, decryptString } from '../Utils/utils.js';
	import { onMount } from "svelte";

  let visible = false;

  function toggleVisibility() {
    visible = !visible;
  }

  export let onInput;
  export let value = '';
  export let id = '';

  let keyMaterial;
  let decryptedValue;

  async function handleInput(event) {
    const encryptedValue = await encryptString(event.target.value);
    onInput({ target: { value: encryptedValue } });
  }

  onMount(async () => {
    if(value){
      value = await decryptString(value);
    }
  });
</script>

<div>
  {#if visible}
    <input type="text" id={id} bind:value={value} on:input="{handleInput}" />
  {:else}
    <input type="password" id={id} bind:value={value} on:input="{handleInput}" />
  {/if}
  <button on:click="{toggleVisibility}">{visible ? 'Hide' : 'Show'}</button>
</div>