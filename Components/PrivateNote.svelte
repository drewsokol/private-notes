<script lang="ts">
  function handleInput(){

  }

  // Add your fetch, decrypt, encrypt, and save functions here

  export let content: string;
</script>

<div contenteditable="true" bind:textContent={content} on:input={handleInput}></div>