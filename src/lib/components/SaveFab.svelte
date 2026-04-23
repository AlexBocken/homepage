<script>
  import Check from '$lib/assets/icons/Check.svelte';
  import ActionButton from './ActionButton.svelte';

  /** @type {{ disabled?: boolean, onclick?: ((e: MouseEvent) => void) | undefined, label?: string, type?: 'submit' | 'reset' | 'button' }} */
  let { disabled = false, onclick = undefined, label = 'Save', type = 'submit' } = $props();
</script>

<ActionButton {type} {onclick} {disabled} ariaLabel={label}>
  <Check fill="white" width="2rem" height="2rem" />
</ActionButton>
