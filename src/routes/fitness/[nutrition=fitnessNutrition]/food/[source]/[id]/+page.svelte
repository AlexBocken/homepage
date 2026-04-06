<script>
	import { page } from '$app/stores';
	import { ChevronLeft, ChevronDown } from '@lucide/svelte';
	import { detectFitnessLang, fitnessSlugs, t } from '$lib/js/fitnessI18n';
	import { NUTRIENT_META } from '$lib/data/dailyReferenceIntake';

	let { data } = $props();

	const lang = $derived(detectFitnessLang($page.url.pathname));
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

	/** Scale a nutrient value by the selected portion */
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

	// --- SVG ring constants (same as NutritionSummary) ---
	const RADIUS = 28;
	const ARC_DEGREES = 300;
	const ARC_LENGTH = (ARC_DEGREES / 360) * 2 * Math.PI * RADIUS;
	const ARC_ROTATE = 120;

	function strokeOffset(percent) {
		return ARC_LENGTH - (percent / 100) * ARC_LENGTH;
	}

	// --- Formatting ---
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

	function mkMicroRows(keys) {
		return keys.map(k => {
			const meta = NUTRIENT_META[k];
			const value = scaled(n[k]);
			const goal = dri[k] ?? 0;
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
		return essentialOrder.some(k => (n[k] ?? 0) > 0) || nonEssentialOrder.some(k => (n[k] ?? 0) > 0);
	});

	const aminoRows = $derived(
		[...essentialOrder, ...nonEssentialOrder]
			.filter(k => (n[k] ?? 0) > 0)
			.map(k => ({
				key: k,
				label: isEn ? AMINO_META[k].en : AMINO_META[k].de,
				value: scaled(n[k]),
				essential: essentialOrder.includes(k),
			}))
	);

	// --- Expand toggles ---
	let showMicros = $state(true);
	let showAminos = $state(false);
</script>

<svelte:head>
	<title>{food.name} | {isEn ? 'Nutrition' : 'Ernährung'}</title>
</svelte:head>

<div class="food-detail">
	<!-- Back link -->
	<a class="back-link" href="/fitness/{s.nutrition}">
		<ChevronLeft size={16} />
		{t('nutrition_title', lang)}
	</a>

	<!-- Header -->
	<header class="food-header">
		<h1>{food.nameDe ?? food.name}</h1>
		{#if food.nameEn && food.nameDe}
			<p class="name-alt">{food.nameEn}</p>
		{/if}
		<div class="badges">
			<span class="badge badge-source">{food.source === 'bls' ? 'BLS' : 'USDA'}</span>
			<span class="badge badge-category">{food.category}</span>
		</div>
	</header>

	<!-- Portion selector (USDA only) -->
	{#if portions.length > 0}
		<div class="portion-selector">
			<label for="portion-select">{isEn ? 'Serving size' : 'Portionsgröße'}</label>
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
			{ pct: macroPercent.protein, label: isEn ? 'Protein' : 'Eiweiß', cls: 'ring-protein', grams: scaled(n.protein) },
			{ pct: macroPercent.fat, label: isEn ? 'Fat' : 'Fett', cls: 'ring-fat', grams: scaled(n.fat) },
			{ pct: macroPercent.carbs, label: isEn ? 'Carbs' : 'Kohlenh.', cls: 'ring-carbs', grams: scaled(n.carbs) },
		] as macro}
			<div class="macro-ring">
				<svg width="90" height="90" viewBox="0 0 70 70">
					<circle
						class="ring-bg"
						cx="35" cy="35" r={RADIUS}
						stroke-dasharray="{ARC_LENGTH} {2 * Math.PI * RADIUS}"
						transform="rotate({ARC_ROTATE} 35 35)"
					/>
					<circle
						class="ring-fill {macro.cls}"
						cx="35" cy="35" r={RADIUS}
						stroke-dasharray="{ARC_LENGTH} {2 * Math.PI * RADIUS}"
						stroke-dashoffset={strokeOffset(macro.pct)}
						transform="rotate({ARC_ROTATE} 35 35)"
					/>
					<text class="ring-text" x="35" y="35">{macro.pct}%</text>
				</svg>
				<span class="macro-label">{macro.label}</span>
				<span class="macro-grams">{fmt(macro.grams)}g</span>
			</div>
		{/each}
	</div>

	<!-- Macro detail grid -->
	<div class="macro-detail-card">
		<div class="detail-row">
			<span class="detail-name">{isEn ? 'Protein' : 'Eiweiß'}</span>
			<span class="detail-val">{fmt(scaled(n.protein))} g</span>
		</div>
		<div class="detail-row">
			<span class="detail-name">{isEn ? 'Fat' : 'Fett'}</span>
			<span class="detail-val">{fmt(scaled(n.fat))} g</span>
		</div>
		<div class="detail-row sub">
			<span class="detail-name">{isEn ? 'Saturated Fat' : 'Ges. Fettsäuren'}</span>
			<span class="detail-val">{fmt(scaled(n.saturatedFat))} g</span>
		</div>
		<div class="detail-row">
			<span class="detail-name">{isEn ? 'Carbohydrates' : 'Kohlenhydrate'}</span>
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
			<h2>{isEn ? 'Common Serving Sizes' : 'Übliche Portionsgrößen'}</h2>
			<div class="portions-table">
				<div class="portions-header">
					<span>{isEn ? 'Serving' : 'Portion'}</span>
					<span>kcal</span>
					<span>{isEn ? 'Protein' : 'Eiweiß'}</span>
					<span>{isEn ? 'Fat' : 'Fett'}</span>
					<span>{isEn ? 'Carbs' : 'KH'}</span>
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

<style>
	.food-detail {
		max-width: 600px;
		margin: 0 auto;
		padding: 1rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: 0.85rem;
		margin-bottom: 0.75rem;
	}
	.back-link:hover {
		color: var(--color-text-primary);
	}

	/* Header */
	.food-header {
		margin-bottom: 1rem;
	}
	.food-header h1 {
		font-size: 1.4rem;
		margin: 0 0 0.25rem;
		color: var(--color-text-primary);
		line-height: 1.3;
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
	.macro-ring {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		flex: 1;
	}
	.ring-bg {
		fill: none;
		stroke: var(--color-border);
		stroke-width: 5;
		stroke-linecap: round;
	}
	.ring-fill {
		fill: none;
		stroke-width: 5;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.4s ease;
	}
	.ring-text {
		font-size: 14px;
		font-weight: 700;
		fill: currentColor;
		text-anchor: middle;
		dominant-baseline: central;
	}
	.ring-protein { stroke: var(--nord14); }
	.ring-fat { stroke: var(--nord12); }
	.ring-carbs { stroke: var(--nord9); }

	.macro-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-primary);
		text-align: center;
	}
	.macro-grams {
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
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
</style>
