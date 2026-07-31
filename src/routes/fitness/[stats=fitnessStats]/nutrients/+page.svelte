<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Beef from '@lucide/svelte/icons/beef';
	import Droplet from '@lucide/svelte/icons/droplet';
	import Wheat from '@lucide/svelte/icons/wheat';
	import StatsRingGraph from '$lib/components/fitness/StatsRingGraph.svelte';
	import DriSourceInfo from '$lib/components/fitness/DriSourceInfo.svelte';
	import CompositionBar from '$lib/components/fitness/CompositionBar.svelte';
	import { fatCompositionRows, fatCompositionNote } from '$lib/fitness/fatComposition';
	import { detectFitnessLang, fitnessSlugs, m } from '$lib/js/fitnessI18n';
	import { formatGrams as fmt } from '$lib/fitness/nutritionMath';
	import {
		getDRI, NUTRIENT_META, aminoDri, AMINO_DRI_REFERENCE_WEIGHT, UPPER_LIMITS, REFERENCE_ENERGY
	} from '$lib/data/dailyReferenceIntake';
	import { TRACE_MINERAL_KEYS, traceCoverageNote } from '$lib/fitness/traceMinerals';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const isEn = $derived(lang === 'en');
	const statsSlug = $derived(fitnessSlugs(lang).stats);

	const mn = $derived(data.micronutrients ?? { micros: {}, aminos: {}, fats: {}, composition: null, fatCoverage: 1, daysTracked: 0, sex: 'male', weight: null, dailyCalories: null });
	const ns = $derived(data.nutritionStats ?? {});
	const daysTracked = $derived(mn.daysTracked ?? 0);

	// Open Food Facts entries ship macros only, so anything logged from them is
	// missing from every figure below.
	const coverage = $derived(mn.coverage ?? { ratios: { minerals: 1, vitamins: 1, aminos: 1 }, missing: [] });
	/** Per-group share of logged calories whose source publishes no figures. */
	const coverageRows = $derived(
		/** @type {const} */ (['minerals', 'vitamins', 'aminos']).map(g => ({
			key: g,
			label: { minerals: isEn ? 'Minerals' : 'Mineralstoffe', vitamins: isEn ? 'Vitamins' : 'Vitamine', aminos: isEn ? 'Amino acids' : 'Aminosäuren' }[g],
			missingPct: Math.round((1 - (coverage.ratios?.[g] ?? 1)) * 100),
		}))
	);
	const hasCoverageGap = $derived(coverageRows.some(r => r.missingPct >= 1));

	/** Deep dive into which foods supplied a nutrient over the same window. */
	function nutrientHref(/** @type {string} */ key) {
		return resolve('/fitness/[nutrition=fitnessNutrition]/nutrient/[key]', {
			nutrition: fitnessSlugs(lang).nutrition,
			key,
		}) + `?days=${data.days === 30 ? 30 : 7}`;
	}

	/** @param {number} d */
	function rangeHref(d) {
		return resolve('/fitness/[stats=fitnessStats]/nutrients', { stats: statsSlug }) + (d === 30 ? '?days=30' : '');
	}

	const rangeLabel = $derived(
		data.days === 30
			? (isEn ? '30-day average' : '30-Tage-Durchschnitt')
			: (isEn ? '7-day average' : '7-Tage-Durchschnitt')
	);

	// Energy-share fatty acid references follow the calorie goal — see getDRI.
	const dri = $derived(getDRI(mn.sex === 'female' ? 'female' : 'male', mn.dailyCalories));
	// Per-kg requirements are scaled by the body weight averaged over the same window,
	// so a weight trend during it doesn't skew the comparison.
	const aminoWeight = $derived(mn.weight ?? AMINO_DRI_REFERENCE_WEIGHT);

	const weightNote = $derived.by(() => {
		const kg = Math.round(aminoWeight);
		if (!mn.weight) {
			return isEn
				? `No body weight logged — requirement shown for a ${AMINO_DRI_REFERENCE_WEIGHT} kg adult.`
				: `Kein Körpergewicht erfasst — Bedarf für einen ${AMINO_DRI_REFERENCE_WEIGHT} kg schweren Erwachsenen.`;
		}
		if (mn.weightIsAverage) {
			return isEn
				? `Share of the daily requirement at ${kg} kg — your average body weight over these ${data.days} days.`
				: `Anteil am Tagesbedarf bei ${kg} kg — dein durchschnittliches Körpergewicht in diesen ${data.days} Tagen.`;
		}
		return isEn
			? `Share of the daily requirement at ${kg} kg — nothing weighed in this window, so the latest measurement is used.`
			: `Anteil am Tagesbedarf bei ${kg} kg — in diesem Zeitraum nichts gewogen, daher gilt die letzte Messung.`;
	});

	const macros = $derived([
		{ pct: ns.macroSplit?.protein ?? 0, target: ns.macroTargets?.protein, label: t.protein, color: 'var(--green)', fill: '#a3be8c', icon: Beef },
		{ pct: ns.macroSplit?.fat ?? 0, target: ns.macroTargets?.fat, label: t.fat, color: 'var(--orange)', fill: '#d08770', icon: Droplet },
		{ pct: ns.macroSplit?.carbs ?? 0, target: ns.macroTargets?.carbs, label: t.carbs, color: 'var(--lightblue)', fill: '#81a1c1', icon: Wheat },
	]);

	const AMINO_META = {
		leucine:       { en: 'Leucine',        de: 'Leucin' },
		isoleucine:    { en: 'Isoleucine',     de: 'Isoleucin' },
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

	// Fat and carbohydrate composition for the hero. Segments are listed in the order
	// they stack; `unknown` always sits last so the measured part of the bar starts
	// at the left edge and stays comparable between days.
	const comp = $derived(mn.composition);

	const fatSegments = $derived(comp ? [
		{ key: 'saturated', label: isEn ? 'Saturated' : 'Gesättigt', value: comp.saturated, color: 'var(--orange)' },
		{ key: 'mono', label: isEn ? 'Monounsaturated' : 'Einfach ungesättigt', value: comp.mono, color: 'var(--green)' },
		{ key: 'poly', label: isEn ? 'Polyunsaturated' : 'Mehrfach ungesättigt', value: comp.poly, color: 'var(--blue)' },
		{ key: 'trans', label: isEn ? 'Trans' : 'Trans', value: comp.trans, color: 'var(--red)' },
		{ key: 'fatOther', label: isEn ? 'Glycerol & other lipids' : 'Glycerin & andere Lipide', value: comp.fatOther, color: 'var(--color-bg-elevated)' },
		{ key: 'fatUnknown', label: isEn ? 'Not broken down' : 'Ohne Aufschlüsselung', value: comp.fatUnknown, color: 'var(--color-bg-elevated)', unknown: true },
	] : []);

	const carbSegments = $derived(comp ? [
		{ key: 'sugars', label: isEn ? 'Sugars' : 'Zucker', value: comp.sugars, color: 'var(--red)' },
		{ key: 'fiber', label: isEn ? 'Fibre' : 'Ballaststoffe', value: comp.fiber, color: 'var(--green)' },
		{ key: 'carbOther', label: isEn ? 'Starch & other' : 'Stärke & übrige', value: comp.carbOther, color: 'var(--lightblue)' },
		{ key: 'carbUnknown', label: isEn ? 'Not broken down' : 'Ohne Aufschlüsselung', value: comp.carbUnknown, color: 'var(--color-bg-elevated)', unknown: true },
	] : []);

	// Fibre is reported alongside sugars but is not part of the carbohydrate figure
	// in any of the three sources, so the bar totals carbs + fibre rather than carbs.
	const carbBarTotal = $derived(comp ? comp.carbs + comp.fiber : 0);

	const fatGapPct = $derived(Math.round((1 - (mn.fatCoverage ?? 1)) * 100));

	// Names the energy the fatty acid ceilings were computed from — see getDRI.
	const energyBasisLabel = $derived(
		mn.dailyCalories
			? (isEn ? `your ${Math.round(mn.dailyCalories).toLocaleString('en-US')} kcal goal` : `dein Ziel von ${Math.round(mn.dailyCalories).toLocaleString('de-CH')} kcal`)
			: (isEn ? `a ${REFERENCE_ENERGY[mn.sex === 'female' ? 'female' : 'male'].toLocaleString('en-US')} kcal reference day` : `einen Referenztag mit ${REFERENCE_ENERGY[mn.sex === 'female' ? 'female' : 'male'].toLocaleString('de-CH')} kcal`)
	);

	const compositionNote = $derived(
		fatGapPct >= 1
			? (isEn
				? `${fatGapPct}% of the fat logged came with no breakdown — those grams are shown hatched and are excluded from the fatty acid figures below.`
				: `Für ${fatGapPct}% des erfassten Fetts gibt es keine Aufschlüsselung — diese Gramm sind schraffiert dargestellt und fliessen nicht in die Fettsäurewerte unten ein.`)
			: ''
	);

	// Trace minerals carry their own per-mineral coverage: no source publishes all
	// six, so the share of the window each was measured across differs between them
	// and cannot be folded into the group coverage above.
	const traceCov = $derived(
		mn.traceCoverage ?? Object.fromEntries(TRACE_MINERAL_KEYS.map(k => [k, 1]))
	);

	const essentialOrder = ['leucine', 'isoleucine', 'valine', 'lysine', 'methionine', 'phenylalanine', 'threonine', 'tryptophan', 'histidine'];
	const nonEssentialOrder = ['alanine', 'arginine', 'asparticAcid', 'cysteine', 'glutamicAcid', 'glycine', 'proline', 'serine', 'tyrosine'];

	const sections = $derived.by(() => {
		const minerals = ['calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc'];
		const vitamins = ['vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK', 'thiamin', 'riboflavin', 'niacin', 'vitaminB6', 'vitaminB12', 'folate'];
		const other = ['cholesterol', 'alcohol'];

		/** @param {string[]} keys */
		function mkRows(keys) {
			return keys.map(k => {
				const meta = NUTRIENT_META[/** @type {keyof typeof NUTRIENT_META} */ (k)];
				const value = mn.micros?.[k] ?? 0;
				const goal = /** @type {Record<string, number>} */ (dri)[k] ?? 0;
				const pct = goal > 0 ? Math.round(value / goal * 100) : null;
				// A sustained average above the tolerable upper intake level is the
				// signal worth flagging — a single heavy day is not.
				const limit = UPPER_LIMITS[/** @type {keyof typeof UPPER_LIMITS} */ (k)];
				const overLimit = !!limit && value > limit;
				return { key: k, label: isEn ? meta.label : meta.labelDe, unit: meta.unit, value, pct, bar: pct ?? 0, isMax: meta.isMax, limit, overLimit, noData: false };
			});
		}

		// Trace minerals. A mineral no logged food reported at all gets `noData` and
		// renders as a dash — averaging it as zero would read as a deficiency when it
		// is really an absence of measurements.
		function mkTraceRows() {
			return TRACE_MINERAL_KEYS.map(k => {
				const meta = NUTRIENT_META[k];
				const raw = mn.traces?.[k];
				const noData = typeof raw !== 'number';
				const value = noData ? 0 : raw;
				const goal = /** @type {Record<string, number>} */ (dri)[k] ?? 0;
				const pct = noData || goal <= 0 ? null : Math.round(value / goal * 100);
				const limit = UPPER_LIMITS[k];
				const overLimit = !noData && !!limit && value > limit;
				return { key: k, label: isEn ? meta.label : meta.labelDe, unit: meta.unit, value, pct, bar: pct ?? 0, isMax: meta.isMax, limit, overLimit, noData };
			});
		}

		// Fibre and sugars, the two carbohydrate figures that carry a reference. They
		// come from the composition totals rather than the micronutrient map, but are
		// judged the same way, and the diary shows the same pair in the same place.
		const carbQualityRows = ['fiber', 'sugars'].map(k => {
			const meta = NUTRIENT_META[/** @type {keyof typeof NUTRIENT_META} */ (k)];
			const value = /** @type {Record<string, number>} */ (mn.composition ?? {})[k] ?? 0;
			const goal = /** @type {Record<string, number>} */ (dri)[k] ?? 0;
			const pct = goal > 0 ? Math.round(value / goal * 100) : null;
			return { key: k, label: isEn ? meta.label : meta.labelDe, unit: meta.unit, value, pct, bar: pct ?? 0, isMax: meta.isMax, limit: undefined, overLimit: false, noData: false };
		});

		// Fatty acids that carry a reference intake, judged against it like any other
		// nutrient. Saturated and trans fat are ceilings; the other three are adequate
		// intakes, so exceeding them is not a problem.
		const fattyAcidOrder = ['saturatedFat', 'transFat', 'linoleicAcid', 'alphaLinolenicAcid', 'epaDha'];
		const fattyAcidRows = fattyAcidOrder.map(k => {
			const meta = NUTRIENT_META[/** @type {keyof typeof NUTRIENT_META} */ (k)];
			const value = mn.fats?.[k] ?? 0;
			const goal = /** @type {Record<string, number>} */ (dri)[k] ?? 0;
			const pct = goal > 0 ? Math.round(value / goal * 100) : null;
			return { key: k, label: isEn ? meta.label : meta.labelDe, unit: meta.unit, value, pct, bar: pct ?? 0, isMax: meta.isMax, limit: undefined, overLimit: false, noData: false };
		});

		// The rest have no reference value — shown as the shape of the fat eaten, with
		// each omega total heading the acids it is the sum of. Same rows, same order and
		// same rules as the diary's day panel; see $lib/fitness/fatComposition.
		const compositionRows = fatCompositionRows(mn.fats, {
			totalFat: mn.composition?.fat ?? 0,
			isEn,
		}).map(r => ({
			...r,
			isMax: false,
			limit: undefined,
			overLimit: false,
			noData: false,
		}));

		// Essentials: average intake against the WHO requirement for the logged body weight
		const essentialRows = essentialOrder.map(k => {
			const meta = AMINO_META[/** @type {keyof typeof AMINO_META} */ (k)];
			const value = mn.aminos?.[k] ?? 0;
			const goal = aminoDri(k, aminoWeight);
			const pct = goal > 0 ? Math.round(value / goal * 100) : null;
			return { key: k, label: isEn ? meta.en : meta.de, unit: 'g', value, pct, bar: pct ?? 0, isMax: false, limit: undefined, overLimit: false, noData: false };
		});

		// Non-essentials have no requirement — shown as a distribution among themselves
		const neValues = nonEssentialOrder.map(k => mn.aminos?.[k] ?? 0);
		const neTotal = neValues.reduce((a, b) => a + b, 0);
		const neMax = Math.max(0, ...neValues);
		const nonEssentialRows = nonEssentialOrder.map((k, i) => {
			const meta = AMINO_META[/** @type {keyof typeof AMINO_META} */ (k)];
			const value = neValues[i];
			return {
				key: k,
				label: isEn ? meta.en : meta.de,
				unit: 'g',
				value,
				pct: neTotal > 0 ? Math.round(value / neTotal * 100) : null,
				bar: neMax > 0 ? value / neMax * 100 : 0,
				isMax: false,
				limit: undefined,
				overLimit: false,
				noData: false,
			};
		});

		// Only the fat-composition rows nest, but every row carries the flags so the
		// renderer can stay one shape.
		/** @param {any[]} rows */
		const flat = (rows) => rows.map(r => ({ child: false, header: false, ...r }));

		// Section order matches the diary's day panel exactly — the two views answer the
		// same question over different spans, and a reader moving between them should
		// not have to re-find anything.
		return [
			{ title: isEn ? 'Carbohydrate Quality' : 'Kohlenhydrat-Qualität', rows: flat(carbQualityRows), note: '' },
			{ title: isEn ? 'Fatty Acids' : 'Fettsäuren', rows: flat(fattyAcidRows), note: isEn
				? `Saturated and trans fat are ceilings. Linoleic and α-linolenic acid are adequate intakes — reaching them is the goal, exceeding them is not a concern. All four are shares of energy, scaled to ${energyBasisLabel}; EPA + DHA is a fixed 250 mg a day.`
				: `Gesättigte und Trans-Fettsäuren sind Obergrenzen. Linol- und α-Linolensäure sind Richtwerte — sie zu erreichen ist das Ziel, sie zu überschreiten unproblematisch. Alle vier sind Energieanteile, skaliert auf ${energyBasisLabel}; EPA + DHA sind fixe 250 mg pro Tag.` },
			{ title: isEn ? 'Fat Composition' : 'Fettzusammensetzung', rows: flat(compositionRows), note: fatCompositionNote(isEn) },
			{ title: isEn ? 'Minerals' : 'Mineralstoffe', rows: flat(mkRows(minerals)), note: '' },
			{ title: isEn ? 'Trace Minerals' : 'Spurenelemente', rows: flat(mkTraceRows()), note: traceCoverageNote(traceCov, isEn) },
			{ title: isEn ? 'Vitamins' : 'Vitamine', rows: flat(mkRows(vitamins)), note: '' },
			{ title: isEn ? 'Essential Amino Acids' : 'Essenzielle Aminosäuren', rows: flat(essentialRows), note: weightNote },
			{ title: isEn ? 'Non-Essential Amino Acids' : 'Nicht-essenzielle Aminosäuren', rows: flat(nonEssentialRows), note: isEn
				? 'No intake requirement — bars show each one’s share of the non-essential amino acids eaten.'
				: 'Kein Bedarfswert — die Balken zeigen den Anteil an den aufgenommenen nicht-essenziellen Aminosäuren.' },
			{ title: isEn ? 'Other' : 'Sonstiges', rows: flat(mkRows(other)), note: '' },
		];
	});

	const overLimitRows = $derived(sections.flatMap(sec => sec.rows.filter(r => r.overLimit)));

	// Men (and anyone not menstruating) have no regular route to shed iron, so a
	// habitual excess accumulates — worth calling out beyond the generic UL warning.
	const ironWarning = $derived(
		overLimitRows.some(r => r.key === 'iron') && mn.sex !== 'female'
	);

	const pageTitle = $derived(t.nutrient_averages);
</script>

<svelte:head><title>{pageTitle} - Bocken</title></svelte:head>

<div class="nutrient-detail">
	<div class="detail-head">
		<h1>{pageTitle}</h1>
		<div class="head-row">
			<span class="range-label">
				{rangeLabel}
				{#if daysTracked > 0}
					· {daysTracked} {isEn ? 'logged days' : 'erfasste Tage'}
				{/if}
			</span>
			<div class="range-picker">
				<span class="range-caption">{isEn ? 'Averaged over' : 'Gemittelt über'}</span>
				<div class="range-switch">
					<a class="range-btn" class:is-active={data.days === 7} href={rangeHref(7)} data-sveltekit-noscroll>
						7 {isEn ? 'days' : 'Tage'}
					</a>
					<a class="range-btn" class:is-active={data.days === 30} href={rangeHref(30)} data-sveltekit-noscroll>
						30 {isEn ? 'days' : 'Tage'}
					</a>
				</div>
			</div>
		</div>
	</div>

	{#if daysTracked === 0}
		<p class="empty">{t.no_nutrition_data}</p>
	{:else}
		<!-- Macro split hero — same rings as the stats page card -->
		<section class="hero">
			<h2>{t.macro_split}</h2>
			<div class="legend">
				<span class="legend-item">
					<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3,9.5 A4,4 0 1,1 9,9.5" fill="none" stroke="var(--color-text-secondary)" stroke-width="2" stroke-linecap="round"/></svg>
					{t.actual_label}
				</span>
				<span class="legend-item">
					<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M6,10 L10,2 L2,2 Z" fill="var(--color-text-secondary)" stroke="var(--color-text-secondary)" stroke-width="1.5" stroke-linejoin="round"/></svg>
					{t.target_label}
				</span>
			</div>
			<div class="macro-rings">
				{#each macros as macro (macro.color)}
					{@const MacroIcon = macro.icon}
					<div class="macro-ring">
						<StatsRingGraph
							percent={macro.pct}
							color={macro.color}
							label={macro.label}
							target={macro.target}
							markerColor={macro.fill}
						>
							{#snippet labelIcon()}<MacroIcon size={12} />{/snippet}
						</StatsRingGraph>
					</div>
				{/each}
			</div>

			{#if comp && (comp.fat > 0 || comp.carbs > 0)}
				<div class="composition-grid">
					<CompositionBar
						title={isEn ? 'Fat' : 'Fett'}
						total={comp.fat}
						segments={fatSegments}
						note={compositionNote}
					/>
					<CompositionBar
						title={isEn ? 'Carbohydrates' : 'Kohlenhydrate'}
						total={carbBarTotal}
						segments={carbSegments}
						note={isEn ? 'Fibre is shown alongside carbohydrate, not inside it — none of the three sources counts it as part of the figure.' : 'Ballaststoffe stehen neben den Kohlenhydraten, nicht darin — keine der drei Quellen zählt sie zum Wert dazu.'}
					/>
				</div>
			{/if}
		</section>

		<section class="micro-card">
			<h2>{isEn ? 'Micronutrients' : 'Mikronährstoffe'}</h2>

			{#if hasCoverageGap}
				<div class="coverage-warning">
					<TriangleAlert size={16} />
					<div class="coverage-body">
						<p class="coverage-head">
							{isEn ? 'Not every food logged comes with a full nutrient breakdown' : 'Nicht jedes erfasste Lebensmittel bringt eine vollständige Nährwerttabelle mit'}
						</p>
						<ul class="coverage-list">
							{#each coverageRows as row (row.key)}
								<li>
									<span class="coverage-label">{row.label}</span>
									<span class="coverage-meter">
										<span class="coverage-meter-fill" style="width: {100 - row.missingPct}%"></span>
									</span>
									<span class="coverage-figure" class:is-gap={row.missingPct >= 1}>
										{row.missingPct}%
									</span>
								</li>
							{/each}
						</ul>
						<p class="coverage-detail">
							{isEn
								? `Share of the ${Math.round(coverage.totalCalories ?? 0).toLocaleString('en-US')} kcal logged whose source publishes no figures. Open Food Facts declares a mineral or two at best and no amino acids at all — those foods may still contain them, so the averages below read low by roughly that much.`
								: `Anteil der erfassten ${Math.round(coverage.totalCalories ?? 0).toLocaleString('de-CH')} kcal, für die die Quelle keine Werte veröffentlicht. Open Food Facts führt höchstens ein paar Mineralstoffe und gar keine Aminosäuren — diese Lebensmittel können sie trotzdem enthalten, die Durchschnitte unten liegen also entsprechend zu tief.`}
						</p>
						{#if coverage.missing?.length}
							<p class="coverage-detail">
								{isEn ? 'Without full figures: ' : 'Ohne vollständige Werte: '}
								{coverage.missing.slice(0, 6).join(', ')}{coverage.missing.length > 6 ? ` +${coverage.missing.length - 6}` : ''}
							</p>
						{/if}
					</div>
				</div>
			{/if}

			{#if overLimitRows.length > 0}
				<div class="limit-warning">
					<TriangleAlert size={16} />
					<div>
						<p class="limit-warning-head">
							{isEn ? 'Above the tolerable upper intake level' : 'Über der tolerierbaren Höchstmenge'}
							<DriSourceInfo {isEn} variant="limits" />
						</p>
						<p>
							{#each overLimitRows as row, i (row.key)}{i > 0 ? ', ' : ''}{row.label} ({fmt(row.value)} {row.unit} {isEn ? 'vs' : 'statt max.'} {row.limit} {row.unit}){/each}
						</p>
						{#if ironWarning}
							<p class="limit-warning-detail">
								{isEn
									? 'The body has no active way to excrete iron, so a sustained excess accumulates — a concern for men and anyone not menstruating. Worth raising with a doctor rather than self-correcting.'
									: 'Der Körper kann Eisen nicht aktiv ausscheiden, ein dauerhafter Überschuss lagert sich also ein — relevant für Männer und alle ohne Menstruation. Besser ärztlich abklären als selbst gegensteuern.'}
							</p>
						{/if}
					</div>
				</div>
			{/if}
			<div class="legend">
				<span class="legend-item">
					<span class="legend-bar"><span class="legend-bar-fill"></span></span>
					{isEn ? 'Bar & % — share of the daily reference intake' : 'Balken & % — Anteil an der Tagesreferenzmenge'}
					<DriSourceInfo {isEn} />
				</span>
				<span class="legend-item">
					<span class="legend-bar"><span class="legend-bar-fill is-max"></span></span>
					{isEn ? 'Upper limit, not a goal' : 'Obergrenze, kein Zielwert'}
				</span>
			</div>
			<div class="micro-details">
				{#each sections as section (section.title)}
					<div class="micro-section">
						<h4>{section.title}</h4>
						{#if section.note}
							<p class="micro-note">{section.note}</p>
						{/if}
						{#each section.rows as row (row.key)}
							<a
								class="micro-row is-link"
								class:is-child={row.child}
								class:is-group={row.header}
								href={nutrientHref(row.key)}
								data-sveltekit-noscroll
							>
								<span class="micro-label">
									{row.label}
									{#if row.overLimit}
										<TriangleAlert size={12} class="micro-warn-icon" />
									{/if}
								</span>
								<div class="micro-bar-wrap">
									<div class="micro-bar" class:is-max={row.isMax} class:over-limit={row.overLimit} style="width: {Math.min(row.bar, 100)}%"></div>
								</div>
								<span class="micro-value" class:over-limit={row.overLimit} class:is-na={row.noData}>
									{#if row.noData}—{:else}{fmt(row.value)} {row.unit}{/if}
								</span>
								<span class="micro-pct" class:is-na={row.pct === null}>{row.pct === null ? 'N/A' : `${row.pct}%`}</span>
							</a>
						{/each}
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.nutrient-detail {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 1000px;
		margin-inline: auto;
		width: 100%;
	}
	.detail-head {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
	}
	.head-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.range-label {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.range-picker {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.range-caption {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}
	.range-switch {
		display: flex;
		gap: 0.25rem;
		background: var(--color-bg-tertiary);
		padding: 0.2rem;
		border-radius: var(--radius-pill);
	}
	.range-btn {
		padding: 0.4rem 1rem;
		border-radius: var(--radius-pill);
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-decoration: none;
		white-space: nowrap;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1rem;
		margin: -0.4rem 0 0.75rem;
		font-size: 0.7rem;
		color: var(--color-text-secondary);
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.legend-bar {
		display: inline-block;
		width: 22px;
		height: 5px;
		border-radius: 3px;
		background: var(--color-bg-tertiary);
		overflow: hidden;
	}
	.legend-bar-fill {
		display: block;
		width: 65%;
		height: 100%;
		border-radius: 3px;
		background: var(--green);
	}
	.legend-bar-fill.is-max {
		background: var(--orange);
	}
	.range-btn.is-active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.hero,
	.micro-card {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		padding: 1rem 1.25rem;
	}
	h2 {
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
	}
	.macro-rings {
		display: flex;
		justify-content: space-evenly;
		gap: 0.5rem;
	}
	.macro-ring {
		flex: 1;
		max-width: 160px;
	}
	.macro-ring :global(.ring-svg) {
		width: 100%;
		height: auto;
	}
	.composition-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
		gap: 1.5rem;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border);
	}
	@media (max-width: 560px) {
		.composition-grid {
			grid-template-columns: 1fr;
			gap: 1.25rem;
		}
	}
	.empty {
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}

	/* Micronutrient rows — same visual language as the daily nutrition page */
	.micro-details {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.micro-section h4 {
		margin: 0 0 0.3rem;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}
	.micro-note {
		margin: 0 0 0.4rem;
		font-size: 0.7rem;
		line-height: 1.4;
		color: var(--color-text-secondary);
	}
	.micro-row {
		display: grid;
		grid-template-columns: 7rem 1fr 4rem 2.5rem;
		align-items: center;
		gap: 0.4rem;
		padding: 0.2rem 0;
		font-size: 0.78rem;
	}
	/* Rows link through to which foods supplied the nutrient. Kept visually identical
	   to the old static row apart from the hover, so the table does not turn into a
	   wall of link-blue. */
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
		display: flex;
		align-items: center;
		gap: 0.25rem;
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
	.micro-label :global(.micro-warn-icon) {
		color: var(--red);
		flex-shrink: 0;
	}
	.micro-bar.over-limit {
		background: var(--red);
	}
	.micro-value.over-limit {
		color: var(--red);
		font-weight: 700;
	}
	.coverage-warning {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.9rem;
		padding: 0.6rem 0.7rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--orange);
		background: color-mix(in srgb, var(--orange) 10%, transparent);
		font-size: 0.75rem;
		line-height: 1.45;
		color: var(--color-text-primary);
	}
	.coverage-warning :global(svg) {
		flex-shrink: 0;
		color: var(--orange);
	}
	.coverage-warning p {
		margin: 0;
	}
	.coverage-head {
		font-weight: 700;
	}
	.coverage-body {
		min-width: 0;
		flex: 1;
	}
	.coverage-list {
		list-style: none;
		margin: 0.45rem 0 0.5rem;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.coverage-list li {
		display: grid;
		grid-template-columns: 6.5rem 1fr 2.75rem;
		align-items: center;
		gap: 0.5rem;
	}
	.coverage-label {
		color: var(--color-text-secondary);
	}
	.coverage-meter {
		display: block;
		height: var(--meter-sm);
		border-radius: 3px;
		background: color-mix(in srgb, var(--orange) 35%, transparent);
		overflow: hidden;
	}
	.coverage-meter-fill {
		display: block;
		height: 100%;
		border-radius: 3px;
		background: var(--green);
	}
	.coverage-figure {
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-secondary);
	}
	.coverage-figure.is-gap {
		font-weight: 700;
		color: var(--orange);
	}
	.coverage-detail {
		margin-top: 0.35rem !important;
		color: var(--color-text-secondary);
	}
	.limit-warning {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.9rem;
		padding: 0.6rem 0.7rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--red);
		background: color-mix(in srgb, var(--red) 10%, transparent);
		font-size: 0.75rem;
		line-height: 1.45;
		color: var(--color-text-primary);
	}
	.limit-warning :global(svg) {
		flex-shrink: 0;
		color: var(--red);
	}
	.limit-warning p {
		margin: 0;
	}
	.limit-warning-head {
		font-weight: 700;
	}
	.limit-warning-detail {
		margin-top: 0.35rem !important;
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
	.micro-pct {
		text-align: right;
		font-weight: 700;
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
	}
	.micro-pct.is-na {
		font-weight: 500;
		color: var(--color-text-tertiary);
	}
	/* Nothing logged reported this nutrient — muted so it reads as "no measurement"
	   rather than as a value of zero. */
	.micro-value.is-na {
		opacity: 0.55;
	}
</style>
