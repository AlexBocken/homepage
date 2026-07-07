<script lang="ts">
	import Self from './AccountTree.svelte';
	import { money } from '$lib/utils/finance';
	import type { TreeNode } from '$lib/utils/finance';
	import { languageStore } from '$lib/stores/language.svelte';
	import { financesLang } from '$lib/js/financesI18n';

	const collapseLabel = $derived(financesLang(languageStore.value) === 'en' ? 'Collapse' : 'Einklappen');
	const expandLabel = $derived(financesLang(languageStore.value) === 'en' ? 'Expand' : 'Ausklappen');

	let {
		node,
		depth = 0,
		/** Roots deeper than this start collapsed. */
		openDepth = 1,
		/** When set, account names become links to this href (e.g. the spending
		 *  page focused on that account). */
		hrefFor = undefined
	}: {
		node: TreeNode;
		depth?: number;
		openDepth?: number;
		hrefFor?: ((account: string) => string) | undefined;
	} = $props();

	// null = follow the default (open for shallow depths); once the user clicks,
	// their choice sticks. Avoids seeding $state from reactive props.
	let userOpen = $state<boolean | null>(null);
	const open = $derived(userOpen ?? depth < openDepth);
	const hasChildren = $derived(node.children.length > 0);
</script>

<div class="row" style="--depth: {depth}">
	{#if hasChildren}
		<button
			class="twist"
			class:open
			onclick={() => (userOpen = !open)}
			aria-label={open ? collapseLabel : expandLabel}
		>▸</button>
	{:else}
		<span class="twist spacer"></span>
	{/if}
	{#if hrefFor}
		<a class="name link" class:root={depth === 0} href={hrefFor(node.account)}>{node.name}</a>
	{:else}
		<span class="name" class:root={depth === 0}>{node.name}</span>
	{/if}
	<span class="value">{money(node.value)}</span>
</div>

{#if hasChildren && open}
	{#each node.children as child (child.account)}
		<Self node={child} depth={depth + 1} {openDepth} {hrefFor} />
	{/each}
{/if}

<style>
	.row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.2rem 0;
		padding-inline-start: calc(var(--depth) * 1.2rem);
		border-bottom: 1px solid color-mix(in srgb, var(--color-border) 45%, transparent);
	}
	.twist {
		flex: 0 0 auto;
		width: 1.1em;
		background: none;
		border: none;
		color: var(--color-text-tertiary);
		cursor: pointer;
		font-size: 0.7rem;
		line-height: 1;
		padding: 0;
		transition: transform var(--transition-fast);
	}
	.twist.open {
		transform: rotate(90deg);
	}
	.twist.spacer {
		cursor: default;
	}
	.name {
		flex: 1 1 auto;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.name.root {
		color: var(--color-text-primary);
		font-weight: 600;
	}
	a.name.link {
		text-decoration: none;
	}
	a.name.link:hover {
		color: var(--color-primary);
		text-decoration: underline;
	}
	.value {
		flex: 0 0 auto;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
		font-size: var(--text-sm);
	}
</style>
