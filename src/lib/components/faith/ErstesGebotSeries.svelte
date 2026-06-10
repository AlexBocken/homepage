<script lang="ts">
	import { page } from '$app/state';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';

	type Props = {
		/** Which part is the current page (1, 2 or 3). */
		current: 1 | 2 | 3;
	};
	let { current }: Props = $props();

	const parts = [
		{ n: 1, label: 'Einführung', slug: 'erstes-gebot' },
		{ n: 2, label: 'Göttliche Tugenden', slug: 'goettliche-tugenden' },
		{ n: 3, label: 'Gelübde & Sünden', slug: 'geluebde-und-suenden' }
	];

	const faithLang = $derived(page.params.faithLang ?? 'glaube');
	const href = (slug: string) => `/${faithLang}/katechese/${slug}`;
	const overview = $derived(`/${faithLang}/katechese`);

	const prev = $derived(parts.find((p) => p.n === current - 1));
	const next = $derived(parts.find((p) => p.n === current + 1));
</script>

<nav class="series" aria-label="Das erste Gebot — Teile">
	<a class="series-kicker" href={overview}>
		<ArrowUp size={13} /> Die Zehn Gebote · <strong>Das erste Gebot</strong>
	</a>

	<ol class="series-steps">
		{#each parts as p (p.n)}
			<li>
				<a
					href={href(p.slug)}
					class:active={p.n === current}
					aria-current={p.n === current ? 'page' : undefined}
				>
					<span class="step-n">{p.n}</span>
					<span class="step-label">{p.label}</span>
				</a>
			</li>
		{/each}
	</ol>

	<div class="series-prevnext">
		{#if prev}
			<a class="pn prev" href={href(prev.slug)}>
				<ArrowLeft size={16} />
				<span class="pn-text"><span class="pn-dir">Zurück</span>{prev.label}</span>
			</a>
		{:else}
			<span></span>
		{/if}
		{#if next}
			<a class="pn next" href={href(next.slug)}>
				<span class="pn-text"><span class="pn-dir">Weiter</span>{next.label}</span>
				<ArrowRight size={16} />
			</a>
		{/if}
	</div>
</nav>

<style>
	.series {
		margin-top: 3rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border);
	}
	.series-kicker {
		display: inline-flex;
		align-items: center;
		gap: 0.35em;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-text-tertiary);
		text-decoration: none;
		transition: color var(--transition-fast);
	}
	.series-kicker:hover {
		color: var(--color-primary);
	}
	.series-kicker strong {
		color: var(--color-text-secondary);
		font-weight: 700;
	}

	.series-steps {
		list-style: none;
		display: flex;
		gap: 0.5rem;
		margin: 0.9rem 0 0;
		padding: 0;
		counter-reset: none;
	}
	.series-steps li {
		flex: 1;
		margin: 0;
	}
	.series-steps a {
		display: flex;
		align-items: center;
		gap: 0.55em;
		height: 100%;
		padding: 0.65em 0.8em;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		text-decoration: none;
		color: var(--color-text-secondary);
		transition: var(--transition-normal);
	}
	.series-steps a:hover {
		border-color: var(--color-primary);
		color: var(--color-text-primary);
	}
	.series-steps a.active {
		border-color: var(--color-primary);
		background: color-mix(in oklab, var(--color-primary) 12%, var(--color-surface));
		color: var(--color-text-primary);
		cursor: default;
	}
	.step-n {
		flex-shrink: 0;
		width: 1.6em;
		height: 1.6em;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 0.8rem;
		font-weight: 700;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}
	.series-steps a.active .step-n {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.step-label {
		font-size: 0.85rem;
		font-weight: 600;
		line-height: 1.2;
	}

	.series-prevnext {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 1rem;
	}
	.pn {
		display: inline-flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.55em 0.9em;
		border-radius: var(--radius-pill);
		text-decoration: none;
		color: var(--color-text-secondary);
		background: var(--color-bg-secondary);
		transition: var(--transition-normal);
	}
	.pn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.pn.next {
		margin-left: auto;
	}
	.pn-text {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.pn.next .pn-text {
		text-align: right;
	}
	.pn-dir {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-text-tertiary);
		font-weight: 700;
	}

	@media (max-width: 560px) {
		.series-steps {
			flex-direction: column;
		}
		.pn-text {
			font-size: 0.82rem;
		}
	}
</style>
