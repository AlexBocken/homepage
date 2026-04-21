<script>
  import Check from '$lib/assets/icons/Check.svelte';
  import ActionButton from './ActionButton.svelte';

  let { disabled = false, onclick, label = 'Save', type = 'submit' } = $props();
</script>

<ActionButton {type} {onclick} {disabled} ariaLabel={label}>
  <Check fill="white" width="2rem" height="2rem" />
</ActionButton>
