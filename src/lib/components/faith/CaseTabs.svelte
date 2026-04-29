<script lang="ts">
	import { resolve } from '$app/paths';
	import Shield from '@lucide/svelte/icons/shield';
	import Flame from '@lucide/svelte/icons/flame';

	type Props = {
		faithLang: string;
		active: 'contra' | 'pro';
		labels?: { contra: string; pro: string };
	};

	let { faithLang, active, labels }: Props = $props();

	const l = $derived(labels ?? { contra: 'Contra', pro: 'Pro' });
	const slug = $derived(faithLang === 'faith' ? 'apologetics' : 'apologetik');
</script>

<nav class="case-tabs" aria-label="Argument case">
	<a
		class="case-tab"
		class:active={active === 'contra'}
		href={resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]/contra', { faithLang, apologetikSlug: slug })}
	>
		<Shield class="ct-glyph" size={14} strokeWidth={2} aria-hidden="true" />
		<span>{l.contra}</span>
	</a>
	<a
		class="case-tab"
		class:active={active === 'pro'}
		href={resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]/pro', { faithLang, apologetikSlug: slug })}
	>
		<Flame class="ct-glyph" size={14} strokeWidth={2} aria-hidden="true" />
		<span>{l.pro}</span>
	</a>
</nav>

<style>
	.case-tabs {
		display: flex;
		gap: 4px;
		max-width: 760px;
		margin: 28px auto 0;
		padding: 4px;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		width: fit-content;
	}
	.case-tab {
		padding: 8px 22px;
		border-radius: var(--radius-pill);
		background: transparent;
		border: 0;
		font-size: 0.92rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-family: var(--font-sans);
		display: inline-flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		transition:
			background var(--transition-normal),
			color var(--transition-normal),
			transform var(--transition-fast);
	}
	.case-tab:hover {
		color: var(--color-text-primary);
	}
	.case-tab.active {
		background: var(--color-text-primary);
		color: var(--color-bg-primary);
	}
	.case-tab:active,
	.case-tab:focus-visible {
		transform: scale(0.97);
		outline: none;
	}
	:global(.ct-glyph) {
		opacity: 0.9;
		flex: none;
	}

	@media (max-width: 640px) {
		.case-tabs {
			width: calc(100% - 48px);
			max-width: none;
			margin-left: 24px;
			margin-right: 24px;
		}
		.case-tab {
			flex: 1;
			padding: 8px 12px;
			font-size: 0.85rem;
			justify-content: center;
		}
	}
</style>
