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
	 * Applying is one tap and always reversible: a bump remembers the previous weight
	 * and a new entry remembers its id, so undo is an exact inverse rather than a
	 * best guess. The undo stays on screen until the list is refreshed, instead of
	 * expiring with a toast.
	 */
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import Check from '@lucide/svelte/icons/check';
	import Plus from '@lucide/svelte/icons/plus';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import { toast } from '$lib/js/toast.svelte';
	import { formatGrams as fmt } from '$lib/fitness/nutritionMath';

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
			{isEn
				? 'Built from what you have already logged and what you eat regularly.'
				: 'Basierend auf dem, was du bereits erfasst hast und regelmässig isst.'}
		</p>

		<ul class="list">
			{#each nudges as n (keyOf(n))}
				{@const key = keyOf(n)}
				{@const isApplied = !!applied[key]}
				{@const isBusy = busy === key}
				<li class="row" class:is-applied={isApplied}>
					<span class="icon" aria-hidden="true">
						{#if isApplied}
							<Check size={14} />
						{:else if n.kind === 'bump'}
							<ArrowUp size={14} />
						{:else}
							<Plus size={14} />
						{/if}
					</span>

					<span class="body">
						<span class="what">
							{n.name}
							{#if n.kind === 'bump'}
								<span class="change">{fmt(n.fromGrams)} g → <strong>{fmt(n.toGrams)} g</strong></span>
							{:else}
								<span class="change"><strong>{fmt(n.deltaGrams)} g</strong></span>
							{/if}
						</span>
						<span class="leaves">{leftLabel(n.after)}</span>
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
