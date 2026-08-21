<script>
	/**
	 * One nutrient row: name, how far it goes toward a day, the amount, the share.
	 *
	 * The diary links each row through to the foods that supplied the nutrient; a
	 * recipe has no day to break down, so it renders the same row as plain text.
	 * Same grid either way — the two panels sit on different routes and should still
	 * read as one thing.
	 */
	/**
	 * @type {{
	 *   row: import('$lib/fitness/nutrientRows').NutrientRow,
	 *   href?: string | null,
	 *   child?: boolean,
	 *   header?: boolean,
	 *   relativeTitle?: (parent: string) => string | null,
	 *   format?: (value: number) => string,
	 * }}
	 */
	import { formatGrams } from '$lib/fitness/nutritionMath';

	let {
		row,
		href = null,
		child = false,
		header = false,
		relativeTitle = () => null,
		format = formatGrams,
	} = $props();
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	class="micro-row"
	class:is-link={!!href}
	class:is-child={child}
	class:is-group={header}
	href={href || undefined}
	data-sveltekit-noscroll={href ? true : undefined}
>
	<span class="micro-label">{row.label}</span>
	<div class="micro-bar-wrap">
		<div class="micro-bar" class:is-max={row.isMax} style="width: {Math.min(row.bar, 100)}%"></div>
	</div>
	<span class="micro-value" class:is-na={row.noData}>
		{#if row.noData}—{:else}{format(row.value)} {row.unit}{/if}
	</span>
	<span
		class="micro-pct"
		class:is-na={row.pct === null}
		class:is-relative={row.relativeTo}
		title={row.relativeTo ? relativeTitle(row.relativeTo) : null}
	>{row.pct === null ? 'N/A' : `${row.pct}%`}</span>
</svelte:element>

<style>
	.micro-row {
		display: grid;
		grid-template-columns: 7rem 1fr 4rem 2.5rem;
		align-items: center;
		gap: 0.4rem;
		padding: 0.2rem 0;
		font-size: 0.78rem;
	}
	/* Rows link through to which foods supplied the nutrient — see nutrientHref. */
	.micro-row.is-link {
		color: inherit;
		text-decoration: none;
		border-radius: var(--radius-sm);
		padding-inline: 0.3rem;
		margin-inline: -0.3rem;
		transition: background var(--transition-fast);
	}
	.micro-row.is-link:hover {
		background: var(--color-bg-elevated);
	}
	.micro-label {
		color: var(--color-text-primary);
		font-weight: 500;
	}
	/* An omega total heads the acids it is the sum of; those sit indented under it. */
	.micro-row.is-group .micro-label { font-weight: 700; }
	.micro-row.is-child .micro-label {
		padding-left: 0.85rem;
		font-weight: 400;
		color: var(--color-text-secondary);
	}
	.micro-bar-wrap {
		height: var(--meter-sm);
		background: var(--color-bg-tertiary);
		border-radius: 3px;
		overflow: hidden;
	}
	.micro-bar {
		height: 100%;
		background: var(--green);
		border-radius: 3px;
		transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.micro-bar.is-max {
		background: var(--orange);
	}
	.micro-value {
		text-align: right;
		color: var(--color-text-tertiary);
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
	}
	/* Nothing logged reported this nutrient — muted so a dash reads as "not
	   measured" rather than as a value. */
	.micro-value.is-na {
		opacity: 0.55;
	}
	.micro-pct {
		text-align: right;
		font-weight: 700;
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
	}
	/* A share of a parent figure, not of a target — lighter, so the eye does not read
	   it as progress toward a reference intake. */
	.micro-pct.is-relative {
		font-weight: 500;
		color: var(--color-text-secondary);
	}
	.micro-pct.is-na {
		font-weight: 500;
		color: var(--color-text-tertiary);
	}

	@media (max-width: 420px) {
		.micro-row {
			grid-template-columns: 5.5rem 1fr 3.4rem 2.4rem;
			font-size: 0.72rem;
		}
	}
</style>
