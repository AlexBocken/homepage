<!--
  Test-only host for SplitMethodSelector (passed in as `Selector`, see
  patchedSvelte.ts). Owns every bindable as real $state
  (exactly like the add / recurring-edit pages do) so the component's writes to
  splitAmounts land somewhere observable, and exposes get()/set() to the test.
-->
<script>
  /** @type {{ Selector: any, initial: { splitMethod?: string, users: string[], amount: any, paidBy: string, splitAmounts?: Record<string, number>, personalAmounts?: Record<string, number>, predefinedMode?: boolean } }} */
  let { Selector, initial } = $props();

  // svelte-ignore state_referenced_locally
  let splitMethod = $state(initial.splitMethod ?? 'equal');
  // svelte-ignore state_referenced_locally
  let users = $state(initial.users);
  // svelte-ignore state_referenced_locally
  let amount = $state(initial.amount);
  // svelte-ignore state_referenced_locally
  let paidBy = $state(initial.paidBy);
  // svelte-ignore state_referenced_locally
  let splitAmounts = $state(initial.splitAmounts ?? {});
  // svelte-ignore state_referenced_locally
  let personalAmounts = $state(initial.personalAmounts ?? {});
  // svelte-ignore state_referenced_locally
  let predefinedMode = $state(initial.predefinedMode ?? false);

  export function get() {
    return $state.snapshot({ splitMethod, users, amount, paidBy, splitAmounts, personalAmounts });
  }

  /** @param {Record<string, any>} patch */
  export function set(patch) {
    if ('splitMethod' in patch) splitMethod = patch.splitMethod;
    if ('users' in patch) users = patch.users;
    if ('amount' in patch) amount = patch.amount;
    if ('paidBy' in patch) paidBy = patch.paidBy;
    if ('splitAmounts' in patch) splitAmounts = patch.splitAmounts;
    if ('personalAmounts' in patch) personalAmounts = patch.personalAmounts;
  }
</script>

<Selector
  bind:splitMethod
  bind:users
  bind:amount
  bind:paidBy
  bind:splitAmounts
  bind:personalAmounts
  bind:predefinedMode
  currency="CHF"
  currentUser="alexander"
/>
