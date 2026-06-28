<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Heart from '@lucide/svelte/icons/heart';
	import Beef from '@lucide/svelte/icons/beef';
	import Droplet from '@lucide/svelte/icons/droplet';
	import Wheat from '@lucide/svelte/icons/wheat';
	import Plus from '@lucide/svelte/icons/plus';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import Cookie from '@lucide/svelte/icons/cookie';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import { toast } from '$lib/js/toast.svelte';
	import { detectFitnessLang, fitnessSlugs, m } from '$lib/js/fitnessI18n';
	import { localDateStr } from '$lib/js/localDate';
	import { NUTRIENT_META } from '$lib/data/dailyReferenceIntake';
	import RingGraph from '$lib/components/fitness/RingGraph.svelte';

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const s = $derived(fitnessSlugs(lang));
	const isEn = $derived(lang === 'en');

	const food = $derived(data.food);
	const dri = $derived(data.dri);
	const n = $derived(food.per100g);

	// --- Portion selector (USDA only) ---
	let selectedPortionIdx = $state(-1); // -1 = per 100g
	const portions = $derived(food.portions ?? []);
	const portionMultiplier = $derived(
		selectedPortionIdx >= 0 && portions[selectedPortionIdx]
			? portions[selectedPortionIdx].grams / 100
			: 1
	);
	const portionLabel = $derived(
		selectedPortionIdx >= 0 && portions[selectedPortionIdx]
			? `${portions[selectedPortionIdx].description} (${portions[selectedPortionIdx].grams}g)`
			: isEn ? 'per 100 g' : 'pro 100 g'
	);

	/**
	 * Scale a nutrient value by the selected portion
	 * @param {number | undefined | null} val
	 */
	function scaled(val) {
		return (val ?? 0) * portionMultiplier;
	}

	// --- Macro calorie percentages ---
	const macroPercent = $derived.by(() => {
		const proteinCal = n.protein * 4;
		const fatCal = n.fat * 9;
		const carbsCal = n.carbs * 4;
		const total = proteinCal + fatCal + carbsCal;
		if (total === 0) return { protein: 0, fat: 0, carbs: 0 };
		return {
			protein: Math.round(proteinCal / total * 100),
			fat: Math.round(fatCal / total * 100),
			carbs: 100 - Math.round(proteinCal / total * 100) - Math.round(fatCal / total * 100),
		};
	});

	// --- Formatting ---
	/** @param {number | undefined | null} v */
	function fmt(v) {
		if (v == null || isNaN(v)) return '0';
		if (v >= 100) return Math.round(v).toString();
		if (v >= 10) return v.toFixed(1);
		return v.toFixed(1);
	}

	// --- Micronutrient sections ---
	const mineralKeys = ['calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc'];
	const vitaminKeys = ['vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK', 'thiamin', 'riboflavin', 'niacin', 'vitaminB6', 'vitaminB12', 'folate'];
	const otherKeys = ['cholesterol'];

	/** @param {string[]} keys */
	function mkMicroRows(keys) {
		return keys.map((/** @type {string} */ k) => {
			const meta = NUTRIENT_META[/** @type {keyof typeof NUTRIENT_META} */ (k)];
			const value = scaled(/** @type {Record<string, number>} */ (n)[k]);
			const goal = /** @type {Record<string, number>} */ (dri)[k] ?? 0;
			const pct = goal > 0 ? Math.round(value / goal * 100) : 0;
			return { key: k, label: isEn ? meta.label : meta.labelDe, unit: meta.unit, value, goal, pct, isMax: meta.isMax };
		});
	}

	const microSections = $derived([
		{ title: isEn ? 'Minerals' : 'Mineralstoffe', rows: mkMicroRows(mineralKeys) },
		{ title: isEn ? 'Vitamins' : 'Vitamine', rows: mkMicroRows(vitaminKeys) },
		{ title: isEn ? 'Other' : 'Sonstiges', rows: mkMicroRows(otherKeys) },
	]);

	// --- Amino acids ---
	const AMINO_META = {
		leucine:       { en: 'Leucine',       de: 'Leucin' },
		isoleucine:    { en: 'Isoleucine',    de: 'Isoleucin' },
		valine:        { en: 'Valine',         de: 'Valin' },
		lysine:        { en: 'Lysine',         de: 'Lysin' },
		methionine:    { en: 'Methionine',     de: 'Methionin' },
		phenylalanine: { en: 'Phenylalanine',  de: 'Phenylalanin' },
		threonine:     { en: 'Threonine',      de: 'Threonin' },
		tryptophan:    { en: 'Tryptophan',     de: 'Tryptophan' },
		histidine:     { en: 'Histidine',      de: 'Histidin' },
		alanine:       { en: 'Alanine',        de: 'Alanin' },
		arginine:      { en: 'Arginine',       de: 'Arginin' },
		asparticAcid:  { en: 'Aspartic Acid',  de: 'Asparaginsäure' },
		cysteine:      { en: 'Cysteine',       de: 'Cystein' },
		glutamicAcid:  { en: 'Glutamic Acid',  de: 'Glutaminsäure' },
		glycine:       { en: 'Glycine',        de: 'Glycin' },
		proline:       { en: 'Proline',        de: 'Prolin' },
		serine:        { en: 'Serine',         de: 'Serin' },
		tyrosine:      { en: 'Tyrosine',       de: 'Tyrosin' },
	};

	const essentialOrder = ['leucine', 'isoleucine', 'valine', 'lysine', 'methionine', 'phenylalanine', 'threonine', 'tryptophan', 'histidine'];
	const nonEssentialOrder = ['alanine', 'arginine', 'asparticAcid', 'cysteine', 'glutamicAcid', 'glycine', 'proline', 'serine', 'tyrosine'];

	const hasAminos = $derived.by(() => {
		const nRec = /** @type {Record<string, number>} */ (n);
		return essentialOrder.some(k => (nRec[k] ?? 0) > 0) || nonEssentialOrder.some(k => (nRec[k] ?? 0) > 0);
	});

	const aminoRows = $derived(
		[...essentialOrder, ...nonEssentialOrder]
			.filter(k => (/** @type {Record<string, number>} */ (n)[k] ?? 0) > 0)
			.map(k => {
				const aminoKey = /** @type {keyof typeof AMINO_META} */ (k);
				return {
					key: k,
					label: isEn ? AMINO_META[aminoKey].en : AMINO_META[aminoKey].de,
					value: scaled(/** @type {Record<string, number>} */ (n)[k]),
					essential: essentialOrder.includes(k),
				};
			})
	);

	// --- Expand toggles ---
	let showMicros = $state(true);
	let showAminos = $state(false);

	// --- Favorite ---
	let favorited = $state(false);
	let favLoading = $state(false);

	$effect(() => {
		fetch('/api/fitness/favorite-ingredients').then(r => r.json()).then(data => {
			const foodId = food.id ?? /** @type {any} */ (food).sourceId;
			favorited = (data.favorites ?? []).some((/** @type {{ source: string; sourceId: string }} */ f) => f.source === food.source && f.sourceId === foodId);
		}).catch(() => {});
	});

	async function toggleFavorite() {
		favLoading = true;
		const id = food.id ?? /** @type {any} */ (food).sourceId;
		try {
			if (favorited) {
				await fetch('/api/fitness/favorite-ingredients', {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ source: food.source, sourceId: id }),
				});
				favorited = false;
			} else {
				await fetch('/api/fitness/favorite-ingredients', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ source: food.source, sourceId: id, name: food.name }),
				});
				favorited = true;
			}
		} catch {
			toast.error(isEn ? 'Failed to update favorite' : 'Fehler beim Aktualisieren');
		}
		favLoading = false;
	}

	// --- Log to today's diary ---
	/** @type {Array<'breakfast' | 'lunch' | 'dinner' | 'snack'>} */
	const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
	const mealMeta = {
		breakfast: { icon: Coffee, color: 'var(--nord13)' },
		lunch:     { icon: Sun, color: 'var(--nord12)' },
		dinner:    { icon: Moon, color: 'var(--nord15)' },
		snack:     { icon: Cookie, color: 'var(--nord14)' },
	};

	/** @returns {'breakfast' | 'lunch' | 'dinner' | 'snack'} */
	function defaultMealType() {
		const h = new Date().getHours();
		if (h >= 5 && h < 10) return 'breakfast';
		if (h >= 10 && h < 15) return 'lunch';
		if (h >= 15 && h < 17) return 'snack';
		return 'dinner';
	}

	let showLog = $state(false);
	/** @type {'breakfast' | 'lunch' | 'dinner' | 'snack'} */
	let logMealType = $state('lunch');
	let logGrams = $state(100);
	let logging = $state(false);

	const logPreviewCal = $derived(Math.round((n.calories ?? 0) * logGrams / 100));

	function openLog() {
		logMealType = defaultMealType();
		logGrams = selectedPortionIdx >= 0 && portions[selectedPortionIdx]
			? portions[selectedPortionIdx].grams
			: 100;
		showLog = true;
	}

	async function logFood() {
		if (logging || !(logGrams > 0)) return;
		logging = true;
		try {
			const res = await fetch('/api/fitness/food-log', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					date: localDateStr(),
					mealType: logMealType,
					name: food.nameDe ?? food.name,
					source: food.source,
					sourceId: food.id ?? /** @type {any} */ (food).sourceId,
					amountGrams: logGrams,
					per100g: n,
				}),
			});
			if (res.ok) {
				showLog = false;
				toast.success(isEn ? 'Added to today' : 'Zu heute hinzugefügt');
			} else {
				toast.error(isEn ? 'Failed to add food' : 'Fehler beim Hinzufügen');
			}
		} catch {
			toast.error(isEn ? 'Failed to add food' : 'Fehler beim Hinzufügen');
		}
		logging = false;
	}
</script>

<svelte:head>
	<title>{food.name} | {isEn ? 'Nutrition' : 'Ernährung'}</title>
</svelte:head>

<div class="food-detail">
	<!-- Recipe image -->
	{#if food.image}
		<div class="recipe-hero">
			<img src="https://bocken.org/static/rezepte/full/{food.image}" alt={food.nameDe ?? food.name} />
		</div>
	{/if}

	<!-- Header -->
	<header class="food-header">
		<div class="food-header-row">
			<h1>{food.nameDe ?? food.name}</h1>
			<button class="fav-btn" class:active={favorited} disabled={favLoading} onclick={toggleFavorite} aria-label={favorited ? 'Remove favorite' : 'Add favorite'}>
				<Heart size={20} fill={favorited ? 'var(--nord11)' : 'none'} color={favorited ? 'var(--nord11)' : 'var(--color-text-tertiary)'} />
			</button>
		</div>
		{#if food.nameEn && food.nameDe}
			<p class="name-alt">{food.nameEn}</p>
		{/if}
		<div class="badges">
			<span class="badge badge-source">{food.source === 'bls' ? 'BLS' : food.source === 'usda' ? 'USDA' : food.source === 'off' ? 'OFF' : food.source === 'custom' ? (isEn ? 'Custom Meal' : 'Eigene Mahlzeit') : isEn ? 'Recipe' : 'Rezept'}</span>
			<span class="badge badge-category">{food.category}</span>
			{#if food.brands}
				<span class="badge badge-category">{food.brands}</span>
			{/if}
			{#if food.nutriscore}
				<span class="badge badge-nutriscore" data-score={food.nutriscore.toLowerCase()}>Nutri-Score {food.nutriscore.toUpperCase()}</span>
			{/if}
			{#if food.recipeSlug}
				<a class="badge badge-recipe-link" href={resolve('/[recipeLang=recipeLang]/[name]', { recipeLang: isEn ? 'recipes' : 'rezepte', name: isEn && food.recipeSlugEn ? food.recipeSlugEn : food.recipeSlug })}>
					{isEn ? 'View recipe' : 'Zum Rezept'} <ExternalLink size={12} />
				</a>
			{/if}
		</div>
	</header>

	<!-- Portion selector (USDA only) -->
	{#if portions.length > 0}
		<div class="portion-selector">
			<label for="portion-select">{isEn ? 'Serving size' : 'Portionsgrösse'}</label>
			<select id="portion-select" bind:value={selectedPortionIdx}>
				<option value={-1}>{isEn ? 'Per 100 g' : 'Pro 100 g'}</option>
				{#each portions as portion, i}
					<option value={i}>{portion.description} ({portion.grams}g)</option>
				{/each}
			</select>
		</div>
	{/if}

	<!-- Calorie headline -->
	<div class="calorie-headline">
		<span class="cal-number">{Math.round(scaled(n.calories))}</span>
		<span class="cal-unit">kcal</span>
		<span class="cal-basis">{portionLabel}</span>
	</div>

	<!-- Macro rings -->
	<div class="macro-rings">
		{#each [
			{ pct: macroPercent.protein, label: isEn ? 'Protein' : 'Eiweiss', color: 'var(--nord14)', grams: scaled(n.protein), icon: Beef },
			{ pct: macroPercent.fat, label: isEn ? 'Fat' : 'Fett', color: 'var(--nord12)', grams: scaled(n.fat), icon: Droplet },
			{ pct: macroPercent.carbs, label: isEn ? 'Carbs' : 'Kohlenh.', color: 'var(--nord9)', grams: scaled(n.carbs), icon: Wheat },
		] as macro (macro.color)}
			{@const MacroIcon = macro.icon}
			<RingGraph
				percent={macro.pct}
				color={macro.color}
				label={macro.label}
				sublabel="{fmt(macro.grams)}g"
			>
				{#snippet labelIcon()}<MacroIcon size={12} />{/snippet}
			</RingGraph>
		{/each}
	</div>

	<!-- Macro detail grid -->
	<div class="macro-detail-card">
		<div class="detail-row">
			<span class="detail-name"><Beef size={12} /> {isEn ? 'Protein' : 'Eiweiss'}</span>
			<span class="detail-val">{fmt(scaled(n.protein))} g</span>
		</div>
		<div class="detail-row">
			<span class="detail-name"><Droplet size={12} /> {isEn ? 'Fat' : 'Fett'}</span>
			<span class="detail-val">{fmt(scaled(n.fat))} g</span>
		</div>
		<div class="detail-row sub">
			<span class="detail-name">{isEn ? 'Saturated Fat' : 'Ges. Fettsäuren'}</span>
			<span class="detail-val">{fmt(scaled(n.saturatedFat))} g</span>
		</div>
		<div class="detail-row">
			<span class="detail-name"><Wheat size={12} /> {isEn ? 'Carbohydrates' : 'Kohlenhydrate'}</span>
			<span class="detail-val">{fmt(scaled(n.carbs))} g</span>
		</div>
		<div class="detail-row sub">
			<span class="detail-name">{isEn ? 'Sugars' : 'Zucker'}</span>
			<span class="detail-val">{fmt(scaled(n.sugars))} g</span>
		</div>
		<div class="detail-row">
			<span class="detail-name">{isEn ? 'Fiber' : 'Ballaststoffe'}</span>
			<span class="detail-val">{fmt(scaled(n.fiber))} g</span>
		</div>
	</div>

	<!-- Ingredients (custom meals) -->
	{#if food.ingredients?.length}
		<div class="section-card">
			<h2>{isEn ? 'Ingredients' : 'Zutaten'} <small class="ingredient-total">({food.totalGrams}g {isEn ? 'total' : 'gesamt'})</small></h2>
			<div class="ingredients-list">
				{#each food.ingredients as ing}
					<div class="ingredient-row">
						<div class="ingredient-info">
							{#if ing.sourceId && (ing.source === 'bls' || ing.source === 'usda' || ing.source === 'off')}
								<a class="ingredient-name" href={resolve('/fitness/[nutrition=fitnessNutrition]/food/[source]/[id]', { nutrition: s.nutrition, source: ing.source, id: ing.sourceId })}>{ing.name}</a>
							{:else}
								<span class="ingredient-name">{ing.name}</span>
							{/if}
							<span class="ingredient-amount">{ing.amountGrams}g</span>
						</div>
						<div class="ingredient-macros">
							<span>{Math.round(ing.calories)} kcal</span>
							<span>{fmt(ing.protein)}<Beef size={10} /></span>
							<span>{fmt(ing.fat)}<Droplet size={10} /></span>
							<span>{fmt(ing.carbs)}<Wheat size={10} /></span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Micronutrients -->
	<div class="section-card">
		<button class="section-toggle" onclick={() => showMicros = !showMicros}>
			<h2>{isEn ? 'Micronutrients' : 'Mikronährstoffe'}</h2>
			<ChevronDown size={18} style={showMicros ? 'transform: rotate(180deg)' : ''} />
		</button>

		{#if showMicros}
			<div class="micro-details">
				{#each microSections as section}
					<div class="micro-section">
						<h4>{section.title}</h4>
						{#each section.rows as row}
							<div class="micro-row">
								<span class="micro-label">{row.label}</span>
								<div class="micro-bar-wrap">
									<div class="micro-bar" class:is-max={row.isMax} style="width: {Math.min(row.pct, 100)}%"></div>
								</div>
								<span class="micro-value">{fmt(row.value)} {row.unit}</span>
								<span class="micro-pct">{row.pct}%</span>
							</div>
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Amino Acids -->
	{#if hasAminos}
		<div class="section-card">
			<button class="section-toggle" onclick={() => showAminos = !showAminos}>
				<h2>{isEn ? 'Amino Acids' : 'Aminosäuren'}</h2>
				<ChevronDown size={18} style={showAminos ? 'transform: rotate(180deg)' : ''} />
			</button>

			{#if showAminos}
				<div class="amino-list">
					{#each aminoRows as row}
						<div class="amino-row" class:essential={row.essential}>
							<span class="amino-label">{row.label}</span>
							<span class="amino-value">{fmt(row.value)} g</span>
							{#if row.essential}
								<span class="amino-badge">{isEn ? 'essential' : 'essenziell'}</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Portions table (USDA only) -->
	{#if portions.length > 0}
		<div class="section-card">
			<h2>{isEn ? 'Common Serving Sizes' : 'Übliche Portionsgrössen'}</h2>
			<div class="portions-table">
				<div class="portions-header">
					<span>{isEn ? 'Serving' : 'Portion'}</span>
					<span>kcal</span>
					<span><Beef size={12} /></span>
					<span><Droplet size={12} /></span>
					<span><Wheat size={12} /></span>
				</div>
				{#each portions as portion}
					{@const m = portion.grams / 100}
					<div class="portions-row">
						<span class="portion-desc">{portion.description} <small>({portion.grams}g)</small></span>
						<span>{Math.round(n.calories * m)}</span>
						<span>{fmt(n.protein * m)}g</span>
						<span>{fmt(n.fat * m)}g</span>
						<span>{fmt(n.carbs * m)}g</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- FAB: add this food to today's diary -->
<ActionButton onclick={openLog} ariaLabel={isEn ? 'Add to today' : 'Zu heute hinzufügen'}>
	<svg class="icon_svg" xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z"/></svg>
</ActionButton>

<!-- Log modal -->
{#if showLog}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fab-overlay" onclick={() => (showLog = false)} onkeydown={(e) => e.key === 'Escape' && (showLog = false)}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fab-modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
			<div class="fab-modal-header">
				<h3>{t.add_food}</h3>
				<button class="fab-close" onclick={() => (showLog = false)}><Plus size={18} style="transform: rotate(45deg)" /></button>
			</div>

			<p class="log-food-name">{food.nameDe ?? food.name}</p>

			<!-- Meal type selector -->
			<div class="fab-meal-select">
				{#each mealTypes as meal (meal)}
					{@const meta = mealMeta[meal]}
					{@const MealIcon = meta.icon}
					<button
						class="fab-meal-btn"
						class:active={logMealType === meal}
						style="--mc: {meta.color}"
						onclick={() => (logMealType = meal)}
					>
						<MealIcon size={14} />
						<span>{t[meal]}</span>
					</button>
				{/each}
			</div>

			<!-- Portion quick-select (USDA / OFF only) -->
			{#if portions.length > 0}
				<select class="log-portion-select" onchange={(e) => (logGrams = Number(e.currentTarget.value))}>
					<option value="100">{isEn ? 'Per 100 g' : 'Pro 100 g'}</option>
					{#each portions as portion, i (i)}
						<option value={portion.grams}>{portion.description} ({portion.grams}g)</option>
					{/each}
				</select>
			{/if}

			<!-- Amount -->
			<form class="log-amount-row" onsubmit={(e) => { e.preventDefault(); logFood(); }}>
				<input type="number" class="log-amount-input" bind:value={logGrams} min="1" step="1" />
				<span class="log-amount-unit">g</span>
				<span class="log-amount-cal">{logPreviewCal} kcal</span>
			</form>

			<button class="log-confirm" disabled={logging || !(logGrams > 0)} onclick={logFood}>
				<Plus size={16} />
				{t.log_food}
			</button>
		</div>
	</div>
{/if}

<style>
	.food-detail {
		max-width: 600px;
		margin: 0 auto;
		padding: 1rem;
	}

	/* Recipe hero image */
	.recipe-hero {
		border-radius: 12px;
		overflow: hidden;
		margin-bottom: 1rem;
	}
	.recipe-hero img {
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		display: block;
	}

	/* Header */
	.food-header {
		margin-bottom: 1rem;
	}
	.food-header-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.food-header h1 {
		font-size: 1.4rem;
		margin: 0 0 0.25rem;
		color: var(--color-text-primary);
		line-height: 1.3;
	}
	.fav-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.3rem;
		border-radius: 50%;
		flex-shrink: 0;
		transition: background 0.15s;
		-webkit-tap-highlight-color: transparent;
	}
	.fav-btn:hover {
		background: var(--color-bg-elevated);
	}
	.fav-btn:disabled {
		opacity: 0.5;
	}
	.name-alt {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
		color: var(--color-text-tertiary);
	}
	.badges {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.badge {
		display: inline-block;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.badge-source {
		background: var(--nord10);
		color: #fff;
	}
	.badge-category {
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
	}
	.badge-nutriscore {
		color: #fff;
		font-weight: 700;
	}
	.badge-nutriscore[data-score="a"] { background: #038141; }
	.badge-nutriscore[data-score="b"] { background: #85bb2f; color: #222; }
	.badge-nutriscore[data-score="c"] { background: #fecb02; color: #222; }
	.badge-nutriscore[data-score="d"] { background: #ee8100; }
	.badge-nutriscore[data-score="e"] { background: #e63e11; }
	.badge-recipe-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background: var(--color-bg-tertiary);
		color: var(--color-primary);
		border: 1px solid var(--color-border);
		text-decoration: none;
		cursor: pointer;
	}
	.badge-recipe-link:hover {
		background: var(--color-bg-elevated);
	}

	/* Portion selector */
	.portion-selector {
		margin-bottom: 1rem;
	}
	.portion-selector label {
		display: block;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.25rem;
	}
	.portion-selector select {
		width: 100%;
		padding: 0.4rem 0.5rem;
		border-radius: 6px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		font-size: 0.9rem;
	}

	/* Calorie headline */
	.calorie-headline {
		text-align: center;
		margin-bottom: 1rem;
	}
	.cal-number {
		font-size: 2.8rem;
		font-weight: 800;
		color: var(--color-text-primary);
		line-height: 1;
	}
	.cal-unit {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		margin-left: 0.25rem;
	}
	.cal-basis {
		display: block;
		font-size: 0.8rem;
		color: var(--color-text-tertiary);
		margin-top: 0.15rem;
	}

	/* Macro rings */
	.macro-rings {
		display: flex;
		justify-content: space-around;
		margin: 0 0 1.25rem;
	}
	.macro-rings :global(.ring-svg) {
		width: 90px;
		height: 90px;
	}

	/* Macro detail card */
	.macro-detail-card {
		background: var(--color-surface);
		border-radius: 10px;
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		border: 1px solid var(--color-border);
	}
	.detail-row {
		display: flex;
		justify-content: space-between;
		padding: 0.35rem 0;
		border-bottom: 1px solid var(--color-border);
	}
	.detail-row:last-child {
		border-bottom: none;
	}
	.detail-row.sub .detail-name {
		padding-left: 1rem;
		color: var(--color-text-tertiary);
		font-size: 0.85rem;
	}
	.detail-name {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		color: var(--color-text-primary);
		font-weight: 500;
	}
	.detail-val {
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}

	/* Section cards */
	.section-card {
		background: var(--color-surface);
		border-radius: 10px;
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		border: 1px solid var(--color-border);
	}
	.section-card h2 {
		font-size: 1rem;
		margin: 0;
		color: var(--color-text-primary);
	}
	.section-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		color: var(--color-text-primary);
	}

	/* Micro details */
	.micro-details {
		margin-top: 0.75rem;
	}
	.micro-section {
		margin-bottom: 0.75rem;
	}
	.micro-section h4 {
		margin: 0 0 0.4rem;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-secondary);
	}
	.micro-row {
		display: grid;
		grid-template-columns: 7rem 1fr 4rem 2.5rem;
		gap: 0.5rem;
		align-items: center;
		padding: 0.2rem 0;
		font-size: 0.78rem;
	}
	.micro-label {
		color: var(--color-text-primary);
		font-weight: 500;
	}
	.micro-bar-wrap {
		height: 5px;
		background: var(--color-bg-tertiary);
		border-radius: 3px;
		overflow: hidden;
	}
	.micro-bar {
		height: 100%;
		background: var(--nord14);
		border-radius: 3px;
		transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.micro-bar.is-max {
		background: var(--nord12);
	}
	.micro-value {
		text-align: right;
		color: var(--color-text-tertiary);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.micro-pct {
		text-align: right;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-secondary);
	}

	/* Amino acids */
	.amino-list {
		margin-top: 0.75rem;
	}
	.amino-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.3rem 0;
		border-bottom: 1px solid var(--color-border);
		font-size: 0.85rem;
	}
	.amino-row:last-child {
		border-bottom: none;
	}
	.amino-label {
		flex: 1;
		color: var(--color-text-primary);
	}
	.amino-value {
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}
	.amino-badge {
		font-size: 0.65rem;
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		background: var(--nord14);
		color: #fff;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	/* Portions table */
	.portions-table {
		margin-top: 0.5rem;
		font-size: 0.82rem;
	}
	.portions-header, .portions-row {
		display: grid;
		grid-template-columns: 1fr 3.5rem 3.5rem 3.5rem 3.5rem;
		gap: 0.25rem;
		padding: 0.35rem 0;
	}
	.portions-header {
		font-weight: 700;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-secondary);
		border-bottom: 2px solid var(--color-border);
	}
	.portions-row {
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-primary);
	}
	.portions-row:last-child {
		border-bottom: none;
	}
	.portions-row span:not(.portion-desc) {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.portion-desc {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.portion-desc small {
		color: var(--color-text-tertiary);
	}

	/* Ingredients (custom meals) */
	.ingredient-total {
		font-size: 0.8rem;
		font-weight: 400;
		color: var(--color-text-tertiary);
	}
	.ingredients-list {
		margin-top: 0.5rem;
	}
	.ingredient-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.4rem 0;
		border-bottom: 1px solid var(--color-border);
		gap: 0.5rem;
	}
	.ingredient-row:last-child {
		border-bottom: none;
	}
	.ingredient-info {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		min-width: 0;
		flex: 1;
	}
	.ingredient-name {
		color: var(--color-text-primary);
		font-weight: 500;
		font-size: 0.85rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	a.ingredient-name {
		color: var(--color-primary);
		text-decoration: none;
	}
	a.ingredient-name:hover {
		text-decoration: underline;
	}
	.ingredient-amount {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		flex-shrink: 0;
	}
	.ingredient-macros {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
	}
	.ingredient-macros span {
		display: flex;
		align-items: center;
		gap: 0.1rem;
	}

	@media (max-width: 500px) {
		.micro-row {
			grid-template-columns: 5.5rem 1fr 3.5rem 2.2rem;
			gap: 0.3rem;
			font-size: 0.72rem;
		}
		.portions-header, .portions-row {
			grid-template-columns: 1fr 3rem 3rem 3rem 3rem;
			font-size: 0.72rem;
		}
	}

	/* ── Log modal ── */
	.fab-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		z-index: 200;
		animation: fade-in 0.15s ease;
	}
	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	.fab-modal {
		background: var(--color-surface);
		border-radius: 16px 16px 0 0;
		width: 100%;
		max-width: 500px;
		max-height: 85vh;
		overflow-y: auto;
		padding: 1rem 1.25rem 1.5rem;
		animation: slide-up 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	@keyframes slide-up {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}
	.fab-modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.fab-modal-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}
	.fab-close {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.3rem;
		border-radius: 50%;
		display: flex;
		transition: background 0.12s;
	}
	.fab-close:hover {
		background: var(--color-bg-elevated);
	}
	.log-food-name {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}
	.fab-meal-select {
		display: flex;
		gap: 0.35rem;
	}
	.fab-meal-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.55rem 0.25rem;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		background: var(--color-bg-tertiary);
		cursor: pointer;
		color: var(--color-text-secondary);
		font-size: 0.68rem;
		font-weight: 600;
		transition: border-color 0.15s, color 0.15s, background 0.15s;
	}
	.fab-meal-btn.active {
		border-color: var(--mc);
		color: var(--mc);
		background: color-mix(in srgb, var(--mc) 8%, var(--color-bg-tertiary));
	}
	.fab-meal-btn:hover:not(.active) {
		border-color: var(--color-text-secondary);
	}
	.log-portion-select {
		width: 100%;
		padding: 0.5rem;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		font-size: 0.9rem;
	}
	.log-amount-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.log-amount-input {
		flex: 1;
		min-width: 0;
		padding: 0.5rem 0.6rem;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
	}
	.log-amount-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.log-amount-unit {
		font-size: 0.9rem;
		color: var(--color-text-secondary);
	}
	.log-amount-cal {
		margin-left: auto;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}
	.log-confirm {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.7rem;
		border: none;
		border-radius: 10px;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.15s;
	}
	.log-confirm:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}
	.log-confirm:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
