<script>
	import { page } from '$app/stores';
	import { Heart, ExternalLink, Search, X } from 'lucide-svelte';
	import { detectFitnessLang, fitnessSlugs, t } from '$lib/js/fitnessI18n';

	/**
	 * @type {{
	 *   onselect: (food: { name: string, source: string, sourceId: string, amountGrams: number, per100g: any, portions?: any[], selectedPortion?: { description: string, grams: number } }) => void,
	 *   oncancel?: () => void,
	 *   showFavorites?: boolean,
	 *   showDetailLinks?: boolean,
	 *   autofocus?: boolean,
	 *   confirmLabel?: string,
	 * }}
	 */
	let {
		onselect,
		oncancel = undefined,
		showFavorites = true,
		showDetailLinks = true,
		autofocus = false,
		confirmLabel = undefined,
	} = $props();

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const s = $derived(fitnessSlugs(lang));
	const isEn = $derived(lang === 'en');
	const btnLabel = $derived(confirmLabel ?? t('log_food', lang));

	// --- Search state ---
	let query = $state('');
	let results = $state([]);
	let loading = $state(false);
	let timeout = $state(null);

	// --- Selection state ---
	let selected = $state(null);
	let amountInput = $state('100');
	let portionIdx = $state(-1); // -1 = grams

	function doSearch() {
		if (timeout) clearTimeout(timeout);
		if (query.length < 2) {
			results = [];
			return;
		}
		loading = true;
		timeout = setTimeout(async () => {
			try {
				const favParam = showFavorites ? '&favorites=true' : '';
				const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(query)}&full=true${favParam}`);
				if (res.ok) results = await res.json();
			} catch {} finally {
				loading = false;
			}
		}, 300);
	}

	function selectItem(item) {
		selected = item;
		if (item.portions?.length > 0) {
			portionIdx = 0;
			amountInput = '1';
		} else {
			portionIdx = -1;
			amountInput = '100';
		}
	}

	function resolveGrams() {
		const qty = Number(amountInput) || 0;
		if (portionIdx >= 0 && selected?.portions?.[portionIdx]) {
			return Math.round(qty * selected.portions[portionIdx].grams);
		}
		return qty;
	}

	const previewGrams = $derived.by(() => {
		const qty = Number(amountInput) || 0;
		if (portionIdx >= 0 && selected?.portions?.[portionIdx]) {
			return Math.round(qty * selected.portions[portionIdx].grams);
		}
		return qty;
	});

	function confirm() {
		if (!selected) return;
		const grams = resolveGrams();
		if (!grams || grams <= 0) return;

		const food = {
			name: selected.name,
			source: selected.source,
			sourceId: selected.id,
			amountGrams: grams,
			per100g: selected.per100g,
		};
		if (selected.portions?.length > 0) {
			food.portions = selected.portions;
		}
		if (portionIdx >= 0 && selected.portions?.[portionIdx]) {
			food.selectedPortion = selected.portions[portionIdx];
		}
		onselect(food);
		reset();
	}

	function reset() {
		selected = null;
		query = '';
		results = [];
		amountInput = '100';
		portionIdx = -1;
	}

	async function toggleFavorite(item) {
		const wasFav = item.favorited;
		item.favorited = !wasFav;
		results = [...results];
		try {
			if (wasFav) {
				await fetch('/api/fitness/favorite-ingredients', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ source: item.source, sourceId: item.id })
				});
			} else {
				await fetch('/api/fitness/favorite-ingredients', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ source: item.source, sourceId: item.id, name: item.name })
				});
			}
		} catch {
			item.favorited = wasFav;
			results = [...results];
		}
	}

	function fmt(v) {
		if (v >= 100) return Math.round(v).toString();
		if (v >= 10) return v.toFixed(1);
		return v.toFixed(1);
	}
</script>

{#if !selected}
	<!-- svelte-ignore a11y_autofocus -->
	<input
		type="search"
		class="fs-search-input"
		placeholder={t('search_food', lang)}
		bind:value={query}
		oninput={doSearch}
		autofocus={autofocus}
	/>
	{#if loading}
		<p class="fs-status">{t('loading', lang)}</p>
	{/if}
	{#if results.length > 0}
		<div class="fs-results">
			{#each results as item}
				<div class="fs-result-row">
					{#if showFavorites}
						<button class="fs-fav" class:is-fav={item.favorited} onclick={() => toggleFavorite(item)} aria-label="Toggle favorite">
							<Heart size={14} fill={item.favorited ? 'var(--nord11)' : 'none'} />
						</button>
					{/if}
					<button class="fs-result" onclick={() => selectItem(item)}>
						<div class="fs-result-info">
							<span class="fs-result-name">{item.name}</span>
							<span class="fs-result-meta">
								<span class="fs-source-badge" class:usda={item.source === 'usda'}>{item.source === 'bls' ? 'BLS' : 'USDA'}</span>
								{item.category}
							</span>
						</div>
						<span class="fs-result-cal">{item.calories}<small> kcal</small></span>
					</button>
					{#if showDetailLinks}
						<a class="fs-detail-link" href="/fitness/{s.nutrition}/food/{item.source}/{item.id}" aria-label="View details">
							<ExternalLink size={13} />
						</a>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
	{#if oncancel}
		<button class="fs-btn-cancel" onclick={oncancel}>{t('cancel', lang)}</button>
	{/if}
{:else}
	<!-- Selected food — amount & portion -->
	<div class="fs-selected">
		<div class="fs-selected-header">
			<span class="fs-selected-name">
				<span class="fs-source-badge" class:usda={selected.source === 'usda'}>{selected.source === 'bls' ? 'BLS' : 'USDA'}</span>
				{selected.name}
			</span>
		</div>
		<div class="fs-amount-row">
			<input
				type="number"
				class="fs-amount-input"
				bind:value={amountInput}
				min="0.1"
				step={portionIdx >= 0 ? '0.5' : '1'}
			/>
			{#if selected.portions?.length > 0}
				<select class="fs-unit-select" bind:value={portionIdx} onchange={() => {
					const grams = resolveGrams();
					if (portionIdx >= 0 && selected.portions[portionIdx]) {
						amountInput = String(Math.round((grams / selected.portions[portionIdx].grams) * 10) / 10 || 1);
					} else {
						amountInput = String(grams || 100);
					}
				}}>
					<option value={-1}>g</option>
					{#each selected.portions as p, pi}
						<option value={pi}>{p.description} ({Math.round(p.grams)}g)</option>
					{/each}
				</select>
			{:else}
				<span class="fs-unit-label">g</span>
			{/if}
		</div>
		{#if previewGrams > 0}
			<div class="fs-preview">
				{#if portionIdx >= 0}
					<span class="fs-preview-grams">{previewGrams}g</span>
				{/if}
				<span class="fs-preview-cal">{Math.round((selected.per100g?.calories ?? 0) * previewGrams / 100)} <small>kcal</small></span>
				<span class="fs-preview-p">{fmt((selected.per100g?.protein ?? 0) * previewGrams / 100)}g P</span>
				<span class="fs-preview-f">{fmt((selected.per100g?.fat ?? 0) * previewGrams / 100)}g F</span>
				<span class="fs-preview-c">{fmt((selected.per100g?.carbs ?? 0) * previewGrams / 100)}g C</span>
			</div>
		{/if}
		<div class="fs-actions">
			<button class="fs-btn-cancel" onclick={() => { selected = null; }}>{t('cancel', lang)}</button>
			<button class="fs-btn-confirm" onclick={confirm}>{btnLabel}</button>
		</div>
	</div>
{/if}

<style>
	/* ── Search input ── */
	.fs-search-input {
		width: 100%;
		padding: 0.55rem 0.65rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 0.9rem;
		box-sizing: border-box;
		transition: border-color 0.15s;
	}
	.fs-search-input:focus {
		outline: none;
		border-color: var(--nord8);
	}
	.fs-status {
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
		margin: 0.4rem 0;
	}

	/* ── Results ── */
	.fs-results {
		max-height: 260px;
		overflow-y: auto;
		border-radius: 8px;
		border: 1px solid var(--color-border);
	}
	.fs-result-row {
		display: flex;
		align-items: center;
		border-bottom: 1px solid var(--color-border);
	}
	.fs-result-row:last-child {
		border-bottom: none;
	}
	.fs-fav {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.4rem;
		color: var(--color-text-tertiary);
		flex-shrink: 0;
		display: flex;
		transition: color 0.15s;
	}
	.fs-fav.is-fav { color: var(--nord11); }
	.fs-fav:hover { color: var(--nord11); }

	.fs-result {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex: 1;
		min-width: 0;
		padding: 0.55rem 0.65rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		color: var(--color-text-primary);
		gap: 0.75rem;
		transition: background 0.12s;
	}
	.fs-result:hover {
		background: var(--color-bg-elevated);
	}
	.fs-result-info {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.fs-result-name {
		font-size: 0.83rem;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.fs-result-meta {
		font-size: 0.68rem;
		color: var(--color-text-tertiary);
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.fs-source-badge {
		display: inline-block;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		padding: 0.05rem 0.25rem;
		border-radius: 3px;
		background: var(--color-bg-elevated);
		color: var(--color-text-tertiary);
		vertical-align: middle;
	}
	.fs-source-badge.usda {
		background: color-mix(in srgb, var(--nord10) 15%, transparent);
		color: var(--nord10);
	}
	.fs-result-cal {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-text-primary);
		white-space: nowrap;
		flex-shrink: 0;
		font-variant-numeric: tabular-nums;
	}
	.fs-result-cal small {
		font-size: 0.65rem;
		font-weight: 500;
		color: var(--color-text-tertiary);
	}
	.fs-detail-link {
		display: flex;
		padding: 0.4rem;
		color: var(--color-text-tertiary);
		flex-shrink: 0;
		transition: color 0.15s;
	}
	.fs-detail-link:hover {
		color: var(--nord10);
	}

	/* ── Selected food ── */
	.fs-selected {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.fs-selected-name {
		font-weight: 700;
		font-size: 0.9rem;
		letter-spacing: -0.01em;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.fs-amount-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.fs-amount-input {
		width: 5rem;
		padding: 0.45rem 0.55rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 0.9rem;
		text-align: right;
		transition: border-color 0.15s;
		box-sizing: border-box;
	}
	.fs-amount-input:focus {
		outline: none;
		border-color: var(--nord8);
	}
	.fs-unit-select {
		padding: 0.45rem 0.4rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 0.78rem;
		min-width: 0;
		flex: 1;
	}
	.fs-unit-select:focus {
		outline: none;
		border-color: var(--nord8);
	}
	.fs-unit-label {
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}

	/* ── Preview ── */
	.fs-preview {
		display: flex;
		gap: 0.5rem;
		font-size: 0.78rem;
		padding: 0.5rem 0.6rem;
		background: var(--color-bg-tertiary);
		border-radius: 8px;
		font-variant-numeric: tabular-nums;
	}
	.fs-preview-grams {
		color: var(--color-text-tertiary);
	}
	.fs-preview-cal { font-weight: 700; color: var(--color-text-primary); }
	.fs-preview-cal small { font-weight: 500; color: var(--color-text-secondary); }
	.fs-preview-p { color: var(--nord14); font-weight: 600; }
	.fs-preview-f { color: var(--nord12); font-weight: 600; }
	.fs-preview-c { color: var(--nord9); font-weight: 600; }

	/* ── Buttons ── */
	.fs-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}
	.fs-btn-cancel {
		padding: 0.5rem 1.1rem;
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 500;
		transition: background 0.15s;
	}
	.fs-btn-cancel:hover {
		background: var(--color-bg-elevated);
	}
	.fs-btn-confirm {
		padding: 0.5rem 1.1rem;
		background: var(--nord8);
		color: white;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 700;
		transition: background 0.15s, transform 0.1s;
	}
	.fs-btn-confirm:hover {
		background: var(--nord10);
	}
	.fs-btn-confirm:active {
		transform: scale(0.97);
	}
</style>
