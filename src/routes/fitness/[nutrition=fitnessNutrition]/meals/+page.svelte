<script>
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import { ChevronLeft, Plus, Trash2, Pencil, UtensilsCrossed, X } from 'lucide-svelte';
	import { detectFitnessLang, fitnessSlugs, t } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';
	import FoodSearch from '$lib/components/fitness/FoodSearch.svelte';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const s = $derived(fitnessSlugs(lang));
	const isEn = $derived(lang === 'en');

	// --- Meals state ---
	let meals = $state([]);
	let loading = $state(true);

	// --- Form state ---
	let editing = $state(false);
	let editingId = $state(null);
	let mealName = $state('');
	let ingredients = $state([]);
	let saving = $state(false);

	let showSearch = $state(false);

	// --- Load meals ---
	async function loadMeals() {
		loading = true;
		try {
			const res = await fetch('/api/fitness/custom-meals');
			if (res.ok) {
				const data = await res.json();
				meals = data.meals ?? [];
			}
		} catch {
			toast.error(isEn ? 'Failed to load meals' : 'Fehler beim Laden');
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		untrack(() => loadMeals());
	});

	// --- Computed ---
	function mealTotalCal(meal) {
		return meal.ingredients.reduce((sum, ing) => sum + (ing.per100g?.calories ?? 0) * ing.amountGrams / 100, 0);
	}

	function ingredientsTotalNutrition(ings) {
		let calories = 0, protein = 0, fat = 0, carbs = 0;
		for (const ing of ings) {
			const f = ing.amountGrams / 100;
			calories += (ing.per100g?.calories ?? 0) * f;
			protein += (ing.per100g?.protein ?? 0) * f;
			fat += (ing.per100g?.fat ?? 0) * f;
			carbs += (ing.per100g?.carbs ?? 0) * f;
		}
		return { calories, protein, fat, carbs };
	}

	const formTotals = $derived(ingredientsTotalNutrition(ingredients));

	function addIngredient(food) {
		ingredients = [...ingredients, food];
		showSearch = false;
	}

	function removeIngredient(index) {
		ingredients = ingredients.filter((_, i) => i !== index);
	}

	// --- CRUD ---
	function startCreate() {
		editing = true;
		editingId = null;
		mealName = '';
		ingredients = [];
		showSearch = false;
	}

	function startEdit(meal) {
		editing = true;
		editingId = meal._id;
		mealName = meal.name;
		ingredients = meal.ingredients.map(i => ({ ...i }));
		showSearch = false;
	}

	function cancelEdit() {
		editing = false;
		editingId = null;
		mealName = '';
		ingredients = [];
		showSearch = false;
	}

	async function saveMeal() {
		if (!mealName.trim() || ingredients.length === 0) return;
		saving = true;
		try {
			const body = { name: mealName.trim(), ingredients };
			const url = editingId
				? `/api/fitness/custom-meals/${editingId}`
				: '/api/fitness/custom-meals';
			const method = editingId ? 'PUT' : 'POST';

			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (res.ok) {
				toast.success(isEn ? 'Meal saved' : 'Mahlzeit gespeichert');
				cancelEdit();
				await loadMeals();
			} else {
				toast.error(isEn ? 'Failed to save' : 'Speichern fehlgeschlagen');
			}
		} catch {
			toast.error(isEn ? 'Failed to save' : 'Speichern fehlgeschlagen');
		} finally {
			saving = false;
		}
	}

	async function deleteMeal(meal) {
		if (!confirm(t('delete_meal_confirm', lang))) return;
		try {
			const res = await fetch(`/api/fitness/custom-meals/${meal._id}`, { method: 'DELETE' });
			if (res.ok) {
				meals = meals.filter(m => m._id !== meal._id);
				toast.success(isEn ? 'Meal deleted' : 'Mahlzeit gelöscht');
			}
		} catch {
			toast.error(isEn ? 'Failed to delete' : 'Löschen fehlgeschlagen');
		}
	}

	function fmt(v) {
		return v >= 100 ? Math.round(v).toString() : v.toFixed(1);
	}
</script>

<svelte:head>
	<title>{t('custom_meals', lang)} — Fitness</title>
</svelte:head>

<div class="meals-page">
	<!-- Header -->
	<div class="header">
		<a href="/fitness/{s.nutrition}" class="back-link">
			<ChevronLeft size={20} />
			<span>{t('custom_meals', lang)}</span>
		</a>
		{#if !editing}
			<button class="create-btn" onclick={startCreate}>
				<Plus size={18} />
				<span>{t('new_meal', lang)}</span>
			</button>
		{/if}
	</div>

	{#if loading}
		<div class="loading-state">
			<p>{t('loading', lang)}</p>
		</div>
	{:else if editing}
		<!-- Create/Edit Form -->
		<div class="form-card">
			<h2 class="form-title">{editingId ? t('edit', lang) : t('new_meal', lang)}</h2>

			<label class="field-label">{t('meal_name', lang)}</label>
			<input
				type="text"
				class="text-input"
				bind:value={mealName}
				placeholder={t('meal_name', lang)}
			/>

			<!-- Ingredients list -->
			<label class="field-label">{t('ingredients', lang)} ({ingredients.length})</label>
			{#if ingredients.length > 0}
				<div class="ingredients-list">
					{#each ingredients as ing, i}
						{@const sp = ing.selectedPortion}
						{@const displayQty = sp ? Math.round((ing.amountGrams / sp.grams) * 10) / 10 : ing.amountGrams}
						{@const displayUnit = sp ? sp.description : 'g'}
						<div class="ingredient-row">
							<div class="ingredient-info">
								<div class="ingredient-name-row">
									<span class="ingredient-name">{ing.name}</span>
									{#if ing.source !== 'custom'}
										<span class="source-tag">{ing.source === 'bls' ? 'BLS' : 'USDA'}</span>
									{/if}
								</div>
								<div class="ingredient-edit-row">
									<input
										type="number"
										class="inline-amount"
										value={displayQty}
										min="0.1"
										step={sp ? '0.5' : '1'}
										onchange={(e) => {
											const qty = Number(e.target.value) || 1;
											ingredients[i].amountGrams = sp ? Math.round(qty * sp.grams) : qty;
											ingredients = [...ingredients];
										}}
									/>
									{#if ing.portions?.length > 0}
										<select class="inline-portion" value={sp ? ing.portions.findIndex(p => p.description === sp.description) : -1} onchange={(e) => {
											const idx = Number(e.target.value);
											const oldGrams = ing.amountGrams;
											if (idx >= 0) {
												const portion = ing.portions[idx];
												ingredients[i].selectedPortion = portion;
												// Convert current grams to new unit, round to nearest 0.5
												const qty = Math.round((oldGrams / portion.grams) * 2) / 2 || 1;
												ingredients[i].amountGrams = Math.round(qty * portion.grams);
											} else {
												ingredients[i].selectedPortion = undefined;
											}
											ingredients = [...ingredients];
										}}>
											<option value={-1}>g</option>
											{#each ing.portions as p, pi}
												<option value={pi}>{p.description} ({Math.round(p.grams)}g)</option>
											{/each}
										</select>
									{:else}
										<span class="ingredient-unit">{displayUnit}</span>
									{/if}
									<span class="ingredient-cal">
										{#if sp}<span class="ingredient-grams">{ing.amountGrams}g ·</span>{/if}
										{fmt((ing.per100g?.calories ?? 0) * ing.amountGrams / 100)} {t('kcal', lang)}
									</span>
								</div>
							</div>
							<button class="icon-btn danger" onclick={() => removeIngredient(i)} aria-label="Remove">
								<X size={16} />
							</button>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Totals -->
			{#if ingredients.length > 0}
				<div class="totals-bar">
					<span class="total-label">{t('total', lang)}</span>
					<span class="total-macro">{Math.round(formTotals.calories)} {t('kcal', lang)}</span>
					<span class="total-macro protein">{fmt(formTotals.protein)}g P</span>
					<span class="total-macro fat">{fmt(formTotals.fat)}g F</span>
					<span class="total-macro carbs">{fmt(formTotals.carbs)}g C</span>
				</div>
			{/if}

			<!-- Add ingredient -->
			{#if !showSearch}
				<button class="add-ingredient-btn" onclick={() => { showSearch = true; }}>
					<Plus size={16} />
					<span>{t('add_ingredient', lang)}</span>
				</button>
			{:else}
				<div class="search-section">
					<FoodSearch
						onselect={addIngredient}
						oncancel={() => { showSearch = false; }}
						showDetailLinks={false}
						confirmLabel={t('add_ingredient', lang)}
					/>
				</div>
			{/if}

			<!-- Actions -->
			<div class="form-actions">
				<button class="btn secondary" onclick={cancelEdit}>{t('cancel', lang)}</button>
				<button
					class="btn primary"
					onclick={saveMeal}
					disabled={saving || !mealName.trim() || ingredients.length === 0}
				>
					{saving ? t('loading', lang) : t('save_meal', lang)}
				</button>
			</div>
		</div>
	{:else if meals.length === 0}
		<!-- Empty state -->
		<div class="empty-state">
			<UtensilsCrossed size={48} strokeWidth={1.2} />
			<p class="empty-title">{t('no_custom_meals', lang)}</p>
			<p class="empty-hint">{t('create_meal_hint', lang)}</p>
		</div>
	{:else}
		<!-- Meal cards -->
		<div class="meals-list">
			{#each meals as meal, i}
				<div class="meal-card" style="animation-delay: {i * 50}ms">
					<div class="meal-header">
						<div class="meal-info">
							<h3 class="meal-name">{meal.name}</h3>
							<span class="meal-meta">
								{meal.ingredients.length} {t('ingredients', lang)} — {Math.round(mealTotalCal(meal))} {t('kcal', lang)}
							</span>
						</div>
						<div class="meal-actions">
							<button class="icon-btn" onclick={() => startEdit(meal)} aria-label={t('edit', lang)}>
								<Pencil size={16} />
							</button>
							<button class="icon-btn danger" onclick={() => deleteMeal(meal)} aria-label={t('delete_', lang)}>
								<Trash2 size={16} />
							</button>
						</div>
					</div>
					<div class="meal-ingredients">
						{#each meal.ingredients as ing}
							<span class="ing-chip">{ing.name} ({ing.amountGrams}g)</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.meals-page {
		max-width: 600px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding-bottom: 2rem;
	}

	@keyframes fade-up {
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* ── Header ── */
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		animation: fade-up 0.3s ease both;
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--color-text-primary);
		text-decoration: none;
		font-size: 1.1rem;
		font-weight: 700;
		padding: 0.35rem 0;
		transition: color 0.15s;
	}
	.back-link:hover {
		color: var(--nord8);
	}

	.create-btn {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: var(--nord8);
		color: #fff;
		border: none;
		border-radius: 8px;
		padding: 0.5rem 0.85rem;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}
	.create-btn:hover {
		background: var(--nord10);
	}

	/* ── Loading ── */
	.loading-state {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--color-text-secondary);
		animation: fade-up 0.3s ease both;
	}

	/* ── Empty state ── */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		color: var(--color-text-tertiary);
		animation: fade-up 0.35s ease both;
	}
	.empty-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		margin: 0;
	}
	.empty-hint {
		font-size: 0.85rem;
		margin: 0;
	}

	/* ── Meal cards ── */
	.meals-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.meal-card {
		background: var(--color-surface);
		border-radius: 12px;
		padding: 1rem 1.1rem;
		box-shadow: var(--shadow-sm);
		animation: fade-up 0.35s ease both;
	}

	.meal-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.meal-info {
		flex: 1;
		min-width: 0;
	}

	.meal-name {
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
		line-height: 1.3;
	}

	.meal-meta {
		font-size: 0.78rem;
		color: var(--color-text-secondary);
	}

	.meal-actions {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.meal-ingredients {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-top: 0.6rem;
	}

	.ing-chip {
		font-size: 0.72rem;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		white-space: nowrap;
	}

	/* ── Icon button ── */
	.icon-btn {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.4rem;
		border-radius: 6px;
		display: flex;
		align-items: center;
		transition: color 0.15s, background 0.15s;
	}
	.icon-btn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.icon-btn.danger:hover {
		color: var(--nord11);
		background: color-mix(in srgb, var(--nord11) 10%, transparent);
	}

	/* ── Form card ── */
	.form-card {
		background: var(--color-surface);
		border-radius: 12px;
		padding: 1.25rem;
		box-shadow: var(--shadow-sm);
		animation: fade-up 0.35s ease both;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.form-title {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.field-label {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin: 0;
	}

	.text-input {
		width: 100%;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 0.55rem 0.75rem;
		font-size: 0.9rem;
		color: var(--color-text-primary);
		outline: none;
		transition: border-color 0.15s;
		box-sizing: border-box;
	}
	.text-input:focus {
		border-color: var(--nord8);
	}

	/* ── Ingredients in form ── */
	.ingredients-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.ingredient-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		background: var(--color-bg-tertiary);
		padding: 0.5rem 0.65rem;
		border-radius: 8px;
	}

	.ingredient-info {
		flex: 1;
		min-width: 0;
	}

	.ingredient-name {
		display: block;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ingredient-name-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.source-tag {
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--color-text-tertiary);
		background: var(--color-bg-elevated);
		padding: 0.05rem 0.3rem;
		border-radius: 3px;
		flex-shrink: 0;
	}
	.ingredient-edit-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-top: 0.15rem;
		flex-wrap: wrap;
	}
	.inline-amount {
		width: 3.5rem;
		padding: 0.2rem 0.35rem;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: 5px;
		color: var(--color-text-primary);
		font-size: 0.78rem;
		font-variant-numeric: tabular-nums;
		text-align: right;
		box-sizing: border-box;
	}
	.inline-amount:focus {
		outline: none;
		border-color: var(--nord8);
	}
	.inline-portion {
		padding: 0.2rem 0.3rem;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: 5px;
		color: var(--color-text-secondary);
		font-size: 0.72rem;
		max-width: 9rem;
	}
	.inline-portion:focus {
		outline: none;
		border-color: var(--nord8);
	}
	.ingredient-unit {
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
	}
	.ingredient-cal {
		font-size: 0.72rem;
		color: var(--color-text-secondary);
		margin-left: auto;
	}

	/* ── Totals bar ── */
	.totals-bar {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		background: color-mix(in srgb, var(--nord8) 8%, transparent);
		padding: 0.55rem 0.75rem;
		border-radius: 8px;
		font-size: 0.78rem;
		font-weight: 600;
	}

	.total-label {
		color: var(--color-text-secondary);
		margin-right: auto;
	}

	.total-macro {
		color: var(--color-text-primary);
	}
	.total-macro.protein { color: var(--nord14); }
	.total-macro.fat { color: var(--nord12); }
	.total-macro.carbs { color: var(--nord9); }

	/* ── Add ingredient button ── */
	.add-ingredient-btn {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: none;
		border: 1.5px dashed var(--color-border);
		border-radius: 8px;
		padding: 0.55rem 0.75rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
		justify-content: center;
	}
	.add-ingredient-btn:hover {
		color: var(--nord8);
		border-color: var(--nord8);
	}

	/* ── Search section ── */
	.search-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.ingredient-grams {
		color: var(--color-text-tertiary);
		font-size: 0.65rem;
	}

	/* ── Form actions ── */
	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.btn {
		border: none;
		border-radius: 8px;
		padding: 0.55rem 1.1rem;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s, opacity 0.15s;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.btn.primary {
		background: var(--nord8);
		color: #fff;
	}
	.btn.primary:hover:not(:disabled) {
		background: var(--nord10);
	}
	.btn.secondary {
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
	}
	.btn.secondary:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
</style>
