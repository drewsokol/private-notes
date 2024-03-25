<script lang="ts">
  export let content: string;

  function handleInput(){

  }

  // Add your fetch, decrypt, encrypt, and save functions here
</script>

<div contenteditable="true" bind:textContent={content} on:input={handleInput}></div>