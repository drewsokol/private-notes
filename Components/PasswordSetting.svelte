<script>
  import PasswordField from './PasswordField.svelte';
  
  export let name = '';
  export let desc = '';
  export let onInput;
  export let value = '';
  export let warning = '';
  export let id = '';
</script>

<style>
  .setting-item-warning {
    color: red;
  }
</style>

<div class="setting-item">
  <div class="setting-item-info">
    <label for={id} class="setting-item-name">{name}</label>
    <div class="setting-item-description">{desc}</div>
    <div class="setting-item-description setting-item-warning">{warning}</div>
  </div>
  <div class="setting-item-control">
    <PasswordField {id} {onInput} {value} />
  </div>
</div>