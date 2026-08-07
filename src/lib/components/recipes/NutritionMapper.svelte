<script>
	/**
	 * The recipe editor's nutrition section.
	 *
	 * Everything here is local until the form saves — the two hidden inputs below
	 * carry the state into the normal recipe POST, which is why they must render
	 * unconditionally. `name=` is what the serializer reads, not DOM depth, but
	 * hiding them behind the "has mappings" branch would silently stop posting the
	 * global overwrites on an unmapped recipe.
	 */
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { toast } from '$lib/js/toast.svelte';
	import { confirm as confirmDialog } from '$lib/js/confirmDialog.svelte';
	import { buildRows, coverageOf } from '$lib/js/nutritionTriage';
	import { resolveFinalWeight, hasFinalWeightOverride } from '$lib/js/finalWeight';
	import NutritionCoverageStrip from './NutritionCoverageStrip.svelte';
	import NutritionMapperCard from './NutritionMapperCard.svelte';
	import BaseRecipeCard from './BaseRecipeCard.svelte';

	/**
	 * @typedef {{
	 *   mappings: any[],
	 *   ingredients: any[],
	 *   shortName: string,
	 *   referencedNutrition?: any[],
	 *   finalWeight?: import('$lib/js/finalWeight').FinalWeightOverride,
	 * }} Props
	 */

	/** @type {Props} */
	let {
		mappings = $bindable([]),
		ingredients = [],
		shortName = '',
		referencedNutrition = [],
		finalWeight = $bindable({ mode: 'auto' }),
	} = $props();

	let generating = $state(false);
	/** @type {string | null} */
	let expandedKey = $state(null);
	/** @type {import('$lib/js/nutritionTriage').TriageState | 'all'} */
	let filter = $state('all');
	/** @type {Record<string, boolean>} */
	let globalToggle = $state({});
	/** @type {Set<string>} */
	let globalOverwriteNames = $state(new Set());
	// Until the overwrite list is in, every switch reads as off — which is
	// indistinguishable from "the user turned it off" and would post the whole
	// list for deletion on an early save. Removals only count once this is true.
	let globalOverwritesLoaded = $state(false);

	const rows = $derived(buildRows(ingredients, mappings));

	/**
	 * The resolved reference behind a base card.
	 *
	 * Matched by position first: a `type: 'reference'` section stores an ObjectId,
	 * which only names a recipe once the server has looked it up, so the card has
	 * no slug to match on until then. Slug is the fallback, for a reference that
	 * came back without a position (an older payload).
	 */
	const refByPosition = $derived(
		new Map(
			(referencedNutrition ?? [])
				.filter((r) => r.sectionIndex !== undefined)
				.map((r) => [`${r.sectionIndex}-${r.ingredientIndex ?? ''}`, r])
		)
	);
	const refBySlug = $derived(new Map((referencedNutrition ?? []).map((r) => [r.shortName, r])));

	/** @param {any} row */
	function referenceFor(row) {
		const [, si, ii] = row.key.match(/^base-(\d+)(?:-(\d+))?$/) ?? [];
		return refByPosition.get(`${si}-${ii ?? ''}`) ?? (row.slug ? refBySlug.get(row.slug) : undefined);
	}

	const baseContributions = $derived(
		rows
			.filter((r) => r.kind === 'base')
			.map((r) => {
				const ref = referenceFor(r);
				if (!ref) return { grams: 0, covered: 0 };
				const mult = ref.baseMultiplier ?? 1;
				const grams = (ref.totalGrams ?? 0) * mult;
				return { grams, covered: grams * (ref.coverage ?? 1) };
			})
	);

	const coverage = $derived(coverageOf(rows, baseContributions));

	// What the ingredients add up to before anything is cooked off. coverageOf
	// already sums exactly this — own lines at nominal grams plus each base recipe's
	// contribution — so the override has a live number to work against.
	const sumGrams = $derived(coverage.totalGrams);
	const finishedGrams = $derived(resolveFinalWeight(sumGrams, finalWeight));
	const weightMode = $derived(finalWeight?.mode ?? 'auto');
	const overrideActive = $derived(hasFinalWeightOverride(finalWeight));

	/** @param {'auto' | 'relative' | 'absolute'} mode */
	function setWeightMode(mode) {
		// Seed the field being switched to, so the number box is never blank on open.
		if (mode === 'relative') {
			finalWeight = { mode, percent: finalWeight?.percent ?? -10 };
		} else if (mode === 'absolute') {
			finalWeight = { mode, grams: finalWeight?.grams ?? (Math.round(sumGrams) || null) };
		} else {
			finalWeight = { mode: 'auto' };
		}
	}

	/** @param {number} g */
	function fmtGrams(g) {
		return `${Math.round(g).toLocaleString('de-CH')} g`;
	}

	const visibleRows = $derived(filter === 'all' ? rows : rows.filter((r) => r.state === filter));

	function keyOf(/** @type {any} */ m) {
		return `${m.sectionIndex}-${m.ingredientIndex}`;
	}

	// --- Global overwrites -------------------------------------------------

	async function loadGlobalOverwrites() {
		try {
			const res = await fetch('/api/nutrition/overwrites');
			if (!res.ok) return;
			/** @type {any[]} */
			const overwrites = await res.json();
			globalOverwriteNames = new Set(overwrites.map((o) => o.ingredientNameDe));
			syncGlobalToggles();
		} catch {
			// A failed load leaves every switch off, which is the safe default: the
			// worst case is the user re-setting one, not a silent global write.
		}
	}

	function syncGlobalToggles() {
		/** @type {Record<string, boolean>} */
		const next = {};
		for (const m of mappings) {
			next[keyOf(m)] = globalOverwriteNames.has(globalNameOf(m));
		}
		globalToggle = next;
		globalOverwritesLoaded = true;
	}

	/** The key a global overwrite is stored under for this mapping. */
	function globalNameOf(/** @type {any} */ m) {
		return (m.ingredientNameDe || m.ingredientName || '').toLowerCase().trim();
	}

	// Once, at init — deliberately not an $effect on `mappings`, which would refetch
	// the overwrite list on every card edit. A regenerate reloads it explicitly,
	// because that is the one action that can invent rows this has no toggle for.
	if (mappings.length > 0) loadGlobalOverwrites();

	/** The overwrites the form posts — one per card whose switch is on. */
	function getGlobalOverwrites() {
		return mappings
			.filter((m) => globalToggle[keyOf(m)])
			.map((m) => ({
				ingredientNameDe: globalNameOf(m),
				ingredientNameEn: m.ingredientName,
				source: m.excluded ? 'skip' : m.source || 'usda',
				fdcId: m.fdcId,
				blsCode: m.blsCode,
				nutritionDbName: m.nutritionDbName,
				excluded: m.excluded || false,
			}));
	}

	/**
	 * Overwrites the form posts for deletion — switched on when the page loaded,
	 * off now.
	 *
	 * Without this, turning the switch off did nothing at all: the save only ever
	 * upserted the switched-on entries, so a global mapping — including a global
	 * *skip* — could be created from here but never taken back. That is how "Salz"
	 * ended up skipped in every recipe with no way out of it.
	 */
	function getRemovedGlobalOverwrites() {
		if (!globalOverwritesLoaded) return [];
		const removed = mappings
			.filter((m) => !globalToggle[keyOf(m)] && globalOverwriteNames.has(globalNameOf(m)))
			.map(globalNameOf);
		return [...new Set(removed)];
	}

	// --- Matching ----------------------------------------------------------

	async function generateAll() {
		generating = true;
		try {
			const res = await fetch(
				`/api/rezepte/nutrition/generate/${encodeURIComponent(shortName.trim())}?preview=true`,
				{ method: 'POST' }
			);
			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(err.message || `HTTP ${res.status}`);
			}
			const result = await res.json();
			// Hand edits survive a regenerate — they are the only part of this the
			// matcher cannot reproduce.
			const manual = new Map(
				mappings.filter((m) => m.manuallyEdited || m.confirmed).map((m) => [keyOf(m), m])
			);
			mappings = result.mappings.map((/** @type {any} */ m) => manual.get(keyOf(m)) || m);
			await loadGlobalOverwrites();
			const done = coverage.counts.ok + coverage.counts.unsure + coverage.counts.ref;
			toast.success(`Zuordnung erstellt — ${done} von ${result.count} Zutaten`);
		} catch (e) {
			toast.error(`Fehler: ${e instanceof Error ? e.message : String(e)}`);
		} finally {
			generating = false;
		}
	}

	/** Reset one row to what the matcher would say, leaving every other row alone. */
	async function revertOne(/** @type {any} */ mapping, /** @type {any} */ line) {
		try {
			const res = await fetch('/api/rezepte/nutrition/match-one', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shortName: shortName.trim(),
					sectionIndex: mapping.sectionIndex,
					ingredientIndex: mapping.ingredientIndex,
					unit: line?.unit ?? '',
					amount: line?.amount ?? '',
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(err.message || `HTTP ${res.status}`);
			}
			const { mapping: fresh } = await res.json();
			replace(mapping, fresh);
		} catch (e) {
			toast.error(`Fehler: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	/** @param {any} target @param {any} next */
	function replace(target, next) {
		const key = keyOf(target);
		mappings = mappings.map((m) => (keyOf(m) === key ? { ...next } : m));
	}

	/** @param {any} target @param {Record<string, any>} patchObj */
	function patch(target, patchObj) {
		const key = keyOf(target);
		mappings = mappings.map((m) => (keyOf(m) === key ? { ...m, ...patchObj } : m));
	}

	/**
	 * Assign a picked food to a mapping.
	 *
	 * Only bls and usda can be stored: the mapping's `source` enum, the Mongoose
	 * schema and every resolver understand nothing else, and a rejected mapping
	 * takes the whole array down with it on save. The search is locked to those two
	 * sources, so this is the belt to that pair of braces.
	 *
	 * The other id is cleared, not left behind — a mapping holding both a blsCode
	 * and an fdcId resolves to whichever the reader checks first.
	 */
	function assign(/** @type {any} */ mapping, /** @type {any} */ entry) {
		if (entry.source !== 'bls' && entry.source !== 'usda') {
			toast.error('Nur BLS- und USDA-Einträge können zugeordnet werden.');
			return;
		}
		const fdcId = entry.source === 'usda' ? Number(entry.sourceId) : undefined;
		if (entry.source === 'usda' && !Number.isFinite(fdcId)) {
			toast.error('Ungültige USDA-Kennung.');
			return;
		}
		patch(mapping, {
			source: entry.source,
			blsCode: entry.source === 'bls' ? entry.sourceId : undefined,
			fdcId,
			nutritionDbName: entry.name,
			matchMethod: 'manual',
			matchConfidence: 1,
			excluded: false,
			manuallyEdited: true,
			// Choosing the food *is* the review, so the row must not stay flagged for
			// a reason the choice already settled.
			confirmed: true,
			// per100g is resolved server-side on the next load; until then the card's
			// kcal line has nothing to show, which is honest.
			per100g: undefined,
			...(entry.gramsPerUnit > 0
				? { gramsPerUnit: entry.gramsPerUnit, unitConversionSource: 'manual' }
				: {}),
		});
		expandedKey = null;
		toast.success(`${mapping.ingredientNameDe || mapping.ingredientName} → ${entry.name}`);
	}

	/**
	 * Point a base-recipe row at a different recipe.
	 *
	 * The link in the ingredient's name is the recipe's own statement of what it
	 * means, and normally right — but it can name a slug that was since renamed or
	 * deleted, which no amount of re-matching will fix. Writing `recipeRef` onto
	 * the mapping overrides it, and the resolver reads that before the link.
	 *
	 * The food match is cleared with it: a line cannot be both a reference to a
	 * recipe and an ingredient in its own right, and leaving a stale
	 * `nutritionDbName` behind would show a food that contributes nothing.
	 */
	function setRecipeRef(/** @type {any} */ mapping, /** @type {string} */ slug) {
		patch(mapping, {
			recipeRef: slug,
			recipeRefMultiplier: mapping.recipeRefMultiplier ?? 1,
			manuallyEdited: true,
			excluded: true,
			matchMethod: 'manual',
			source: undefined,
			fdcId: undefined,
			blsCode: undefined,
			nutritionDbName: undefined,
			per100g: undefined,
		});
		toast.success(`Grundrezept: ${slug}`);
	}

	/**
	 * Leave this line out of the calculation — here, in this recipe.
	 *
	 * The global switch comes off with it. It is on by default for any ingredient
	 * that already has a global mapping, and a saved overwrite carries `source:
	 * 'skip'` when the mapping is excluded — so skipping a line like salt once
	 * used to write "skip salt" for *every* recipe, silently. Making it global is
	 * still possible, but it has to be asked for after the fact.
	 */
	function skip(/** @type {any} */ mapping) {
		patch(mapping, { excluded: true, matchMethod: 'manual', manuallyEdited: true });
		globalToggle = { ...globalToggle, [keyOf(mapping)]: false };
	}

	/**
	 * Put a skipped line back in.
	 *
	 * Local, deliberately. This used to call `revertOne`, which re-derives the row
	 * from the matcher — and the matcher's first step is the global overwrite
	 * table, so any ingredient carrying a global skip came straight back excluded
	 * and the button looked broken. Re-matching is what the "Zurück auf
	 * automatisch" button is for.
	 */
	function unskip(/** @type {any} */ mapping) {
		patch(mapping, { excluded: false, manuallyEdited: true });
	}

	/**
	 * Rows a bulk approve would cover: flagged, and flagged for something approving
	 * can actually settle. A row with no gram figure is deliberately not included —
	 * see triageState.
	 */
	const confirmableRows = $derived(
		rows.filter((r) => r.kind === 'ingredient' && r.state === 'unsure' && r.mapping?.gramsPerUnit)
	);

	async function confirmAllVisible() {
		const targets = confirmableRows;
		if (targets.length === 0) return;
		const ok = await confirmDialog(
			`${targets.length} Zuordnung${targets.length === 1 ? '' : 'en'} als geprüft markieren? Die Zuordnungen selbst ändern sich nicht.`,
			{ title: 'Alle übernehmen?', confirmText: 'Übernehmen', cancelText: 'Abbrechen' }
		);
		if (!ok) return;
		for (const row of targets) patch(row.mapping, { confirmed: true });
		toast.success(`${targets.length} übernommen`);
	}

	function jumpTo(/** @type {string} */ key) {
		filter = 'all';
		requestAnimationFrame(() => {
			const el = document.getElementById(`map-${key}`);
			el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		});
	}
</script>

<!-- Rendered unconditionally: see the module comment. -->
<input type="hidden" name="nutritionMappings_json" value={JSON.stringify(mappings)} />
<input type="hidden" name="globalOverwrites_json" value={JSON.stringify(getGlobalOverwrites())} />
<input
	type="hidden"
	name="globalOverwritesRemoved_json"
	value={JSON.stringify(getRemovedGlobalOverwrites())}
/>
<input type="hidden" name="finalWeight_json" value={JSON.stringify(finalWeight ?? { mode: 'auto' })} />

<section class="mapper">
	<header class="mapper-head">
		<h3>Nährwerte</h3>
		<button
			type="button"
			class="generate"
			disabled={generating || !shortName.trim()}
			onclick={generateAll}
		>
			{#if generating}
				<LoaderCircle size={14} class="spin" />Generiere…
			{:else}
				<Sparkles size={14} />{mappings.length > 0 ? 'Neu generieren' : 'Generieren'}
			{/if}
		</button>
	</header>

	{#if rows.length === 0}
		<p class="empty">
			Noch keine Zuordnung. „Generieren" schlägt für jede Zutat einen Eintrag aus BLS oder USDA
			vor; alles Weitere passt du hier von Hand an.
		</p>
	{:else}
		<NutritionCoverageStrip
			{rows}
			{coverage}
			{filter}
			onfilter={(next) => (filter = next)}
			onjump={jumpTo}
		/>

		{#if confirmableRows.length > 0}
			<div class="confirm-all">
				<span>
					{confirmableRows.length} Zuordnung{confirmableRows.length === 1 ? '' : 'en'} zum Prüfen
				</span>
				<button type="button" onclick={confirmAllVisible}>Alle übernehmen</button>
			</div>
		{/if}

		<div class="final-weight">
			<div class="fw-head">
				<span class="fw-title">Fertiggewicht</span>
				<span class="fw-sum">Zutaten: {fmtGrams(sumGrams)}</span>
			</div>

			<div class="fw-modes" role="radiogroup" aria-label="Fertiggewicht bestimmen">
				<button
					type="button"
					role="radio"
					aria-checked={weightMode === 'auto'}
					class:is-on={weightMode === 'auto'}
					onclick={() => setWeightMode('auto')}
				>
					Automatisch
				</button>
				<button
					type="button"
					role="radio"
					aria-checked={weightMode === 'relative'}
					class:is-on={weightMode === 'relative'}
					onclick={() => setWeightMode('relative')}
				>
					Relativ
				</button>
				<button
					type="button"
					role="radio"
					aria-checked={weightMode === 'absolute'}
					class:is-on={weightMode === 'absolute'}
					onclick={() => setWeightMode('absolute')}
				>
					Absolut
				</button>
			</div>

			{#if weightMode === 'relative'}
				<label class="fw-field">
					<span>Abweichung zur Zutatensumme</span>
					<span class="fw-input-row">
						<input
							type="number"
							step="1"
							min="-99"
							max="500"
							aria-label="Abweichung in Prozent"
							value={finalWeight?.percent ?? ''}
							oninput={(e) => {
								const raw = e.currentTarget.value;
								finalWeight = { mode: 'relative', percent: raw === '' ? null : Number(raw) };
							}}
						/>
						<span class="fw-unit">%</span>
					</span>
				</label>
				<p class="fw-hint">Negativ für Verlust beim Backen oder Einkochen, z.&nbsp;B. −10.</p>
			{:else if weightMode === 'absolute'}
				<label class="fw-field">
					<span>Fertiggewicht</span>
					<span class="fw-input-row">
						<input
							type="number"
							step="1"
							min="1"
							aria-label="Fertiggewicht in Gramm"
							value={finalWeight?.grams ?? ''}
							oninput={(e) => {
								const raw = e.currentTarget.value;
								finalWeight = { mode: 'absolute', grams: raw === '' ? null : Number(raw) };
							}}
						/>
						<span class="fw-unit">g</span>
					</span>
				</label>
			{/if}

			<p class="fw-result" class:is-override={overrideActive}>
				{#if overrideActive}
					Nährwerte werden auf <strong>{fmtGrams(finishedGrams)}</strong> bezogen
					({sumGrams > 0 ? Math.round((finishedGrams / sumGrams - 1) * 100) : 0}&thinsp;% zur Summe).
				{:else}
					Nährwerte werden auf die Zutatensumme bezogen.
				{/if}
			</p>
		</div>

		<div class="cards">
			{#each visibleRows as row (row.key)}
				{#if row.kind === 'base'}
					<BaseRecipeCard
						{row}
						reference={referenceFor(row)}
						recipeGrams={coverage.totalGrams}
						onmultiplierchange={row.mapping
							? (value) => patch(row.mapping, { recipeRefMultiplier: value })
							: undefined}
						onrefchange={row.mapping ? (slug) => setRecipeRef(row.mapping, slug) : undefined}
					/>
				{:else}
					<NutritionMapperCard
						{row}
						expanded={expandedKey === row.key}
						globalOn={globalToggle[row.key] ?? false}
						onexpand={() => (expandedKey = row.key)}
						oncollapse={() => (expandedKey = null)}
						onassign={(entry) => assign(row.mapping, entry)}
						onskip={() => skip(row.mapping)}
						onunskip={() => unskip(row.mapping)}
						onrevert={() => revertOne(row.mapping, row.line)}
						ongramschange={(grams) =>
							patch(row.mapping, {
								gramsPerUnit: grams,
								unitConversionSource: 'manual',
								manuallyEdited: true,
								confirmed: true,
							})}
						onconfirm={() => patch(row.mapping, { confirmed: true })}
						onunconfirm={() => patch(row.mapping, { confirmed: false })}
						onglobalchange={(on) => (globalToggle = { ...globalToggle, [row.key]: on })}
					/>
				{/if}
			{:else}
				<p class="empty">Keine Zutat in dieser Ansicht.</p>
			{/each}
		</div>
	{/if}
</section>

<style>
	.mapper {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		max-width: 1000px;
		margin-inline: auto;
		padding: 1.25rem 0;
	}

	.mapper-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.confirm-all {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		padding: 0.6rem 0.9rem;
		background: color-mix(in srgb, var(--orange) 12%, transparent);
		border-radius: var(--radius-md);
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}
	.confirm-all button {
		padding: 0.3rem 0.8rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text-primary);
		font-size: 0.82rem;
		cursor: pointer;
		transition: var(--transition-fast);
	}
	.confirm-all button:hover {
		background: var(--color-bg-elevated);
	}

	.final-weight {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.9rem 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}
	.fw-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.fw-title {
		font-weight: 700;
		color: var(--color-text-primary);
	}
	.fw-sum {
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}
	.fw-modes {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.fw-modes button {
		padding: 0.35rem 0.8rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text-secondary);
		font-size: 0.85rem;
		cursor: pointer;
		transition: var(--transition-fast);
	}
	.fw-modes button:hover {
		background: var(--color-bg-elevated);
	}
	.fw-modes button.is-on {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-text-on-primary);
		font-weight: 700;
	}
	.fw-field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.fw-input-row {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}
	.fw-field input {
		width: 8rem;
		padding: 0.4rem 0.7rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
	}
	.fw-field input:hover,
	.fw-field input:focus-visible {
		border-color: var(--color-primary);
		outline: none;
	}
	.fw-unit {
		color: var(--color-text-secondary);
	}
	.fw-hint,
	.fw-result {
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-text-tertiary);
	}
	.fw-result.is-override {
		color: var(--color-text-secondary);
	}
	.mapper-head h3 {
		margin: 0;
		font-size: 1.1rem;
		color: var(--color-text-primary);
	}

	.generate {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.85rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text-primary);
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast);
	}
	.generate:hover:not(:disabled) {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.generate:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.generate :global(.spin) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			rotate: 360deg;
		}
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.empty {
		margin: 0;
		padding: 0.75rem 0;
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--color-text-tertiary);
	}
</style>
