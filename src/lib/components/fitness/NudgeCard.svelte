<script>
	/**
	 * Ways to finish the day, built from what is already logged.
	 *
	 * Replaces the combo suggester, which proposed sets of up to three foods drawn
	 * partly from a curated pantry — optimal against the remaining macros, but
	 * routinely things nobody had in the house. Every row here is either a bigger
	 * portion of something already on the plate or a food eaten on at least three
	 * separate days recently.
	 *
	 * A row can also be one of the site's own recipes, which the server only offers
	 * when a portion of it lands every macro on target. Those carry a link to the
	 * recipe — a suggestion to cook something is worthless without the instructions —
	 * and read in portions where the recipe says how many it makes, because nobody
	 * plans dinner in grams.
	 *
	 * Applying is one tap and always reversible: a bump remembers the previous weight
	 * and a new entry remembers its id, so undo is an exact inverse rather than a
	 * best guess. The undo stays on screen until the list is refreshed, instead of
	 * expiring with a toast.
	 */
	import { resolve } from '$app/paths';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import Check from '@lucide/svelte/icons/check';
	import Plus from '@lucide/svelte/icons/plus';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ChefHat from '@lucide/svelte/icons/chef-hat';
	import { toast } from '$lib/js/toast.svelte';
	import { formatGrams as fmt } from '$lib/fitness/nutritionMath';
	import { portionMultiplier } from '$lib/fitness/portions';

	let {
		nudges = [],
		date,
		isEn = true,
		defaultMealType = 'snack',
		onapplied = () => {},
	} = $props();

	/** @type {Record<string, { kind: 'bump'|'add', entryId: string, previousGrams?: number }>} */
	let applied = $state({});
	/** @type {string | null} */
	let busy = $state(null);

	/** @param {any} n */
	function keyOf(n) {
		return n.kind === 'bump' ? `bump:${n.entryId}` : `add:${n.source}:${n.sourceId}`;
	}

	/** @param {any} n */
	async function apply(n) {
		const key = keyOf(n);
		busy = key;
		try {
			if (n.kind === 'bump') {
				const res = await fetch(`/api/fitness/food-log/${n.entryId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ amountGrams: n.toGrams }),
				});
				if (!res.ok) throw new Error('bump failed');
				applied[key] = { kind: 'bump', entryId: n.entryId, previousGrams: n.fromGrams };
			} else {
				const res = await fetch('/api/fitness/food-log', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						date,
						mealType: defaultMealType,
						name: n.name,
						source: n.source,
						sourceId: n.sourceId,
						amountGrams: n.deltaGrams,
						per100g: n.per100g,
					}),
				});
				if (!res.ok) throw new Error('add failed');
				const created = await res.json();
				applied[key] = { kind: 'add', entryId: String(created._id ?? created.id) };
			}
			onapplied();
		} catch {
			toast.error(isEn ? 'Could not apply that' : 'Konnte nicht übernommen werden');
		} finally {
			busy = null;
		}
	}

	/** @param {any} n */
	async function undo(n) {
		const key = keyOf(n);
		const record = applied[key];
		if (!record) return;
		busy = key;
		try {
			if (record.kind === 'bump') {
				const res = await fetch(`/api/fitness/food-log/${record.entryId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ amountGrams: record.previousGrams }),
				});
				if (!res.ok) throw new Error('undo failed');
			} else {
				const res = await fetch(`/api/fitness/food-log/${record.entryId}`, { method: 'DELETE' });
				if (!res.ok) throw new Error('undo failed');
			}
			delete applied[key];
			onapplied();
		} catch {
			toast.error(isEn ? 'Could not undo that' : 'Rückgängig machen fehlgeschlagen');
		} finally {
			busy = null;
		}
	}

	/**
	 * How much of the recipe the suggested weight is, when the recipe states its
	 * yield. "≈ 1 portion" is the actionable form of "265 g" — the grams stay next to
	 * it, since that is what actually gets logged.
	 * @param {any} n
	 */
	function portionHint(n) {
		const grams = n.recipe?.portionGrams;
		if (!grams) return null;
		const mult = portionMultiplier(n.deltaGrams, { description: '', grams });
		if (mult == null || mult < 0.1) return null;
		const count = Number.isInteger(mult) ? String(mult) : mult.toFixed(1);
		const unit = isEn ? (mult === 1 ? 'portion' : 'portions') : (mult === 1 ? 'Portion' : 'Portionen');
		return `≈ ${count} ${unit}`;
	}

	/** The name to show — recipes carry a translated one, other rows do not.
	 *  @param {any} n */
	function displayName(n) {
		return isEn && n.recipe?.nameEn ? n.recipe.nameEn : n.name;
	}

	/** Route params for the recipe's own page, in the language this card is being
	 *  read in. A recipe without an English slug keeps its German page.
	 *  @param {any} n */
	function recipeRoute(n) {
		return {
			recipeLang: /** @type {'recipes' | 'rezepte'} */ (isEn ? 'recipes' : 'rezepte'),
			name: isEn && n.recipe.slugEn ? n.recipe.slugEn : n.recipe.slug,
		};
	}

	/**
	 * The gaps a suggestion leaves, worded as plain shortfalls. Overshoot is named
	 * rather than hidden — "3 g over on protein" is the thing worth knowing before
	 * tapping.
	 * @param {any} after
	 */
	function leftLabel(after) {
		/** @type {string[]} */
		const parts = [];
		for (const [key, label] of /** @type {const} */ ([
			['protein', isEn ? 'protein' : 'Eiweiss'],
			['fat', isEn ? 'fat' : 'Fett'],
			['carbs', isEn ? 'carbs' : 'Kohlenhydrate'],
		])) {
			const v = after[key];
			if (Math.abs(v) < 3) continue;
			parts.push(v > 0
				? `${fmt(v)} g ${label} ${isEn ? 'short' : 'fehlen'}`
				: `${fmt(-v)} g ${label} ${isEn ? 'over' : 'zu viel'}`);
		}
		if (parts.length === 0) return isEn ? 'hits every target' : 'trifft alle Ziele';
		return parts.join(' · ');
	}
</script>

{#if nudges.length > 0}
	<section class="nudge-card">
		<h3>{isEn ? 'Finish your day' : 'Tag abschliessen'}</h3>
		<p class="sub">
			{#if nudges.some((/** @type {any} */ n) => n.recipe)}
				{isEn
					? 'Built from what you have already logged, what you eat regularly, and recipes that fit what is left.'
					: 'Basierend auf dem, was du bereits erfasst hast, regelmässig isst — und Rezepten, die zum Rest des Tages passen.'}
			{:else}
				{isEn
					? 'Built from what you have already logged and what you eat regularly.'
					: 'Basierend auf dem, was du bereits erfasst hast und regelmässig isst.'}
			{/if}
		</p>

		<ul class="list">
			{#each nudges as n (keyOf(n))}
				{@const key = keyOf(n)}
				{@const isApplied = !!applied[key]}
				{@const isBusy = busy === key}
				<li class="row" class:is-applied={isApplied}>
					<span class="icon" class:has-thumb={!isApplied && !!n.recipe?.image} aria-hidden="true">
						{#if isApplied}
							<Check size={14} />
						{:else if n.recipe?.image}
							<img src={n.recipe.image} alt="" loading="lazy" />
						{:else if n.recipe}
							<ChefHat size={14} />
						{:else if n.kind === 'bump'}
							<ArrowUp size={14} />
						{:else}
							<Plus size={14} />
						{/if}
					</span>

					<span class="body">
						<span class="what">
							{displayName(n)}
							{#if n.kind === 'bump'}
								<span class="change">{fmt(n.fromGrams)} g → <strong>{fmt(n.toGrams)} g</strong></span>
							{:else}
								{@const hint = portionHint(n)}
								<span class="change">
									<strong>{hint ?? `${fmt(n.deltaGrams)} g`}</strong>{#if hint}<span class="grams"> · {fmt(n.deltaGrams)} g</span>{/if}
								</span>
							{/if}
						</span>
						<span class="leaves">
							{leftLabel(n.after)}
							{#if n.recipe}
								<a class="recipe-link" href={resolve('/[recipeLang=recipeLang]/[name]', recipeRoute(n))}>{isEn ? 'View recipe' : 'Zum Rezept'}</a>
							{/if}
						</span>
					</span>

					{#if isApplied}
						<button class="act undo" onclick={() => undo(n)} disabled={isBusy}>
							<Undo2 size={14} />
							{isEn ? 'Undo' : 'Rückgängig'}
						</button>
					{:else}
						<button class="act" onclick={() => apply(n)} disabled={isBusy}>
							{n.kind === 'bump' ? (isEn ? 'Adjust' : 'Anpassen') : (isEn ? 'Add' : 'Hinzufügen')}
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.nudge-card {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	h3 {
		margin: 0;
		font-size: var(--text-base);
		color: var(--color-text-primary);
	}

	.sub {
		margin: 0;
		font-size: 0.7rem;
		line-height: 1.4;
		color: var(--color-text-secondary);
	}

	.list {
		list-style: none;
		margin: 0.25rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.row {
		display: grid;
		grid-template-columns: 1.4rem 1fr auto;
		align-items: center;
		gap: 0.5rem;
		padding: 0.45rem 0.5rem;
		border-radius: var(--radius-md);
		background: var(--color-bg-tertiary);
		transition: background var(--transition-fast);
	}

	/* An applied row stays in place rather than disappearing — it is the only handle
	   on the undo, and a row that vanishes on tap leaves nothing to reverse. */
	.row.is-applied {
		background: var(--color-bg-elevated);
	}

	.icon {
		display: grid;
		place-items: center;
		width: 1.4rem;
		height: 1.4rem;
		border-radius: var(--radius-pill);
		background: var(--color-surface);
		color: var(--color-text-secondary);
	}
	.row.is-applied .icon {
		background: var(--green);
		color: var(--color-text-on-primary);
	}

	/* A recipe row shows the dish instead of a glyph — it is the fastest way to
	   recognise what is being proposed. */
	.icon.has-thumb {
		overflow: hidden;
	}
	.icon img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.what {
		font-size: var(--text-sm);
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.change {
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
		margin-left: 0.3rem;
	}
	.change strong {
		color: var(--color-text-primary);
		font-weight: 600;
	}

	.leaves {
		font-size: 0.7rem;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}

	/* The grams behind a portion count: still there, just not the headline. */
	.grams {
		font-weight: 400;
		color: var(--color-text-secondary);
	}

	.recipe-link {
		color: var(--color-primary);
		text-decoration: none;
		margin-left: 0.4rem;
	}
	.recipe-link::before {
		content: '· ';
		color: var(--color-text-tertiary);
	}
	.recipe-link:hover {
		text-decoration: underline;
	}

	.act {
		border: none;
		cursor: pointer;
		padding: 0.35rem 0.7rem;
		border-radius: var(--radius-pill);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-size: var(--text-sm);
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		transition: background var(--transition-fast);
	}
	.act:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}
	.act:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.act.undo {
		background: transparent;
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
	}
	.act.undo:hover:not(:disabled) {
		background: var(--color-bg-tertiary);
	}

	@media (max-width: 560px) {
		.row {
			grid-template-columns: 1.4rem 1fr;
			grid-template-areas: 'icon body' '. act';
			row-gap: 0.35rem;
		}
		.icon { grid-area: icon; }
		.body { grid-area: body; }
		.act {
			grid-area: act;
			justify-self: start;
		}
	}
</style>
