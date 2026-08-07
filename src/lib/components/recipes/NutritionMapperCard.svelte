<script>
	/**
	 * One ingredient, and what it was mapped to.
	 *
	 * Collapsed it answers three questions the old table could not: what the recipe
	 * line actually says ("2 EL Olivenöl", not just "Olivenöl"), what that resolved
	 * to in grams, and how much to trust the gram figure. Expanded it is a food
	 * search — the same one the diary uses, narrowed to the two databases a mapping
	 * can point at.
	 */
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Ban from '@lucide/svelte/icons/ban';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Pencil from '@lucide/svelte/icons/pencil';
	import FoodSearch from '$lib/components/fitness/FoodSearch.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import Check from '@lucide/svelte/icons/check';
	import { trustLevel, amountAssumed, unsureReasons } from '$lib/js/nutritionTriage';
	import { confirm as confirmDialog } from '$lib/js/confirmDialog.svelte';

	/**
	 * @typedef {{
	 *   row: import('$lib/js/nutritionTriage').MapperRow & { kind: 'ingredient' },
	 *   expanded: boolean,
	 *   globalOn: boolean,
	 *   onexpand: () => void,
	 *   oncollapse: () => void,
	 *   onassign: (entry: { source: string, sourceId: string, name: string, gramsPerUnit: number }) => void,
	 *   onskip: () => void,
	 *   onunskip: () => void,
	 *   onrevert: () => void,
	 *   ongramschange: (grams: number) => void,
	 *   onglobalchange: (on: boolean) => void,
	 *   onconfirm?: () => void,
	 *   onunconfirm?: () => void,
	 * }} Props
	 */

	/** @type {Props} */
	let {
		row,
		expanded,
		globalOn,
		onexpand,
		oncollapse,
		onassign,
		onskip,
		onunskip,
		onrevert,
		ongramschange,
		onglobalchange,
		onconfirm,
		onunconfirm,
	} = $props();

	const mapping = $derived(row.mapping);
	const line = $derived(row.line);
	const trust = $derived(trustLevel(mapping));
	const assumed = $derived(amountAssumed(mapping, line?.amount));
	const reasons = $derived(unsureReasons(mapping, line?.amount));
	// Approving cannot invent a weight, so the button is withheld until one exists —
	// the grams field in the expanded panel is the fix for that case.
	const canConfirm = $derived(row.state === 'unsure' && !!mapping.gramsPerUnit);

	const STATE_LABEL = {
		open: 'offen',
		unsure: 'prüfen',
		ok: 'zugeordnet',
		skipped: 'übersprungen',
		ref: 'Grundrezept',
	};

	/** The recipe line as written, HTML stripped. */
	const lineName = $derived((line?.name || '').replace(/<[^>]*>/g, ''));
	const amountLabel = $derived([line?.amount, line?.unit].filter(Boolean).join(' '));

	const TRUST_NOTE = {
		weak: 'Gewicht pro Einheit geschätzt',
		none: 'keine Umrechnung für diese Einheit — trägt nichts bei',
	};

	function fmtGrams(/** @type {number} */ g) {
		if (!g) return '0';
		return g >= 100 ? Math.round(g).toLocaleString('de-CH') : (Math.round(g * 10) / 10).toString();
	}

	const kcal = $derived.by(() => {
		const per100 = mapping.per100g?.calories;
		if (typeof per100 !== 'number' || !row.grams) return null;
		return Math.round((per100 * row.grams) / 100);
	});

	/** @param {{ source: string, sourceId: string, name: string, amountGrams: number }} food */
	function handleSelect(food) {
		onassign({
			source: food.source,
			sourceId: food.sourceId,
			name: food.name,
			gramsPerUnit: food.amountGrams,
		});
	}

	/**
	 * Turning the global switch on writes a NutritionOverwrite that short-circuits
	 * this ingredient in *every* recipe, so it asks first. Turning it off deletes
	 * that overwrite on save — undoing a broad change needs no ceremony.
	 */
	async function toggleGlobal() {
		if (globalOn) {
			onglobalchange(false);
			return;
		}
		const ok = await confirmDialog(
			`„${lineName}" wird dann in allen Rezepten auf diese Zuordnung gesetzt — auch in Rezepten, die du hier nicht siehst.`,
			{ title: 'Global übernehmen?', confirmText: 'Global setzen', cancelText: 'Nur hier' }
		);
		if (ok) onglobalchange(true);
	}
</script>

<article class="card" data-state={row.state} data-mapper-card id="map-{row.key}" aria-label={lineName}>
	<div class="head">
		<span class="num">{row.index}</span>

		<div class="line">
			<div class="line-main">
				{#if amountLabel}<span class="amount">{amountLabel}</span>{/if}
				<span class="name">{lineName}</span>
			</div>
			<div class="line-sub">
				{#if row.state === 'skipped'}
					<span class="match muted">Übersprungen</span>
				{:else if mapping.nutritionDbName}
					<span class="badge" class:usda={mapping.source !== 'bls'}>{(mapping.source || 'usda').toUpperCase()}</span>
					<span class="match">{mapping.nutritionDbName}</span>
					{#if mapping.manuallyEdited}
						<span class="manual" title="Von Hand zugeordnet"><Pencil size={10} /></span>
					{/if}
				{:else}
					<span class="match muted">Noch keine Zuordnung</span>
				{/if}
			</div>
			{#if row.state !== 'skipped'}
				<div class="line-facts">
					<span class="grams">{fmtGrams(row.grams)} g</span>
					{#if kcal !== null}<span class="kcal">{kcal} kcal</span>{/if}
					<!-- Still stated once accepted, because the assumption is still being
					     made — but as a note rather than an alarm. -->
					{#if trust !== 'ok'}
						<span class="warn" class:is-accepted={mapping.confirmed} title={TRUST_NOTE[trust]}>
							{#if !mapping.confirmed}<TriangleAlert size={11} />{/if}
							{trust === 'none' ? 'keine Umrechnung' : 'geschätzt'}
						</span>
					{/if}
					{#if assumed}
						<span
							class="warn"
							class:is-accepted={mapping.confirmed}
							title="Die Zutat nennt keine Menge — es wird eine Einheit angenommen"
						>
							{#if !mapping.confirmed}<TriangleAlert size={11} />{/if} Menge angenommen
						</span>
					{/if}
				</div>
			{/if}
		</div>

		<span class="state-chip">{STATE_LABEL[row.state]}</span>

		<div class="actions">
			<button
				type="button"
				class="icon-btn"
				title={row.state === 'skipped' ? 'Wieder aufnehmen' : 'Überspringen'}
				aria-label={row.state === 'skipped' ? 'Wieder aufnehmen' : 'Überspringen'}
				onclick={row.state === 'skipped' ? onunskip : onskip}
			>
				{#if row.state === 'skipped'}<Undo2 size={15} />{:else}<Ban size={15} />{/if}
			</button>
			{#if canConfirm}
				<button
					type="button"
					class="icon-btn confirm"
					title={reasons.length ? `Trotzdem übernehmen (${reasons.join(', ')})` : 'Übernehmen'}
					aria-label="Zuordnung übernehmen"
					onclick={onconfirm}
				>
					<Check size={15} />
				</button>
			{:else if mapping.confirmed}
				<button
					type="button"
					class="icon-btn is-confirmed"
					title="Bestätigt — wieder als zu prüfen markieren"
					aria-label="Bestätigung aufheben"
					onclick={onunconfirm}
				>
					<Check size={15} />
				</button>
			{/if}
			{#if mapping.manuallyEdited || mapping.excluded || mapping.confirmed}
				<button type="button" class="icon-btn" title="Zurück auf automatisch" aria-label="Zurück auf automatisch" onclick={onrevert}>
					<RotateCcw size={15} />
				</button>
			{/if}
			<button
				type="button"
				class="icon-btn expand"
				class:is-open={expanded}
				aria-expanded={expanded}
				aria-label={expanded ? 'Zuordnung schliessen' : 'Zuordnung ändern'}
				onclick={expanded ? oncollapse : onexpand}
			>
				<ChevronDown size={16} />
			</button>
		</div>
	</div>

	{#if expanded}
		<div class="panel">
			<FoodSearch
				lang="de"
				sources={['bls', 'usda']}
				showBarcode={false}
				showFavorites={false}
				showDetailLinks={false}
				autofocus
				amountMode="per-unit"
				unitLabel={line?.unit}
				initialAmount={mapping.gramsPerUnit}
				previewBasisGrams={row.grams}
				confirmLabel="Zuordnen"
				placeholder="BLS/USDA durchsuchen…"
				onselect={handleSelect}
				oncancel={oncollapse}
			/>

			<div class="panel-foot">
				<label class="gpu">
					<span>1&nbsp;{line?.unit || 'Einheit'}&nbsp;=</span>
					<input
						type="number"
						min="0"
						step="0.1"
						inputmode="decimal"
						value={mapping.gramsPerUnit ?? 0}
						aria-label="Gramm pro Einheit"
						oninput={(e) => ongramschange(Number(e.currentTarget.value) || 0)}
					/>
					<span>g</span>
				</label>
				<label class="global">
					<Toggle checked={globalOn} label="In allen Rezepten" onchange={toggleGlobal} />
				</label>
			</div>
		</div>
	{/if}
</article>

<style>
	.card {
		border: 1px solid var(--color-border);
		border-left: 3px solid transparent;
		border-radius: var(--radius-md);
		background: var(--color-surface);
		transition: border-color var(--transition-normal);
	}
	/* Only the two states that want a person get an accent. A settled row is
	   quiet — the old table faded the unmapped rows, which put the least ink on
	   exactly the lines that needed the most attention. */
	.card[data-state='open'] { border-left-color: var(--orange); }
	.card[data-state='unsure'] { border-left-color: var(--yellow); }
	.card[data-state='skipped'] { opacity: 0.6; }

	.head {
		display: grid;
		grid-template-columns: 1.6rem 1fr auto auto;
		align-items: start;
		gap: 0.6rem;
		padding: 0.6rem 0.7rem;
	}

	.num {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
		text-align: right;
		padding-top: 0.15rem;
	}

	.line {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}
	.line-main {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.amount {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.name {
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.line-sub {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		min-width: 0;
	}
	.match {
		font-size: 0.78rem;
		color: var(--color-text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.match.muted {
		color: var(--color-text-tertiary);
		font-style: italic;
	}
	.manual {
		display: inline-flex;
		color: var(--color-text-tertiary);
	}

	/* Same badge vocabulary as the fitness food search, so the two surfaces name
	   the databases the same way. */
	.badge {
		flex: none;
		padding: 0.05rem 0.25rem;
		border-radius: 3px;
		background: var(--color-bg-elevated);
		color: var(--color-text-tertiary);
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.04em;
	}
	.badge.usda {
		background: color-mix(in srgb, var(--blue) 15%, transparent);
		color: var(--blue);
	}

	.line-facts {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}
	.grams {
		font-weight: 700;
		color: var(--color-text-secondary);
	}
	.warn {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		color: var(--orange);
	}
	.warn.is-accepted {
		color: var(--color-text-tertiary);
	}

	.state-chip {
		align-self: center;
		padding: 0.1rem 0.45rem;
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		color: var(--color-text-tertiary);
		font-size: 0.62rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
	}
	.card[data-state='open'] .state-chip {
		background: color-mix(in srgb, var(--orange) 15%, transparent);
		color: var(--orange);
	}
	.card[data-state='unsure'] .state-chip {
		background: color-mix(in srgb, var(--yellow) 22%, transparent);
		color: var(--color-text-secondary);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.1rem;
	}
	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.85rem;
		height: 1.85rem;
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--color-text-tertiary);
		cursor: pointer;
		transition: all var(--transition-fast);
	}
	.icon-btn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.icon-btn.confirm {
		color: var(--green);
	}
	.icon-btn.confirm:hover {
		background: color-mix(in srgb, var(--green) 18%, transparent);
		color: var(--green);
	}
	.icon-btn.is-confirmed {
		color: var(--green);
		opacity: 0.6;
	}
	.icon-btn.is-confirmed:hover {
		background: var(--color-bg-elevated);
		color: var(--green);
		opacity: 1;
	}
	.icon-btn.expand :global(svg) {
		transition: rotate var(--transition-normal);
	}
	.icon-btn.expand.is-open :global(svg) {
		rotate: 180deg;
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		padding: 0 0.7rem 0.7rem;
		border-top: 1px solid var(--color-border);
		padding-top: 0.7rem;
		margin-top: 0.1rem;
	}

	.panel-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.gpu {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		color: var(--color-text-secondary);
		font-weight: 600;
	}
	.gpu input {
		width: 5rem;
		padding: 0.35rem 0.45rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-primary);
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	.global {
		display: flex;
		align-items: center;
	}

	@media (max-width: 560px) {
		.head {
			grid-template-columns: 1.4rem 1fr auto;
			row-gap: 0.4rem;
		}
		.state-chip {
			grid-column: 2;
			justify-self: start;
		}
		.actions {
			grid-row: 1;
			grid-column: 3;
		}
	}
</style>
