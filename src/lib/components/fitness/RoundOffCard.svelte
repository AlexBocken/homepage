<script>
	import Plus from '@lucide/svelte/icons/plus';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Beef from '@lucide/svelte/icons/beef';
	import Droplet from '@lucide/svelte/icons/droplet';
	import Wheat from '@lucide/svelte/icons/wheat';
	import { untrack } from 'svelte';
	import { toast } from '$lib/js/toast.svelte';
	import { t } from '$lib/js/fitnessI18n';
	import MealTypePicker from '$lib/components/fitness/MealTypePicker.svelte';
	/** @typedef {import('$lib/server/roundOffScoring').ComboSuggestion} ComboSuggestion */

	/**
	 * @type {{
	 *   remainingKcal: number,
	 *   remainingProtein: number,
	 *   remainingFat: number,
	 *   remainingCarbs: number,
	 *   currentDate: string,
	 *   lang?: 'en' | 'de',
	 *   nutritionSlug?: string,
	 *   initialSuggestions?: ComboSuggestion[] | null,
	 *   onlogged?: () => void,
	 * }}
	 */
	let {
		remainingKcal,
		remainingProtein,
		remainingFat,
		remainingCarbs,
		currentDate,
		lang = 'de',
		nutritionSlug = 'ernaehrung',
		initialSuggestions = null,
		onlogged = () => {},
	} = $props();

	const isEn = $derived(lang === 'en');

	// svelte-ignore state_referenced_locally
	/** @type {ComboSuggestion[] | null} */
	let suggestions = $state(initialSuggestions);
	// svelte-ignore state_referenced_locally
	let loading = $state(!initialSuggestions);
	let expanded = $state(false);
	let loggingIdx = $state(-1);

	function defaultMealType() {
		const h = new Date().getHours();
		if (h >= 5 && h < 10) return 'breakfast';
		if (h >= 10 && h < 15) return 'lunch';
		if (h >= 15 && h < 17) return 'snack';
		return 'dinner';
	}

	let editingComboIdx = $state(-1);
	/** @type {'breakfast' | 'lunch' | 'dinner' | 'snack'} */
	let editMealType = $state('snack');

	async function fetchSuggestions() {
		loading = true;
		try {
			const params = new URLSearchParams({
				remainingKcal: String(Math.round(remainingKcal)),
				remainingProtein: String(Math.round(remainingProtein)),
				remainingFat: String(Math.round(remainingFat)),
				remainingCarbs: String(Math.round(remainingCarbs)),
				limit: '12',
			});
			const res = await fetch(`/api/fitness/round-off-day?${params}`);
			if (res.ok) {
				const data = await res.json();
				suggestions = data.suggestions;
			}
		} catch {
			suggestions = [];
		}
		loading = false;
	}

	$effect(() => {
		if (!initialSuggestions && remainingKcal > 0) {
			untrack(() => fetchSuggestions());
		}
	});

	/** @param {number} comboIdx */
	function startLog(comboIdx) {
		editingComboIdx = comboIdx;
		editMealType = defaultMealType();
	}

	function cancelLog() {
		editingComboIdx = -1;
	}

	/** @param {ComboSuggestion} combo */
	async function logCombo(combo) {
		loggingIdx = editingComboIdx;
		try {
			for (const item of combo.items) {
				const res = await fetch('/api/fitness/food-log', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						date: currentDate,
						mealType: editMealType,
						name: item.name,
						source: item.source,
						sourceId: item.id,
						amountGrams: item.grams,
						per100g: item.atServing
							? {
								calories: item.atServing.calories / item.grams * 100,
								protein: item.atServing.protein / item.grams * 100,
								fat: item.atServing.fat / item.grams * 100,
								carbs: item.atServing.carbs / item.grams * 100,
							}
							: undefined,
					})
				});
				if (!res.ok) {
					toast.error(isEn ? 'Failed to log food' : 'Fehler beim Eintragen');
					loggingIdx = -1;
					return;
				}
			}
			const names = combo.items.map(i => i.name).join(' + ');
			toast.success(isEn ? `Logged "${names}"` : `"${names}" eingetragen`);
			editingComboIdx = -1;
			onlogged();
		} catch {
			toast.error(isEn ? 'Failed to log food' : 'Fehler beim Eintragen');
		}
		loggingIdx = -1;
	}

	/** @param {number | undefined | null} v */
	function fmt(v) {
		if (v == null || isNaN(v)) return '0';
		if (Math.abs(v) >= 100) return Math.round(v).toString();
		return v.toFixed(1);
	}

	/** @param {number} v */
	function fmtSigned(v) {
		const s = fmt(v);
		return v > 0 ? '+' + s : s;
	}

	const displayItems = $derived(expanded ? suggestions : suggestions?.slice(0, 5));
</script>

{#if suggestions?.length || loading}
	<div class="round-off-card">
		<div class="round-off-header">
			<Sparkles size={16} />
			<h3>{isEn ? 'Round off this day' : 'Tag abrunden'}</h3>
			<span class="round-off-remaining">{Math.round(remainingKcal)} kcal {t('remaining', lang)}</span>
		</div>

		{#if loading}
			<div class="round-off-loading">
				<div class="skeleton-row"></div>
				<div class="skeleton-row short"></div>
				<div class="skeleton-row"></div>
			</div>
		{:else if suggestions?.length}
			<!-- Hero: top suggestion -->
			{@const hero = suggestions[0]}
			{@const heroEditing = editingComboIdx === 0}
			{@const hd = hero.delta}
			<div class="hero-card" class:editing={heroEditing}>
				<div class="hero-row">
					<div class="hero-accent"></div>
					<div class="hero-body">
						<div class="hero-left">
							<div class="hero-fit">
								<span class="hero-fit-val">{hero.fitPercent}%</span>
							</div>
							<div class="hero-delta">
								<div class="hero-delta-top">
									<span class="hero-delta-item" class:overshoot={hd.protein < 0}>
										<span class="hero-delta-val macro-p">{fmtSigned(hd.protein)}</span>
										<span class="hero-delta-label macro-p"><Beef size={12} /></span>
									</span>
								</div>
								<div class="hero-delta-bottom">
									<span class="hero-delta-item" class:overshoot={hd.fat < 0}>
										<span class="hero-delta-val macro-f">{fmtSigned(hd.fat)}</span>
										<span class="hero-delta-label macro-f"><Droplet size={12} /></span>
									</span>
									<span class="hero-delta-item" class:overshoot={hd.carbs < 0}>
										<span class="hero-delta-val macro-c">{fmtSigned(hd.carbs)}</span>
										<span class="hero-delta-label macro-c"><Wheat size={12} /></span>
									</span>
								</div>
							</div>
						</div>
						<div class="hero-ingredients">
							{#each hero.items as item, i (item.id)}
								{#if i > 0}<span class="hero-plus">+</span>{/if}
								<span class="hero-ingredient">
									<span class="hero-ing-name">
										{#if hero.tierLabel === 'recipe'}🍳{/if}
										{isEn && item.nameEn ? item.nameEn : item.name}
									</span>
									<span class="hero-ing-grams">{item.grams}g</span>
								</span>
							{/each}
						</div>
					</div>
					<button
						class="hero-add"
						class:active={heroEditing}
						onclick={() => heroEditing ? cancelLog() : startLog(0)}
						disabled={loggingIdx >= 0}
						aria-label={heroEditing ? (isEn ? 'Cancel' : 'Abbrechen') : (isEn ? 'Add' : 'Hinzufügen')}
					>
						<Plus size={16} />
					</button>
				</div>
				{#if heroEditing}
					<div class="hero-edit">
						<MealTypePicker value={editMealType} {lang} onchange={(m) => editMealType = m} />
						<div class="edit-actions">
							<button class="edit-confirm" onclick={() => logCombo(hero)} disabled={loggingIdx >= 0}>
								{hero.items.length > 1
									? (isEn ? `Log ${hero.items.length} items` : `${hero.items.length} loggen`)
									: (isEn ? 'Log' : 'OK')}
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- Compact list: remaining suggestions -->
			{#if displayItems && displayItems.length > 1}
				<div class="compact-list">
					{#each displayItems.slice(1) as combo, idx (idx + 1)}
						{@const isEditing = editingComboIdx === idx + 1}
						{@const d = combo.delta}
						<div class="compact-row" class:editing={isEditing}>
							<div class="compact-top">
								<div class="compact-main">
									<span class="compact-fit">{combo.fitPercent}%</span>
									<span class="compact-name">
										{#each combo.items as item, i (item.id)}
											{#if i > 0}<span class="compact-plus"> + </span>{/if}
											<span class="compact-item">
												<span class="compact-grams">{item.grams}g</span>
												{#if combo.tierLabel === 'recipe' && i === 0}🍳{/if}
												{isEn && item.nameEn ? item.nameEn : item.name}
											</span>
										{/each}
									</span>
									<span class="compact-delta">
										<span class="compact-delta-item" class:overshoot={d.protein < 0}><span class="macro-p">{fmtSigned(d.protein)}</span><span class="macro-p"><Beef size={12} /></span></span>
										<span class="compact-delta-item" class:overshoot={d.fat < 0}><span class="macro-f">{fmtSigned(d.fat)}</span><span class="macro-f"><Droplet size={12} /></span></span>
										<span class="compact-delta-item" class:overshoot={d.carbs < 0}><span class="macro-c">{fmtSigned(d.carbs)}</span><span class="macro-c"><Wheat size={12} /></span></span>
									</span>
								</div>
								<button
									class="compact-add"
									class:active={isEditing}
									onclick={() => isEditing ? cancelLog() : startLog(idx + 1)}
									disabled={loggingIdx >= 0}
									aria-label={isEditing ? (isEn ? 'Cancel' : 'Abbrechen') : (isEn ? 'Add' : 'Hinzufügen')}
								>
									<Plus size={14} />
								</button>
							</div>
							{#if isEditing}
								<div class="compact-edit">
									<MealTypePicker value={editMealType} {lang} onchange={(m) => editMealType = m} />
									<div class="edit-actions">
										<button class="edit-confirm" onclick={() => logCombo(combo)} disabled={loggingIdx >= 0}>
											{combo.items.length > 1
												? (isEn ? `Log ${combo.items.length} items` : `${combo.items.length} loggen`)
												: (isEn ? 'Log' : 'OK')}
										</button>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if suggestions.length > 5 && !expanded}
				<button class="round-off-toggle" onclick={() => expanded = true}>
					<ChevronDown size={14} />
					{isEn ? 'Show more' : 'Mehr anzeigen'} ({suggestions.length - 5})
				</button>
			{/if}
		{:else}
			<p class="round-off-empty">{isEn ? 'No matching suggestions found.' : 'Keine passenden Vorschläge gefunden.'}</p>
		{/if}
	</div>
{/if}

<style>
	.round-off-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
	}

	.round-off-header {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.6rem;
		color: var(--color-primary);
	}
	.round-off-header h3 {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
		flex: 1;
	}
	.round-off-remaining {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		white-space: nowrap;
	}

	/* Loading skeleton */
	.round-off-loading {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.skeleton-row {
		height: 2.4rem;
		background: var(--color-bg-tertiary);
		border-radius: 8px;
		animation: pulse 1.5s ease-in-out infinite;
	}
	.skeleton-row.short {
		width: 70%;
	}
	@keyframes pulse {
		0%, 100% { opacity: 0.6; }
		50% { opacity: 0.3; }
	}

	/* ── Hero card (top suggestion) ── */
	.hero-card {
		display: flex;
		flex-direction: column;
		background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
		border: 1px solid color-mix(in srgb, var(--color-primary) 20%, var(--color-border));
		border-radius: 10px;
		overflow: hidden;
		box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.08));
		margin-bottom: 0.5rem;
	}
	.hero-row {
		display: flex;
		align-items: stretch;
	}
	.hero-accent {
		width: 4px;
		flex-shrink: 0;
		background: var(--color-primary);
	}
	.hero-body {
		flex: 1;
		display: flex;
		align-items: stretch;
		padding: 0.5rem;
		gap: 0.5rem;
		min-width: 0;
	}
	.hero-left {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		flex-shrink: 0;
		min-width: 3.2rem;
	}
	.hero-fit {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.hero-fit-val {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-primary);
		font-variant-numeric: tabular-nums;
	}

	.hero-delta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
	}
	.hero-delta-top {
		display: flex;
		justify-content: center;
	}
	.hero-delta-bottom {
		display: flex;
		gap: 0.3rem;
		justify-content: center;
	}
	.hero-delta-item {
		display: flex;
		align-items: baseline;
		gap: 0.1rem;
	}
	.hero-delta-val {
		font-size: 0.68rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-secondary);
	}
	.hero-delta-label {
		display: flex;
		align-items: center;
	}

	.hero-ingredients {
		display: flex;
		align-items: stretch;
		gap: 0.35rem;
		min-width: 0;
		flex: 1;
		justify-content: center;
	}
	.hero-plus {
		color: var(--color-text-tertiary);
		font-size: 0.75rem;
		font-weight: 400;
		display: flex;
		align-items: center;
	}
	.hero-ingredient {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.1rem;
		flex: 1;
		min-width: 3rem;
		max-width: 9rem;
		padding: 0.4rem 0.5rem;
		background: var(--color-bg-tertiary);
		border-radius: 8px;
		text-align: center;
	}
	.hero-ing-name {
		font-weight: 600;
		font-size: 0.82rem;
		color: var(--color-text-primary);
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	.hero-ing-grams {
		font-weight: 500;
		font-size: 0.72rem;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}


	.hero-add {
		display: flex;
		align-items: center;
		justify-content: center;
		align-self: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: none;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		cursor: pointer;
		flex-shrink: 0;
		margin-right: 0.5rem;
		-webkit-tap-highlight-color: transparent;
	}
	.hero-add :global(svg) {
		transition: transform 0.2s ease;
	}
	.hero-add.active {
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
	}
	.hero-add.active :global(svg) {
		transform: rotate(45deg);
	}
	.hero-add:hover { background: var(--color-primary-hover); }
	.hero-add.active:hover { background: var(--color-bg-elevated); }
	.hero-add:disabled { opacity: 0.5; }

	.hero-edit {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.4rem;
		padding: 0.5rem 0.75rem 0.6rem;
	}

	/* ── Compact list (remaining suggestions) ── */
	.compact-list {
		display: flex;
		flex-direction: column;
	}
	.compact-row {
		display: flex;
		flex-direction: column;
		padding: 0.35rem 0;
		border-bottom: 1px solid var(--color-border);
	}
	.compact-row:last-child { border-bottom: none; }
	.compact-top {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.compact-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex: 1;
		min-width: 0;
		gap: 0.5rem;
	}
	.compact-fit {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--color-primary);
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
		min-width: 2rem;
	}
	.compact-name {
		font-size: 0.8rem;
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}
	.compact-plus {
		color: var(--color-text-tertiary);
		font-weight: 400;
	}
	.compact-grams {
		font-weight: 600;
		font-size: 0.73rem;
		color: var(--color-text-secondary);
	}
	.compact-delta {
		display: flex;
		gap: 0.3rem;
		font-size: 0.68rem;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
		white-space: nowrap;
	}

	.compact-delta-item {
		display: flex;
		align-items: center;
		gap: 0.1rem;
	}
	.compact-delta-item.overshoot :global(*) {
		color: var(--nord11) !important;
	}

	.compact-add {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: none;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		cursor: pointer;
		flex-shrink: 0;
		-webkit-tap-highlight-color: transparent;
	}
	.compact-add :global(svg) {
		transition: transform 0.2s ease;
	}
	.compact-add.active :global(svg) {
		transform: rotate(45deg);
	}
	.compact-add:hover {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.compact-add.active:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-secondary);
	}
	.compact-add:disabled { opacity: 0.5; }

	/* ── Shared edit row ── */
	.compact-edit {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.3rem;
		padding: 0.3rem 0 0;
	}
	.edit-actions {
		display: flex;
		gap: 0.3rem;
	}
	.edit-confirm {
		padding: 0.25rem 0.6rem;
		border: none;
		border-radius: 5px;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}
	.edit-confirm:hover { background: var(--color-primary-hover); }
	.edit-confirm:disabled { opacity: 0.5; }

	/* ── Macro colors ── */
	.macro-p { color: var(--nord14); }
	.macro-f { color: var(--nord12); }
	.macro-c { color: var(--nord9); }
	.overshoot { color: var(--nord11) !important; }

	/* ── Toggle ── */
	.round-off-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		width: 100%;
		padding: 0.4rem;
		margin-top: 0.3rem;
		border: none;
		background: none;
		color: var(--color-primary);
		font-size: 0.78rem;
		cursor: pointer;
	}
	.round-off-toggle:hover { text-decoration: underline; }

	.round-off-empty {
		text-align: center;
		color: var(--color-text-tertiary);
		font-size: 0.82rem;
		padding: 0.5rem 0;
		margin: 0;
	}

	/* ── Small screen refinements ── */
	@media (max-width: 500px) {
		.compact-delta {
			font-size: 0.62rem;
			gap: 0.2rem;
		}

		/* Hero: stack vertically, move deltas above ingredients */
		.hero-body {
			flex-direction: column;
			align-items: stretch;
		}
		.hero-left {
			flex-direction: row;
			justify-content: flex-start;
			gap: 0.5rem;
			min-width: unset;
		}
		.hero-delta {
			flex-direction: row;
			gap: 0.4rem;
		}
		.hero-delta-top,
		.hero-delta-bottom {
			display: contents;
		}
		.hero-ingredients {
			flex-direction: column;
			gap: 0.25rem;
		}
		.hero-ingredient {
			max-width: unset;
		}
		.hero-plus {
			display: none;
		}
	}
</style>
