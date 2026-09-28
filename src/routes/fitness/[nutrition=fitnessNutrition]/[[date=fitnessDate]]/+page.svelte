<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Settings from '@lucide/svelte/icons/settings';
	import Utensils from '@lucide/svelte/icons/utensils';
	import Info from '@lucide/svelte/icons/info';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Check from '@lucide/svelte/icons/check';
	import GlassWater from '@lucide/svelte/icons/glass-water';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Heart from '@lucide/svelte/icons/heart';
	import Clock from '@lucide/svelte/icons/clock';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import Beef from '@lucide/svelte/icons/beef';
	import Droplet from '@lucide/svelte/icons/droplet';
	import Wheat from '@lucide/svelte/icons/wheat';
	import { detectFitnessLang, fitnessSlugs, m } from '$lib/js/fitnessI18n';
	import { localDateStr } from '$lib/js/localDate';
	import { computeBmr, activityMultiplier } from '$lib/fitness/energy';
	import { entryCalories, energySources, macroCaloriePercent, scaleFromPer100g, formatGrams as fmt, formatKcal as fmtCal } from '$lib/fitness/nutritionMath';
	import { macroGoalGrams } from '$lib/fitness/macroGoals';
	import { MEAL_TYPES, defaultMealType } from '$lib/fitness/meals';
	import { cupRowChange } from '$lib/fitness/cupRow';
	import {
		HOT_DRINKS, HOT_DRINK_ML, HOT_DRINK_GROUP_LABELS, HOT_DRINK_GROUPS,
		DEFAULT_HOT_DRINK_CODE, resolveHotDrink, isHotDrinkRef,
		hotDrinkLabel, hotDrinkLogName,
		HOT_DRINK_ENABLED_COOKIE, HOT_DRINK_CODE_COOKIE, HOT_DRINK_COOKIE_MAX_AGE,
	} from '$lib/fitness/hotDrinks';
	import AddButton from '$lib/components/AddButton.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import { formatAmountLabel } from '$lib/fitness/portions';
	import FoodSearch from '$lib/components/fitness/FoodSearch.svelte';
	import PortionAmountInput from '$lib/components/fitness/PortionAmountInput.svelte';
	import MacroBreakdown from '$lib/components/fitness/MacroBreakdown.svelte';
	import NutrientRow from '$lib/components/fitness/NutrientRow.svelte';
	import { nutrientRows } from '$lib/fitness/nutrientRows';
	import MealTypePicker from '$lib/components/fitness/MealTypePicker.svelte';
	import { MEAL_META } from '$lib/components/fitness/mealMeta';
	import NudgeCard from '$lib/components/fitness/NudgeCard.svelte';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import { toast } from '$lib/js/toast.svelte';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import { getDRI, NUTRIENT_META, RELATIVE_TO, aminoDri, AMINO_DRI_REFERENCE_WEIGHT, REFERENCE_ENERGY } from '$lib/data/dailyReferenceIntake';
	import {
		fatSplit, carbSplit, epaDha as epaDhaOf, omegaTotals as omegaTotalsOf,
		FAT_GROUP_KEYS, ACID_KEYS,
	} from '$lib/fitness/fattyAcids';
	import { fatCompositionRows, fatCompositionNote } from '$lib/fitness/fatComposition';
	import CompositionBar from '$lib/components/fitness/CompositionBar.svelte';
	import DriSourceInfo from '$lib/components/fitness/DriSourceInfo.svelte';
	import { microCoverage } from '$lib/fitness/microCoverage';
	import { TRACE_MINERAL_KEYS, traceTotals, traceCoverageNote } from '$lib/fitness/traceMinerals';
	import { DRINK_PATTERNS, aggregateMealPer100g, mealTotalGrams, mealTotalCal, mealPreview } from '$lib/fitness/customMeal';
	import { MINERAL_ORDER, VITAMIN_ORDER, OTHER_ORDER, CARB_DETAIL_ORDER } from '$lib/fitness/nutrientOrder';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { clampToViewport } from '$lib/js/clampToViewport';

	/**
	 * @typedef {{ description: string, grams: number }} Portion
	 *
	 * @typedef {{
	 *   _id: string,
	 *   mealType: string,
	 *   name: string,
	 *   source?: string,
	 *   sourceId?: string,
	 *   amountGrams: number,
	 *   portions?: Portion[],
	 *   selectedPortion?: Portion,
	 *   liquidMl?: number,
	 *   per100g?: Record<string, number>,
	 * }} FoodLogEntry
	 *
	 * @typedef {{
	 *   name: string,
	 *   source?: string,
	 *   sourceId?: string,
	 *   amountGrams: number,
	 *   per100g?: Record<string, number>,
	 * }} MealIngredient
	 *
	 * @typedef {{
	 *   _id: string,
	 *   name: string,
	 *   ingredients: MealIngredient[],
	 * }} CustomMeal
	 *
	 * @typedef {{
	 *   name: string,
	 *   source: string,
	 *   sourceId: string,
	 *   amountGrams: number,
	 *   portions?: Portion[],
	 *   selectedPortion?: Portion,
	 *   per100g: Record<string, number>,
	 * }} FoodSelection
	 */

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const s = $derived(fitnessSlugs(lang));
	const isEn = $derived(lang === 'en');

	let { data } = $props();

	// --- Date navigation ---
	// svelte-ignore state_referenced_locally
	let currentDate = $state(data.date);
	const todayStr = localDateStr();
	const isToday = $derived(currentDate === todayStr);

	const displayDate = $derived.by(() => {
		const d = new Date(currentDate + 'T12:00:00');
		return d.toLocaleDateString(isEn ? 'en-US' : 'de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
	});

	/** @param {number} offset */
	function dateOffset(offset) {
		const d = new Date(currentDate + 'T12:00:00');
		d.setDate(d.getDate() + offset);
		return localDateStr(d);
	}

	const prevDate = $derived(dateOffset(-1));
	const nextDate = $derived(dateOffset(1));
	const prevHref = $derived(
		prevDate === todayStr
			? resolve('/fitness/[nutrition=fitnessNutrition]', { nutrition: s.nutrition })
			: resolve('/fitness/[nutrition=fitnessNutrition]/[[date=fitnessDate]]', { nutrition: s.nutrition, date: prevDate })
	);
	const nextHref = $derived(
		nextDate === todayStr
			? resolve('/fitness/[nutrition=fitnessNutrition]', { nutrition: s.nutrition })
			: resolve('/fitness/[nutrition=fitnessNutrition]/[[date=fitnessDate]]', { nutrition: s.nutrition, date: nextDate })
	);
	const todayHref = $derived(resolve('/fitness/[nutrition=fitnessNutrition]', { nutrition: s.nutrition }));

	// --- Entries ---
	// svelte-ignore state_referenced_locally
	let entries = $state(/** @type {FoodLogEntry[]} */ (data.foodLog?.entries ?? []));
	// svelte-ignore state_referenced_locally
	let recipeImages = $state(/** @type {Record<string, string>} */ (data.recipeImages ?? {}));

	/**
	 * Append a freshly logged entry to the day view.
	 *
	 * `recipeImages` is built server-side at load, so a recipe logged afterwards
	 * has no thumbnail in the map and would render imageless until the next
	 * navigation. The POST response carries the URL for exactly this reason —
	 * fold it in so the entry appears complete straight away.
	 * @param {any} entry
	 */
	function addEntry(entry) {
		if (!entry) return;
		if (entry.source === 'recipe' && entry.sourceId && entry.image) {
			recipeImages = { ...recipeImages, [entry.sourceId]: entry.image };
		}
		entries = [...entries, entry];
	}

	// Keep reactive with server data when navigating
	$effect(() => {
		entries = data.foodLog?.entries ?? [];
		recipeImages = data.recipeImages ?? {};
		exerciseKcal = Number(data.exerciseKcal) || 0;
		projectedExercise = data.projectedExercise ?? null;
		currentDate = data.date;
		goalCalories = data.dayCalorieGoal ?? data.goal?.dailyCalories ?? null;
		currentGoalCalories = data.goal?.dailyCalories ?? null;
		// A new day (or an invalidateAll after applying one) brings its own suggestions.
		nudges = data.nudges ?? [];
	});

	// --- Goals ---
	// The calorie goal shown is the one *this day* was eaten against; only days with
	// no stored target (logged before targets existed) fall back to the current goal.
	// svelte-ignore state_referenced_locally
	let goalCalories = $state(data.dayCalorieGoal ?? data.goal?.dailyCalories ?? null);
	/** The live goal, which is what the editor edits — see openGoalEditor. */
	// svelte-ignore state_referenced_locally
	let currentGoalCalories = $state(data.goal?.dailyCalories ?? null);
	// svelte-ignore state_referenced_locally
	let goalProteinMode = $state(data.goal?.proteinMode ?? 'fixed');
	// svelte-ignore state_referenced_locally
	let goalProteinTarget = $state(data.goal?.proteinTarget ?? null);
	// svelte-ignore state_referenced_locally
	let goalFatPercent = $state(data.goal?.fatPercent ?? null);
	// svelte-ignore state_referenced_locally
	let goalCarbPercent = $state(data.goal?.carbPercent ?? null);
	// svelte-ignore state_referenced_locally
	let goalSex = $state(data.goal?.sex ?? 'male');
	// svelte-ignore state_referenced_locally
	let activityLevel = $state(data.goal?.activityLevel ?? 'light');
	// svelte-ignore state_referenced_locally
	let latestWeight = $state(data.latestWeight?.weight?.value ?? null);

	let showGoalEditor = $state(false);
	let goalSaving = $state(false);

	// Editable goal fields (populated by openGoalEditor)
	let editCalories = $state('');
	let editActivityLevel = $state('light');
	let editProteinMode = $state('fixed');
	let editProteinTarget = $state('');
	let editFatPercent = $state('');
	let editCarbPercent = $state('');

	const dietPresets = [
		{ emoji: '⚖️', en: 'WHO Balanced', de: 'WHO Ausgewogen',
			descEn: 'Standard WHO guidelines — moderate protein, balanced macros',
			descDe: 'WHO-Standardempfehlung — moderates Protein, ausgewogene Makros',
			proteinMode: 'per_kg', proteinTarget: 0.83, fatPercent: 30, carbPercent: 55 },
		{ emoji: '💪', en: 'Maintain', de: 'Halten',
			descEn: 'Eat at TDEE with higher protein to preserve muscle',
			descDe: 'Essen auf TDEE-Niveau mit erhöhtem Protein für Muskelerhalt',
			proteinMode: 'per_kg', proteinTarget: 1.6, fatPercent: 30, carbPercent: 45, calMult: 1.0 },
		{ emoji: '🔪', en: 'Cut', de: 'Definieren',
			descEn: '20% calorie deficit, high protein to minimize muscle loss',
			descDe: '20% Kaloriendefizit, hohes Protein gegen Muskelverlust',
			proteinMode: 'per_kg', proteinTarget: 2.2, fatPercent: 25, carbPercent: 40, calMult: 0.8 },
		{ emoji: '🍖', en: 'Bulk', de: 'Aufbauen',
			descEn: '15% calorie surplus for muscle growth with moderate protein',
			descDe: '15% Kalorienüberschuss für Muskelaufbau, moderates Protein',
			proteinMode: 'per_kg', proteinTarget: 1.8, fatPercent: 30, carbPercent: 50, calMult: 1.15 },
		{ emoji: '🥑', en: 'Keto', de: 'Keto',
			descEn: 'Very low carb, high fat — forces ketosis for fat burning',
			descDe: 'Sehr wenig Kohlenhydrate, viel Fett — erzwingt Ketose',
			proteinMode: 'per_kg', proteinTarget: 1.5, fatPercent: 70, carbPercent: 5 },
		{ emoji: '🏋️', en: 'High Protein', de: 'Proteinreich',
			descEn: 'Maximum protein for strength athletes and bodybuilders',
			descDe: 'Maximales Protein für Kraftsportler und Bodybuilder',
			proteinMode: 'per_kg', proteinTarget: 2.5, fatPercent: 30, carbPercent: 30 },
		{ emoji: '🥩', en: 'Carnivore', de: 'Karnivor',
			descEn: 'Animal products only — zero carb, high fat and protein',
			descDe: 'Nur tierische Produkte — null Kohlenhydrate, viel Fett und Protein',
			proteinMode: 'per_kg', proteinTarget: 2.5, fatPercent: 65, carbPercent: 0 },
	];

	// Wizard step: 1=presets, 2=calories+activity, 3=macros
	let goalStep = $state(1);
	let selectedPresetIdx = $state(-1);

	/**
	 * @param {(typeof dietPresets)[number]} preset
	 * @param {number} idx
	 */
	function applyPreset(preset, idx) {
		selectedPresetIdx = idx;
		editProteinMode = preset.proteinMode;
		editProteinTarget = String(preset.proteinTarget);
		editFatPercent = String(preset.fatPercent);
		editCarbPercent = String(preset.carbPercent);
		if (preset.calMult && hasBmrData) {
			editCalories = String(Math.round(dailyTdee * preset.calMult));
		}
		// Auto-advance to step 2
		goalStep = 2;
	}

	function openGoalEditor() {
		// The editor edits the *current* goal, never the historic one this page may be
		// showing — opening it on an old day must not offer to restore that number.
		editCalories = String(currentGoalCalories ?? goalCalories ?? '');
		editActivityLevel = activityLevel;
		editProteinMode = goalProteinMode;
		editProteinTarget = String(goalProteinTarget ?? '');
		editFatPercent = String(goalFatPercent ?? '');
		editCarbPercent = String(goalCarbPercent ?? '');
		selectedPresetIdx = -1;
		goalStep = 1;
		showGoalEditor = true;
	}

	// Macro ring preview (derived from edit fields)
	// Protein gets priority; remaining kcal split between fat:carb by ratio
	const RING_R = 48;
	const RING_C = 2 * Math.PI * RING_R;
	const RING_GAP = 4;
	const editMacroRing = $derived.by(() => {
		const cal = Number(editCalories) || 0;
		const fatRatio = Number(editFatPercent) || 0;
		const carbRatio = Number(editCarbPercent) || 0;
		let prot = 0, fat = 0, carb = 0;
		if (cal > 0) {
			// Compute protein % from target
			let protGrams = Number(editProteinTarget) || 0;
			// Same weight the rings use, or the preview would promise a split the page
			// then draws differently.
			if (editProteinMode === 'per_kg' && goalWeightKg) {
				protGrams = protGrams * goalWeightKg;
			}
			prot = Math.min(Math.round((protGrams * 4) / cal * 100), 100);
			const remaining = 100 - prot;
			const ratioSum = fatRatio + carbRatio;
			if (ratioSum > 0) {
				fat = Math.round(remaining * fatRatio / ratioSum);
				carb = remaining - fat;
			} else {
				fat = 0;
				carb = remaining;
			}
		}
		const fatDeg = (fat / 100) * 360;
		const carbDeg = (carb / 100) * 360;
		const fatLen = (fat / 100) * RING_C;
		const carbLen = (carb / 100) * RING_C;
		const protLen = (prot / 100) * RING_C;
		return { cal, fat, carb, prot, fatDeg, carbDeg, fatLen, carbLen, protLen };
	});

	// Step summary labels
	const stepPresetSummary = $derived(
		selectedPresetIdx >= 0 ? (isEn ? dietPresets[selectedPresetIdx].en : dietPresets[selectedPresetIdx].de) : (isEn ? 'Custom' : 'Benutzerdefiniert')
	);
	const stepCalSummary = $derived(
		editCalories ? `${editCalories} kcal` : '—'
	);
	const stepMacroSummary = $derived(
		`P${editMacroRing.prot}% F${editMacroRing.fat}% C${editMacroRing.carb}%`
	);

	async function saveGoals() {
		goalSaving = true;
		try {
			const body = {
				weeklyWorkouts: data.goal?.weeklyWorkouts ?? 4,
				sex: goalSex,
				heightCm: data.goal?.heightCm,
				activityLevel: editActivityLevel,
				dailyCalories: Number(editCalories) || null,
				proteinMode: editProteinMode,
				proteinTarget: Number(editProteinTarget) || null,
				fatPercent: Number(editFatPercent) || null,
				carbPercent: Number(editCarbPercent) || null,
			};
			const res = await fetch('/api/fitness/goal', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (res.ok) {
				const d = await res.json();
				currentGoalCalories = d.dailyCalories;
				// A goal change only reaches today onwards; a past day keeps its own.
				if (isTodayOrFuture) goalCalories = d.dailyCalories;
				activityLevel = d.activityLevel ?? 'light';
				goalProteinMode = d.proteinMode ?? 'fixed';
				goalProteinTarget = d.proteinTarget;
				goalFatPercent = d.fatPercent;
				goalCarbPercent = d.carbPercent;
				showGoalEditor = false;
			}
		} finally {
			goalSaving = false;
		}
	}

	// --- Computed daily totals ---
	/** @type {Array<'breakfast'|'lunch'|'dinner'|'snack'>} */
	const mealTypes = [...MEAL_TYPES];

	const grouped = $derived.by(() => {
		/** @type {Record<string, any[]>} */
		const g = { breakfast: [], lunch: [], dinner: [], snack: [] };
		for (const e of entries) {
			if (e.mealType === 'water') continue;
			if (g[e.mealType]) g[e.mealType].push(e);
		}
		return g;
	});

	// --- Water & liquid tracking ---
	const WATER_CUP_ML = 250;

	/** Tapered tumbler — water and cold drinks. */
	const GLASS_PATH = 'M4 4 L6 28 C6 30 8 30 8 30 L16 30 C16 30 18 30 18 28 L20 4 Z';
	/**
	 * Straight-sided mug — hot drinks, so a tea day reads apart at a glance.
	 *
	 * A mug is rightly shorter than a tumbler, but sitting both on the same floor
	 * put the whole 5-unit difference above the rim as dead space, and the handle
	 * pushed the silhouette off to the right. So it is centred on the glass's
	 * midline (y 17) and nudged a unit left, which puts body-plus-handle back over
	 * the same axis. Height stays honest.
	 */
	const MUG_PATH = 'M3 6.5 L3 22.5 C3 25.9 5.4 27.5 8.4 27.5 L13.6 27.5 C16.6 27.5 19 25.9 19 22.5 L19 6.5 Z';
	const MUG_HANDLE_PATH = 'M19 10.5 C22.6 10.5 22.6 17.5 19 17.5';

	/**
	 * The three sloshing wave fronts, as a set per vessel. A mug's rim sits 2.5
	 * units higher than a glass's, so the shared wave band crested straight over it
	 * and the tea appeared to be painted on the outside of the cup. The mug's set is
	 * the same shapes dropped 3 units, which also lands the two at a similar
	 * fullness — a mug poured to the brim next to a two-thirds glass read as a
	 * different unit rather than the same 250 ml.
	 */
	const GLASS_WAVES = [
		'M-8 10 Q-2 6 4 10 T16 10 T28 10 T40 10 V34 H-8 Z',
		'M-4 12 Q2 8 8 12 T20 12 T32 12 V34 H-4 Z',
		'M0 11 Q6 7 12 11 T24 11 T36 11 V34 H0 Z',
	];
	const MUG_WAVES = [
		'M-8 13 Q-2 9 4 13 T16 13 T28 13 T40 13 V34 H-8 Z',
		'M-4 15 Q2 11 8 15 T20 15 T32 15 V34 H-4 Z',
		'M0 14 Q6 10 12 14 T24 14 T36 14 V34 H0 Z',
	];

	/** BLS Trinkwasser (N110000) per100g */
	const WATER_PER100G = {
		calories: 0, protein: 0, fat: 0, saturatedFat: 0, carbs: 0, fiber: 0, sugars: 0,
		calcium: 5.3, iron: 0, magnesium: 0.9, phosphorus: 0.011, potassium: 0.2,
		sodium: 2.3, zinc: 0.001, vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminE: 0,
		vitaminK: 0, thiamin: 0, riboflavin: 0, niacin: 0, vitaminB6: 0, vitaminB12: 0,
		folate: 0, cholesterol: 0,
	};

	/** Detect if a food log entry is a beverage (non-water) */
	/** @param {FoodLogEntry} e */
	function isBeverage(e) {
		if (e.mealType === 'water') return false;
		// By code first: the milk blends carry `M` codes and an English name the
		// German-worded patterns below would never match.
		if (isHotDrinkRef(e.source, e.sourceId)) return true;
		if (e.source === 'bls' && e.sourceId?.startsWith('N')) return true;
		return DRINK_PATTERNS.test(e.name);
	}

	let waterGoalMl = $state(2000);
	let editingGoal = $state(false);
	let goalInputL = $state(2);

	$effect(() => {
		const saved = localStorage.getItem('water_goal_ml');
		if (saved) {
			const v = parseInt(saved);
			if (v > 0) waterGoalMl = v;
		}
	});

	function saveGoal() {
		const ml = Math.max(250, Math.round(goalInputL * 1000));
		waterGoalMl = ml;
		localStorage.setItem('water_goal_ml', String(ml));
		editingGoal = false;
	}

	let waterEntries = $derived(entries.filter((/** @type {FoodLogEntry} */ e) => e.mealType === 'water'));
	let beverageEntries = $derived(entries.filter(isBeverage));
	// Hot drinks are drawn as mugs rather than glasses, so they are counted apart
	// from the cold ones instead of being folded into a single beverage block.
	let hotDrinkEntries = $derived(beverageEntries.filter((/** @type {FoodLogEntry} */ e) => isHotDrinkRef(e.source, e.sourceId)));
	let coldBeverageEntries = $derived(beverageEntries.filter((/** @type {FoodLogEntry} */ e) => !isHotDrinkRef(e.source, e.sourceId)));
	let waterMl = $derived(waterEntries.reduce((/** @type {number} */ s, /** @type {FoodLogEntry} */ e) => s + e.amountGrams, 0));
	let beverageMl = $derived(beverageEntries.reduce((/** @type {number} */ s, /** @type {FoodLogEntry} */ e) => s + e.amountGrams, 0));
	let hotDrinkMl = $derived(hotDrinkEntries.reduce((/** @type {number} */ s, /** @type {FoodLogEntry} */ e) => s + e.amountGrams, 0));
	let coldBeverageMl = $derived(coldBeverageEntries.reduce((/** @type {number} */ s, /** @type {FoodLogEntry} */ e) => s + e.amountGrams, 0));
	let mealLiquidMl = $derived(entries.reduce((/** @type {number} */ s, /** @type {FoodLogEntry} */ e) => s + (e.liquidMl ?? 0), 0));
	let totalLiquidMl = $derived(waterMl + beverageMl + mealLiquidMl);
	let hotDrinkCups = $derived(Math.round(hotDrinkMl / WATER_CUP_ML));
	let coldBeverageCups = $derived(Math.round(coldBeverageMl / WATER_CUP_ML));
	let beverageCups = $derived(hotDrinkCups + coldBeverageCups);
	let waterCups = $derived(Math.round(waterMl / WATER_CUP_ML));
	let mealLiquidCups = $derived(Math.round(mealLiquidMl / WATER_CUP_ML));
	let totalCups = $derived(beverageCups + waterCups + mealLiquidCups);
	let goalCups = $derived(Math.round(waterGoalMl / WATER_CUP_ML));

	/** @type {Set<number>} cups currently animating fill/drain */
	let fillingCups = $state(new Set());
	let drainingCups = $state(new Set());
	/**
	 * Runs held at their pre-removal values while cups empty.
	 *
	 * Water is the last run, so a glass leaving shifts nothing and the animation
	 * could play against live counts. A mug is the first: the moment its entry goes,
	 * every cup behind it slides one place left, the add button jumps with them, and
	 * the drain plays out over whatever water glass inherited the spot. Holding the
	 * layout for the 700 ms keeps the cup that is emptying where the user pressed it.
	 * @type {number[] | null}
	 */
	let frozenRuns = $state(null);

	/** The row's four runs, in the order they are drawn — see `cupRowChange`. */
	const cupRuns = $derived([hotDrinkCups, coldBeverageCups, mealLiquidCups, waterCups]);

	/** What the row draws: frozen mid-drain, live otherwise. */
	const rowRuns = $derived(frozenRuns ?? cupRuns);
	const rowHotCups = $derived(rowRuns[0]);
	const rowBeverageCups = $derived(rowRuns[0] + rowRuns[1]);
	const rowMealLiquidCups = $derived(rowRuns[2]);
	const rowTotalCups = $derived(rowRuns[0] + rowRuns[1] + rowRuns[2] + rowRuns[3]);
	let displayCups = $derived(Math.max(goalCups, rowTotalCups + 1));

	/**
	 * Last render's runs. A plain `let`, deliberately: nothing in the template reads
	 * it, and as `$state` the array would be deep-proxied on write, so the next read
	 * never equalled what was stored and this effect re-triggered itself until
	 * Svelte gave up with effect_update_depth_exceeded. The old counter got away
	 * with the same read-write shape only because a number reassigned to its own
	 * value is a no-op.
	 * @type {number[] | null}
	 */
	let lastCupRuns = null;

	$effect(() => {
		const cur = cupRuns;
		const prev = lastCupRuns;
		lastCupRuns = cur;
		if (!prev) return;

		const change = cupRowChange(prev, cur);
		if (!change) return;

		if (change.kind === 'fill') {
			fillingCups = new Set(change.indices);
			setTimeout(() => { fillingCups = new Set(); }, 1500);
		} else {
			frozenRuns = prev;
			drainingCups = new Set(change.indices);
			setTimeout(() => { drainingCups = new Set(); frozenRuns = null; }, 700);
		}
	});

	/** @param {number} target */
	async function setWaterCups(target) {
		const current = waterCups;
		if (target === current) return;
		try {
			if (target > current) {
				const toAdd = target - current;
				const promises = Array.from({ length: toAdd }, () =>
					fetch('/api/fitness/food-log', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							date: currentDate,
							mealType: 'water',
							name: 'Trinkwasser',
							source: 'bls',
							sourceId: 'N110000',
							amountGrams: WATER_CUP_ML,
							per100g: WATER_PER100G,
						})
					}).then(r => r.ok ? r.json() : null)
				);
				const results = await Promise.all(promises);
				const newEntries = results.filter(Boolean);
				for (const e of newEntries) addEntry(e);
			} else {
				const toRemove = waterEntries.slice(target);
				const ids = toRemove.map((/** @type {FoodLogEntry} */ e) => e._id);
				await Promise.all(ids.map((/** @type {string} */ id) =>
					fetch(`/api/fitness/food-log/${id}`, { method: 'DELETE' })
				));
				entries = entries.filter((/** @type {FoodLogEntry} */ e) => !ids.includes(e._id));
			}
		} catch {
			toast.error(isEn ? 'Failed to update water' : 'Fehler beim Aktualisieren');
		}
	}

	/**
	 * Trim the mugs back to `target`, the way clicking a glass trims the water.
	 *
	 * The row shows hot drinks as one run of 250 ml mugs, but underneath it may be
	 * several entries of several drinks and odd sizes, so this takes the excess off
	 * the newest end: whole entries go, and the one the boundary lands inside is
	 * scaled down to meet it.
	 * @param {number} target
	 */
	async function setHotDrinkCups(target) {
		let excess = hotDrinkMl - target * WATER_CUP_ML;
		if (excess <= 0) return;

		/** @type {FoodLogEntry[]} */
		const toRemove = [];
		/** @type {{ entry: FoodLogEntry, amountGrams: number }[]} */
		const toShrink = [];
		for (const entry of [...hotDrinkEntries].reverse()) {
			if (excess <= 0.5) break;
			if (entry.amountGrams <= excess + 0.5) {
				toRemove.push(entry);
				excess -= entry.amountGrams;
			} else {
				toShrink.push({ entry, amountGrams: entry.amountGrams - excess });
				excess = 0;
			}
		}

		try {
			const removedIds = toRemove.map(e => e._id);
			const [, ...shrunk] = await Promise.all([
				Promise.all(removedIds.map(id =>
					fetch(`/api/fitness/food-log/${id}`, { method: 'DELETE' })
						.then(r => { if (!r.ok) throw new Error('delete failed'); })
				)),
				...toShrink.map(({ entry, amountGrams }) =>
					fetch(`/api/fitness/food-log/${entry._id}`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ amountGrams }),
					}).then(r => r.ok ? r.json() : Promise.reject(new Error('update failed')))
				),
			]);
			/** @type {Map<string, FoodLogEntry>} */
			const updated = new Map(shrunk.map((/** @type {FoodLogEntry} */ e) => [e._id, e]));
			entries = entries
				.filter((/** @type {FoodLogEntry} */ e) => !removedIds.includes(e._id))
				.map((/** @type {FoodLogEntry} */ e) => updated.get(e._id) ?? e);
		} catch {
			toast.error(isEn ? 'Failed to update drinks' : 'Getränke konnten nicht aktualisiert werden');
		}
	}

	// --- One-tap hot drink ---
	// Someone who drinks eight cups of tea a day should not walk the food search
	// eight times. The button logs a fixed 250 ml of one chosen BLS drink into the
	// slot the clock says we're in, and a second press grows that row instead of
	// stacking another identical one.
	// Seeded from the cookies the server already read, so the button is either in the
	// first paint or absent from it — never rendered and then withdrawn.
	// svelte-ignore state_referenced_locally
	let hotDrinkEnabled = $state(data.hotDrink?.enabled ?? true);
	// svelte-ignore state_referenced_locally
	let hotDrinkCode = $state(data.hotDrink?.code ?? DEFAULT_HOT_DRINK_CODE);
	let showDrinkSettings = $state(false);
	let loggingHotDrink = $state(false);

	const hotDrink = $derived(resolveHotDrink(hotDrinkCode));
	/** Short form, for the button and the picker. */
	const hotDrinkName = $derived(hotDrinkLabel(hotDrink, isEn));

	$effect(() => {
		const enabled = hotDrinkEnabled ? '1' : '0';
		const code = hotDrinkCode;
		const attrs = `path=/; max-age=${HOT_DRINK_COOKIE_MAX_AGE}; SameSite=Lax`;
		document.cookie = `${HOT_DRINK_ENABLED_COOKIE}=${enabled}; ${attrs}`;
		document.cookie = `${HOT_DRINK_CODE_COOKIE}=${code}; ${attrs}`;
	});

	async function logHotDrink() {
		if (loggingHotDrink) return;
		loggingHotDrink = true;
		const mealType = defaultMealType();
		const existing = entries.find((/** @type {FoodLogEntry} */ e) =>
			e.mealType === mealType && e.source === 'bls' && e.sourceId === hotDrink.code);
		try {
			if (existing) {
				const res = await fetch(`/api/fitness/food-log/${existing._id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ amountGrams: existing.amountGrams + HOT_DRINK_ML }),
				});
				if (!res.ok) throw new Error('update failed');
				const updated = await res.json();
				entries = entries.map((/** @type {FoodLogEntry} */ e) => e._id === existing._id ? updated : e);
			} else {
				const entry = await postFoodLog({
					date: currentDate,
					mealType,
					name: hotDrinkLogName(hotDrink),
					source: 'bls',
					sourceId: hotDrink.code,
					amountGrams: HOT_DRINK_ML,
				});
				if (!entry) throw new Error('log failed');
				addEntry(entry);
			}
		} catch {
			toast.error(isEn ? 'Failed to log drink' : 'Getränk konnte nicht erfasst werden');
		} finally {
			loggingHotDrink = false;
		}
	}

	/**
	 * @param {FoodLogEntry} e
	 * @param {string} key
	 */
	function entryNutrient(e, key) {
		return scaleFromPer100g(/** @type {Record<string, number>} */ (e.per100g ?? {})[key], e.amountGrams);
	}

	const microKeys = ['calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc',
		'vitaminA', 'retinol', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK', 'thiamin', 'riboflavin', 'niacin',
		'vitaminB6', 'vitaminB12', 'folate', 'pantothenicAcid', 'biotin', 'cholesterol', 'caffeine',
		// Carbohydrate detail, summed here with the rest rather than in its own pass —
		// the values come from the same per-100 g record and scale the same way.
		'starch', 'fructose', 'lactose'];
	const aminoKeys = ['isoleucine', 'leucine', 'lysine', 'methionine', 'phenylalanine',
		'threonine', 'tryptophan', 'valine', 'histidine', 'alanine', 'arginine',
		'asparticAcid', 'cysteine', 'glutamicAcid', 'glycine', 'proline', 'serine', 'tyrosine'];

	// Open Food Facts products carry macros only, so anything logged from them is
	// absent from the micro totals below.
	const microCov = $derived(microCoverage(entries.filter(e => e.mealType !== 'water')));
	const coverageGaps = $derived.by(() => {
		/** @type {string[]} */
		const gaps = [];
		const names = { minerals: isEn ? 'minerals' : 'Mineralstoffe', vitamins: isEn ? 'vitamins' : 'Vitamine', aminos: isEn ? 'amino acids' : 'Aminosäuren' };
		for (const g of /** @type {const} */ (['minerals', 'vitamins', 'aminos'])) {
			const missingPct = Math.round((1 - microCov.ratios[g]) * 100);
			if (missingPct >= 1) gaps.push(`${names[g]} ${missingPct}%`);
		}
		return gaps;
	});

	const dayTotals = $derived.by(() => {
		let calories = 0, protein = 0, fat = 0, carbs = 0, fiber = 0, sugars = 0, saturatedFat = 0, alcohol = 0;
		// Neither macro nor alcohol, but both carry energy — see energySources.
		let sugarAlcohols = 0, organicAcids = 0;
		// Fat and carbohydrate composition. `unknown` collects the mass from entries
		// whose source published no breakdown, kept apart from `other` (the measured
		// remainder) so the bar never implies a food was characterised when it wasn't.
		const composition = {
			saturated: 0, mono: 0, poly: 0, trans: 0, fatOther: 0, fatUnknown: 0,
			carbOther: 0, carbUnknown: 0,
		};
		/** @type {Record<string, number>} */
		const micros = {};
		/** @type {Record<string, number>} */
		const aminos = {};
		// Summed only over the entries that report each acid, so a food without a fat
		// panel leaves these alone rather than dragging them toward zero.
		/** @type {Record<string, number>} */
		const fats = {};
		for (const k of microKeys) micros[k] = 0;
		for (const k of aminoKeys) aminos[k] = 0;

		for (const e of entries) {
			const r = e.amountGrams / 100;
			const p = /** @type {Record<string, number>} */ (e.per100g ?? {});
			calories += entryCalories(e);
			protein += (p.protein ?? 0) * r;
			fat += (p.fat ?? 0) * r;
			carbs += (p.carbs ?? 0) * r;
			fiber += (p.fiber ?? 0) * r;
			sugars += (p.sugars ?? 0) * r;
			saturatedFat += (p.saturatedFat ?? 0) * r;
			// Absent means none rather than unmeasured — see NutritionPer100g.alcohol.
			alcohol += (p.alcohol ?? 0) * r;
			sugarAlcohols += (p.sugarAlcohols ?? 0) * r;
			organicAcids += (p.organicAcids ?? 0) * r;
			for (const k of microKeys) micros[k] += (p[k] ?? 0) * r;
			for (const k of aminoKeys) aminos[k] += (p[k] ?? 0) * r;

			const fs = fatSplit(p);
			if (fs.hasBreakdown) {
				composition.saturated += (fs.saturated ?? 0) * r;
				composition.mono += (fs.mono ?? 0) * r;
				composition.poly += (fs.poly ?? 0) * r;
				composition.trans += (fs.trans ?? 0) * r;
				composition.fatOther += fs.unaccounted * r;
			} else {
				composition.fatUnknown += fs.fat * r;
			}

			const cs = carbSplit(p);
			if (cs.hasBreakdown) composition.carbOther += cs.other * r;
			else composition.carbUnknown += cs.carbs * r;

			for (const k of /** @type {string[]} */ ([...FAT_GROUP_KEYS, ...ACID_KEYS])) {
				const v = p[k];
				if (typeof v === 'number') fats[k] = (fats[k] ?? 0) + v * r;
			}
			// Derived per entry rather than from the summed acids: a food logged from
			// Open Food Facts carries a stored omega-3 total and no breakdown, one from
			// USDA carries the acids and no total, and only the per-record view knows
			// which is which. Same rule as the averages endpoint.
			const { omega3, omega6 } = omegaTotalsOf(p);
			if (omega3) fats.omega3 = (fats.omega3 ?? 0) + omega3.value * r;
			if (omega6) fats.omega6 = (fats.omega6 ?? 0) + omega6.value * r;
			// EPA + DHA is the pair the marine omega-3 reference is set against, and it
			// is derived per entry for the same reason the omega totals are.
			const ed = epaDhaOf(p);
			if (ed) fats.epaDha = (fats.epaDha ?? 0) + ed.value * r;
		}
		// Trace minerals are summed over the entries reporting each one, with the share
		// of the day that covers, so a mineral BLS or USDA never measured is shown as
		// missing rather than as zero.
		const traces = traceTotals(entries);
		return { calories, protein, fat, carbs, fiber, sugars, saturatedFat, alcohol, sugarAlcohols, organicAcids, micros, aminos, composition, fats, traces };
	});

	// Energy eaten, from each food's own kcal figure rather than an Atwater sum of
	// its macros — see entryCalories. Beer is the clearest case: its alcohol carries
	// most of its calories and none of its macros.
	const eatenCalories = $derived(dayTotals.calories);

	// Macro percentages by calorie contribution. Atwater-based on purpose: this is
	// the split *between the three macros*, matched to the macro goals, so kcal from
	// anything else (alcohol) is outside it and the three still sum to 100.
	const macroPercent = $derived(macroCaloriePercent(dayTotals));

	const fatSegments = $derived([
		{ key: 'saturated', label: isEn ? 'Saturated' : 'Gesättigt', value: dayTotals.composition.saturated, color: 'var(--orange)' },
		{ key: 'mono', label: isEn ? 'Monounsaturated' : 'Einfach ungesättigt', value: dayTotals.composition.mono, color: 'var(--green)' },
		{ key: 'poly', label: isEn ? 'Polyunsaturated' : 'Mehrfach ungesättigt', value: dayTotals.composition.poly, color: 'var(--blue)' },
		{ key: 'trans', label: isEn ? 'Trans' : 'Trans', value: dayTotals.composition.trans, color: 'var(--red)' },
		{ key: 'fatOther', label: isEn ? 'Glycerol & other lipids' : 'Glycerin & andere Lipide', value: dayTotals.composition.fatOther, color: 'var(--color-bg-elevated)' },
		{ key: 'fatUnknown', label: isEn ? 'Not broken down' : 'Ohne Aufschlüsselung', value: dayTotals.composition.fatUnknown, color: 'var(--color-bg-elevated)', unknown: true },
	]);

	const carbSegments = $derived([
		{ key: 'sugars', label: isEn ? 'Sugars' : 'Zucker', value: dayTotals.sugars, color: 'var(--red)' },
		{ key: 'fiber', label: isEn ? 'Fibre' : 'Ballaststoffe', value: dayTotals.fiber, color: 'var(--green)' },
		{ key: 'carbOther', label: isEn ? 'Starch & other' : 'Stärke & übrige', value: dayTotals.composition.carbOther, color: 'var(--lightblue)' },
		{ key: 'carbUnknown', label: isEn ? 'Not broken down' : 'Ohne Aufschlüsselung', value: dayTotals.composition.carbUnknown, color: 'var(--color-bg-elevated)', unknown: true },
	]);

	// Where the day's kcal came from. Sits beside the fat and carbohydrate bars
	// because it answers the same kind of question, and because it is the only place
	// the ring's number is reconciled with the macros underneath it — a day with a
	// beer in it reads 'eaten' well above 4/9/4, and this says why.
	const energySegments = $derived.by(() => {
		const e = energySources(dayTotals, dayTotals.calories);
		return [
			{ key: 'protein', label: t.protein, value: e.protein, color: 'var(--green)' },
			{ key: 'fat', label: t.fat, value: e.fat, color: 'var(--orange)' },
			{ key: 'carbs', label: t.carbs, value: e.carbs, color: 'var(--lightblue)' },
			{ key: 'alcohol', label: isEn ? 'Alcohol' : 'Alkohol', value: e.alcohol, color: 'var(--red)' },
			{ key: 'sugarAlcohols', label: isEn ? 'Sugar alcohols' : 'Zuckeralkohole', value: e.sugarAlcohols, color: 'var(--nord15)' },
			{ key: 'organicAcids', label: isEn ? 'Organic acids' : 'Organische Säuren', value: e.organicAcids, color: 'var(--nord12)' },
			{ key: 'energyOther', label: isEn ? 'Not attributed' : 'Nicht zugeordnet', value: e.other, color: 'var(--color-bg-elevated)', unknown: true },
		];
	});

	const hasComposition = $derived(dayTotals.fat > 0 || dayTotals.carbs > 0);

	/** Spells out what a relative percentage is a percentage *of*, since the column
	 *  otherwise reads as a share of a reference intake like every row around it. */
	function relativeTitle(/** @type {string} */ parentKey) {
		const meta = NUTRIENT_META[/** @type {keyof typeof NUTRIENT_META} */ (parentKey)];
		const label = isEn ? meta.label : meta.labelDe;
		return isEn ? `Share of ${label.toLowerCase()}` : `Anteil an ${label}`;
	}

	/** Deep dive into which foods supplied a nutrient on the day being viewed. */
	function nutrientHref(/** @type {string} */ key) {
		return resolve('/fitness/[nutrition=fitnessNutrition]/nutrient/[key]', {
			nutrition: s.nutrition,
			key,
		}) + `?date=${currentDate}`;
	}

	// Names the energy the fatty acid ceilings were computed from, so a target that
	// differs from the textbook 2000/1600 kcal figure is explained rather than odd.
	const energyBasisLabel = $derived(
		goalCalories
			? (isEn ? `your ${Math.round(goalCalories).toLocaleString('en-US')} kcal goal` : `dein Ziel von ${Math.round(goalCalories).toLocaleString('de-CH')} kcal`)
			: (isEn ? `a ${REFERENCE_ENERGY[/** @type {'male' | 'female'} */ (goalSex)].toLocaleString('en-US')} kcal reference day` : `einen Referenztag mit ${REFERENCE_ENERGY[/** @type {'male' | 'female'} */ (goalSex)].toLocaleString('de-CH')} kcal`)
	);

	// --- Burned kcal ---
	// svelte-ignore state_referenced_locally
	let exerciseKcal = $state(Number(data.exerciseKcal) || 0);
	// svelte-ignore state_referenced_locally
	let projectedExercise = $state(data.projectedExercise ?? null);
	let includeProjection = $state(false);

	const effectiveBurned = $derived(exerciseKcal || (includeProjection && projectedExercise ? projectedExercise.kcal : 0));

	// Effective daily calorie goal including exercise burned calories
	const effectiveCalorieGoal = $derived(goalCalories ? goalCalories + effectiveBurned : null);

	// Macro targets in grams. Shared with the server, which builds the "finish your
	// day" nudges from what is left of them (see $lib/fitness/macroGoals): protein is
	// body-weight-based and unaffected by exercise, so extra exercise calories flow
	// into fat and carbs.
	// The weight a per-kg protein goal is read against: the *trend* on the viewed
	// day, never a raw reading. A single measurement carries a kilo of water noise,
	// so a target set from it moves for reasons that have nothing to do with the
	// goal; and for a past day it has to be the trend as it stood *then*, or last
	// month's diary restates its target against today's scale. `latestWeight` is
	// only a fallback for when the history request itself failed.
	const goalWeightKg = $derived(data.trendWeight ?? latestWeight);

	const macroGoals = $derived(macroGoalGrams({
		calorieGoal: effectiveCalorieGoal,
		proteinMode: goalProteinMode,
		proteinTarget: goalProteinTarget,
		weightKg: goalWeightKg,
		fatPercent: goalFatPercent,
		carbPercent: goalCarbPercent,
	}));
	const proteinGoalGrams = $derived(macroGoals.protein);
	const fatGoalGrams = $derived(macroGoals.fat);
	const carbGoalGrams = $derived(macroGoals.carbs);

	// BMR via Mifflin-St Jeor (doi:10.1093/ajcn/51.2.241)
	const birthYear = $derived(data.goal?.birthYear ?? null);
	const userAge = $derived(birthYear ? new Date().getFullYear() - birthYear : null);
	const hasBmrData = $derived(latestWeight != null && data.goal?.heightCm != null && birthYear != null);

	const dailyBmr = $derived.by(() => {
		const w = Number(latestWeight) || 80;
		const h = Number(data.goal?.heightCm) || 175;
		const age = userAge ?? 30;
		return computeBmr(w, h, age, goalSex);
	});

	const dailyTdee = $derived(dailyBmr * activityMultiplier(activityLevel));

	// TDEE comparison bar (for goal editor)
	const editTdee = $derived(dailyBmr * activityMultiplier(editActivityLevel));
	const editCalNum = $derived(Number(editCalories) || 0);
	const tdeeBarData = $derived.by(() => {
		const tdee = Math.round(editTdee);
		const target = editCalNum;
		if (!tdee || !target) return null;
		const diff = target - tdee;
		const pctOfTdee = Math.round((diff / tdee) * 100);
		let zone = 'maintenance';
		if (diff < -50) zone = 'deficit';
		else if (diff > 50) zone = 'surplus';
		// Target as percentage of TDEE (TDEE = 100% reference)
		const targetPct = Math.min((target / tdee) * 100, 150);
		return { tdee, target, diff, pctOfTdee, zone, targetPct };
	});

	// TDEE (excl. exercise) prorated to current time of day (for today only)
	const tdeeSoFar = $derived.by(() => {
		if (currentDate !== todayStr) return Math.round(dailyTdee);
		const now = new Date();
		const fraction = (now.getHours() * 60 + now.getMinutes()) / 1440;
		return Math.round(dailyTdee * fraction);
	});



	// Net calorie balance: effective goal (includes exercise) - eaten
	// Against the foods' own kcal, so the ring matches what the server logged and
	// what each row shows
	const calorieBalance = $derived(effectiveCalorieGoal ? (effectiveCalorieGoal - eatenCalories) : 0);
	const calorieProgressRaw = $derived(effectiveCalorieGoal ? eatenCalories / effectiveCalorieGoal * 100 : 0);
	const calorieProgress = $derived(Math.min(calorieProgressRaw, 100));
	const calorieOverflow = $derived(Math.max(calorieProgressRaw - 100, 0));

	// Round-off suggestions
	const remainingProtein = $derived(proteinGoalGrams ? proteinGoalGrams - dayTotals.protein : 0);
	const remainingFat = $derived(fatGoalGrams ? fatGoalGrams - dayTotals.fat : 0);
	const remainingCarbs = $derived(carbGoalGrams ? carbGoalGrams - dayTotals.carbs : 0);
	const isTodayOrFuture = $derived(currentDate >= todayStr);

	// --- Copy from yesterday ---
	// The ids that came back are kept so undo removes exactly what was copied, rather
	// than clearing the day and taking anything logged since with it.
	let copying = $state(false);
	let copiedIds = $state(/** @type {string[]} */ ([]));

	$effect(() => {
		// Leaving the day invalidates the undo — those ids belong to another date.
		currentDate;
		copiedIds = [];
	});

	async function copyYesterday() {
		copying = true;
		try {
			const res = await fetch('/api/fitness/food-log/copy-day', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ from: prevDate, to: currentDate }),
			});
			if (!res.ok) throw new Error('copy failed');
			const d = await res.json();
			if (!d.copied) {
				toast.info(isEn ? 'Nothing logged yesterday' : 'Gestern nichts erfasst');
				return;
			}
			copiedIds = d.ids ?? [];
			await invalidateAll();
		} catch {
			toast.error(isEn ? 'Could not copy yesterday' : 'Kopieren fehlgeschlagen');
		} finally {
			copying = false;
		}
	}

	async function undoCopyYesterday() {
		copying = true;
		try {
			await Promise.all(copiedIds.map(id => fetch(`/api/fitness/food-log/${id}`, { method: 'DELETE' })));
			copiedIds = [];
			await invalidateAll();
		} catch {
			toast.error(isEn ? 'Could not undo the copy' : 'Rückgängig machen fehlgeschlagen');
		} finally {
			copying = false;
		}
	}

	/**
	 * Suggestions for finishing the day. The card decides for itself whether it has
	 * anything worth saying — an empty list renders nothing — so the only gate here
	 * is whether the day can still be added to at all. The old percentage-of-goal
	 * window is gone with the solver it belonged to.
	 */
	// Seeded from the server, so the card is in the first paint instead of appearing a
	// beat after hydration. The effect below only takes over once the numbers it was
	// built from no longer match.
	// svelte-ignore state_referenced_locally
	let nudges = $state(/** @type {any[]} */ (data.nudges ?? []));
	const showRoundOff = $derived(isTodayOrFuture && !!goalCalories && calorieBalance > 0 && nudges.length > 0);

	$effect(() => {
		const remaining = {
			kcal: Math.round(calorieBalance),
			protein: Math.round(remainingProtein),
			fat: Math.round(remainingFat),
			carbs: Math.round(remainingCarbs),
		};
		if (!isTodayOrFuture || !goalCalories || calorieBalance <= 0) {
			nudges = [];
			return;
		}
		// The server already built this exact list — from the same four numbers, for the
		// same day — so re-requesting it on hydration would only spend a round trip to
		// arrive at what is already on screen. Any drift (a logged food, an edited goal,
		// or client math that disagrees) fails the comparison and refetches.
		const ssr = data.nudgesRemaining;
		if (
			data.date === currentDate && ssr &&
			ssr.kcal === remaining.kcal && ssr.protein === remaining.protein &&
			ssr.fat === remaining.fat && ssr.carbs === remaining.carbs
		) return;

		const q = new URLSearchParams({
			date: currentDate,
			remainingKcal: String(remaining.kcal),
			remainingProtein: String(remaining.protein),
			remainingFat: String(remaining.fat),
			remainingCarbs: String(remaining.carbs),
		});
		let cancelled = false;
		fetch(`/api/fitness/nudges?${q}`)
			.then(r => (r.ok ? r.json() : { nudges: [] }))
			.then(d => { if (!cancelled) nudges = d.nudges ?? []; })
			.catch(() => { if (!cancelled) nudges = []; });
		return () => { cancelled = true; };
	});

	// DRI for micros
	// The fatty acid references are shares of energy, so they follow the calorie goal
	// rather than a fixed 2000/1600 kcal figure. The goal excludes exercise burn: the
	// ceiling should not rise because of a workout, and a target that moved during the
	// day would let the same meal pass or fail depending on when it was looked at.
	const dri = $derived(getDRI(goalSex, goalCalories));

	// SVG ring constants (same as NutritionSummary)
	const RADIUS = 28;
	const ARC_DEGREES = 300;
	const ARC_LENGTH = (ARC_DEGREES / 360) * 2 * Math.PI * RADIUS;
	const ARC_ROTATE = 120;

	/** @param {number} percent */
	function strokeOffset(percent) {
		return ARC_LENGTH - (Math.min(percent, 100) / 100) * ARC_LENGTH;
	}

	/**
	 * Stroke offset for overflow arc drawn from the end backwards
	 * @param {number} overflowPct
	 */
	function overflowOffset(overflowPct) {
		return ARC_LENGTH - (Math.min(overflowPct, 100) / 100) * ARC_LENGTH;
	}

	// --- Inline add food ---
	/** @type {string | null} */
	let addingMeal = $state(null);
	let inlineTab = $state('search'); // 'search' | 'favorites' | 'recent' | 'meals'
	// One shared search string for the whole add-food flow, so the input persists
	// when switching between the Search / Favorites / Recent / Meals tabs. Reset
	// each time the add-food UI is (re)opened. Inline and FAB are never usefully
	// open at once, so a single value is fine.
	let addFoodQuery = $state('');

	// --- FAB modal (route-based via ?add param) ---
	const showFabModal = $derived(page.url.searchParams.has('add'));
	let fabMealType = $state('lunch');

	const fabHref = $derived(`${resolve('/fitness/[nutrition=fitnessNutrition]', { nutrition: s.nutrition })}?add`);

	// Reset modal state when it opens
	$effect(() => {
		if (showFabModal) {
			fabMealType = defaultMealType();
			fabTab = 'search';
			addFoodQuery = '';
			loadCustomMeals();
		}
	});

	function closeFabModal() {
		selectedCmMeal = null;
		goto(`/fitness/${s.nutrition}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	/**
	 * POST one food-log entry.
	 * @param {Record<string, unknown>} body
	 * @returns {Promise<FoodLogEntry | null>} the created entry, or null when the server refused it
	 */
	async function postFoodLog(body) {
		const res = await fetch('/api/fitness/food-log', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		return res.ok ? res.json() : null;
	}

	/**
	 * Log a food into `mealType` of the day being viewed; `onDone` runs once it is in.
	 * @param {FoodSelection} food
	 * @param {string | null} mealType
	 * @param {() => void} onDone
	 */
	async function logFood(food, mealType, onDone) {
		try {
			const entry = await postFoodLog({
				date: currentDate,
				mealType,
				name: food.name,
				source: food.source,
				sourceId: food.sourceId,
				amountGrams: food.amountGrams,
				portions: food.portions,
				selectedPortion: food.selectedPortion,
				per100g: food.per100g,
			});
			if (entry) {
				addEntry(entry);
				onDone();
			}
		} catch {
			toast.error(isEn ? 'Failed to log food' : 'Fehler beim Eintragen');
		}
	}

	/**
	 * Log a custom meal as one food (its ingredients blended per 100 g), all of
	 * it or `amountGrams` of it. `onDone` runs whether or not the server took it.
	 * @param {CustomMeal} meal
	 * @param {number | null} amountGrams
	 * @param {string | null} mealType
	 * @param {() => void} onDone
	 */
	async function logMeal(meal, amountGrams, mealType, onDone) {
		try {
			const { per100g, totalGrams, liquidMl } = aggregateMealPer100g(meal);
			const logGrams = amountGrams ?? totalGrams;
			const liquidScale = totalGrams > 0 ? logGrams / totalGrams : 0;

			const entry = await postFoodLog({
				date: currentDate,
				mealType,
				name: meal.name,
				source: 'custom',
				sourceId: meal._id,
				amountGrams: logGrams,
				per100g,
				...(liquidMl > 0 && { liquidMl: liquidMl * liquidScale }),
			});
			if (entry) addEntry(entry);
			selectedCmMeal = null;
			onDone();
			toast.success(isEn ? `Logged "${meal.name}"` : `"${meal.name}" eingetragen`);
		} catch {
			toast.error(isEn ? 'Failed to log meal' : 'Fehler beim Eintragen');
		}
	}

	/** @param {FoodSelection} food */
	function fabLogFood(food) {
		return logFood(food, fabMealType, closeFabModal);
	}

	// --- Custom meals in FAB ---
	let fabTab = $state('search'); // 'search' | 'favorites' | 'recent' | 'meals'

	/** @typedef {{ name: string, source: string, id: string, per100g: Record<string, number>, portions?: any, calories: number, favorited: boolean }} FavTabItem */

	// --- Favorites tab ---
	/** @type {FavTabItem[]} */
	let favTabItems = $state([]); // enriched with per100g
	let favTabLoaded = $state(false);

	async function loadFavTab(force = false) {
		if (favTabLoaded && !force) return;
		const favs = quickFavorites;
		// Fetch per100g for each favorite in parallel
		const enriched = await Promise.all(favs.map(async (/** @type {{ name: string, source: string, sourceId: string }} */ fav) => {
			try {
				const res = await fetch(`/api/nutrition/lookup?source=${fav.source}&id=${encodeURIComponent(fav.sourceId)}`);
				if (res.ok) {
					const d = await res.json();
					return {
						name: fav.name,
						source: fav.source,
						id: fav.sourceId,
						per100g: d.per100g,
						portions: d.portions,
						calories: Math.round(d.per100g?.calories ?? 0),
						favorited: true,
					};
				}
			} catch {}
			return null;
		}));
		favTabItems = /** @type {FavTabItem[]} */ (enriched.filter(Boolean));
		favTabLoaded = true;
	}

	// --- Recent tab ---
	/** @type {FavTabItem[]} */
	let recentTabItems = $state([]); // enriched with per100g
	let recentTabLoaded = $state(false);

	async function loadRecentTab() {
		// Always re-enrich on open so freshly logged foods show up. Existing items
		// stay visible until the new list resolves, so there's no loading flash.
		const items = /** @type {RecentFood[]} */ (/** @type {unknown} */ (recentFoods));
		const enriched = await Promise.all(items.map(async (item) => {
			try {
				let per100g = item.per100g;
				/** @type {any} */
				let portions;
				if (!per100g) {
					const res = await fetch(`/api/nutrition/lookup?source=${item.source}&id=${encodeURIComponent(item.sourceId)}`);
					if (res.ok) {
						const d = await res.json();
						per100g = d.per100g;
						portions = d.portions;
					}
				}
				if (!per100g) return null;
				return {
					name: item.name,
					source: item.source,
					id: item.sourceId,
					per100g,
					portions,
					calories: Math.round(per100g?.calories ?? 0),
					favorited: quickFavorites.some(f => f.source === item.source && f.sourceId === item.sourceId),
				};
			} catch {}
			return null;
		}));
		recentTabItems = /** @type {FavTabItem[]} */ (enriched.filter(Boolean));
		recentTabLoaded = true;
	}
	/** @type {CustomMeal[]} */
	let customMeals = $state([]);
	let customMealsLoaded = $state(false);

	// Custom meal filter
	const filteredCustomMeals = $derived(
		addFoodQuery
			? customMeals.filter(cm => cm.name.toLowerCase().includes(addFoodQuery.toLowerCase()))
			: customMeals
	);

	// Custom meal detail screen (replaces meal list when a meal is selected)
	/** @type {CustomMeal | null} */
	let selectedCmMeal = $state(null);
	let cmAmountMode = $state('multiplier'); // 'multiplier' | 'grams'
	let cmAmountVal = $state(1.0);

	/** @param {CustomMeal} meal */
	function selectCmMeal(meal) {
		selectedCmMeal = meal;
		cmAmountMode = 'multiplier';
		cmAmountVal = 1.0;
	}

	function deselectCmMeal() {
		selectedCmMeal = null;
	}

	/** @param {CustomMeal} meal */
	function cmResolvedGrams(meal) {
		const base = mealTotalGrams(meal);
		if (cmAmountMode === 'grams') return cmAmountVal;
		return base * cmAmountVal;
	}

	/**
	 * Preview macros scaled to the selected amount
	 * @param {CustomMeal} meal
	 */
	function cmPreview(meal) {
		return mealPreview(meal, cmResolvedGrams(meal));
	}



	async function loadCustomMeals() {
		if (customMealsLoaded) return;
		try {
			const res = await fetch('/api/fitness/custom-meals');
			if (res.ok) {
				const data = await res.json();
				customMeals = data.meals ?? [];
			}
		} catch {}
		customMealsLoaded = true;
	}

	/**
	 * @param {CustomMeal} meal
	 * @param {number | null} [amountGrams]
	 */
	function logCustomMeal(meal, amountGrams = null) {
		return logMeal(meal, amountGrams, fabMealType, closeFabModal);
	}

	/** @param {string} meal */
	function startAdd(meal) {
		addingMeal = meal;
		inlineTab = 'search';
		selectedCmMeal = null;
		addFoodQuery = '';
		loadCustomMeals();
	}

	function cancelAdd() {
		addingMeal = null;
		selectedCmMeal = null;
		addFoodQuery = '';
	}

	/**
	 * @param {CustomMeal} meal
	 * @param {number | null} [amountGrams]
	 */
	function inlineLogCustomMeal(meal, amountGrams = null) {
		if (!addingMeal) return;
		return logMeal(meal, amountGrams, addingMeal, cancelAdd);
	}

	/** @param {FoodSelection} food */
	function inlineLogFood(food) {
		return logFood(food, addingMeal, cancelAdd);
	}

	/** @type {string|null} */
	let editingEntryId = $state(null);
	let editingGrams = $state(0);
	/** @type {Portion[]} */
	let editingPortions = $state([]);
	/** @type {Portion | undefined} */
	let editingPortion = $state(undefined);
	/** @type {'breakfast'|'lunch'|'dinner'|'snack'} */
	let editingMeal = $state('breakfast');

	/** @param {FoodLogEntry} entry */
	function startEditEntry(entry) {
		editingEntryId = entry._id;
		editingGrams = entry.amountGrams;
		editingPortions = entry.portions ?? [];
		editingPortion = entry.selectedPortion;
		editingMeal = /** @type {'breakfast'|'lunch'|'dinner'|'snack'} */ (entry.mealType);
	}

	async function saveEditEntry() {
		if (!editingEntryId || editingGrams <= 0) return;
		try {
			const res = await fetch(`/api/fitness/food-log/${editingEntryId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					amountGrams: editingGrams,
					mealType: editingMeal,
					// Explicit null clears the basis when the user switches back to grams.
					selectedPortion: editingPortion ?? null,
				}),
			});
			if (res.ok) {
				const updated = await res.json();
				entries = entries.map(e => e._id === editingEntryId ? updated : e);
			}
		} catch {
			toast.error(isEn ? 'Failed to update' : 'Fehler beim Aktualisieren');
		}
		editingEntryId = null;
	}

	/** Move an entry to a different meal via drag-and-drop or direct call. */
	async function moveEntryToMeal(/** @type {string} */ entryId, /** @type {string} */ newMeal) {
		const entry = entries.find(e => e._id === entryId);
		if (!entry || entry.mealType === newMeal) return;
		// Optimistic update
		const prev = entry.mealType;
		entries = entries.map(e => e._id === entryId ? { ...e, mealType: newMeal } : e);
		try {
			const res = await fetch(`/api/fitness/food-log/${entryId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mealType: newMeal }),
			});
			if (!res.ok) throw new Error('update failed');
			const updated = await res.json();
			entries = entries.map(e => e._id === entryId ? updated : e);
		} catch {
			entries = entries.map(e => e._id === entryId ? { ...e, mealType: prev } : e);
			toast.error(isEn ? 'Failed to move' : 'Verschieben fehlgeschlagen');
		}
	}

	// Drag-and-drop state
	/** @type {string|null} */
	let draggingEntryId = $state(null);
	/** @type {string|null} */
	let dragOverMeal = $state(null);

	/** Ctrl (or Cmd) held during the drag: leave the original where it is. */
	let dragCopy = $state(false);
	/** Where the next-day panel should sit, measured off today's meal sections. */
	let nextDayBoxes = $state(/** @type {{meal: string, top: number, height: number}[]} */ ([]));
	/** The quick-log column's footprint, or null when it is not on screen. */
	let nextDayCol = $state(/** @type {{left: number, width: number}|null} */ (null));
	/** @type {string|null} */
	let dragOverNextDay = $state(null);
	let nextDayRailOpen = $state(false);

	/** Meal accent colour by runtime string, mirroring mealLabels. */
	function mealColor(/** @type {string} */ meal) {
		const map = /** @type {Record<string, {color: string}>} */ (mealMeta);
		return map[meal]?.color ?? 'var(--color-primary)';
	}

	/**
	 * Line the next-day targets up with today's meal sections, inside the quick-log
	 * column's own footprint.
	 *
	 * Both are measured rather than guessed. The sections are different heights
	 * depending on how much is logged, so four equal boxes would drift out of step
	 * with them; and the column's position comes from the page grid, which moves
	 * with the viewport — pinning the panel to the right edge instead would leave it
	 * sitting somewhere the column is not.
	 *
	 * A missing or zero-width column means this breakpoint has none, which is the
	 * signal to fall back to the edge rail. Tying the switch to whether there is
	 * actually a column to borrow beats repeating a media query here and in CSS.
	 */
	function measureNextDayBoxes() {
		const colRect = document.querySelector('.quick-log-col')?.getBoundingClientRect();
		nextDayCol =
			colRect && colRect.width > 0 ? { left: colRect.left, width: colRect.width } : null;

		const boxes = [];
		for (const meal of mealTypes) {
			const el = document.querySelector(`[data-meal-section="${meal}"]`);
			if (!el) continue;
			const r = el.getBoundingClientRect();
			boxes.push({ meal, top: r.top, height: r.height });
		}
		nextDayBoxes = boxes;
	}

	function onEntryDragStart(/** @type {DragEvent} */ ev, /** @type {string} */ entryId) {
		if (!ev.dataTransfer) return;
		draggingEntryId = entryId;
		dragCopy = ev.ctrlKey || ev.metaKey;
		// copyMove, not move: the cursor has to be able to show a plus when Ctrl is
		// down, and the browser picks that from what the source says it allows.
		ev.dataTransfer.effectAllowed = 'copyMove';
		ev.dataTransfer.setData('text/plain', entryId);
		measureNextDayBoxes();
	}

	function onEntryDragEnd() {
		draggingEntryId = null;
		dragOverMeal = null;
		dragOverNextDay = null;
		nextDayRailOpen = false;
		dragCopy = false;
	}

	function onMealDragOver(/** @type {DragEvent} */ ev, /** @type {string} */ meal) {
		if (!draggingEntryId) return;
		ev.preventDefault();
		// Read the modifier every time: it can be pressed or released mid-drag, and
		// dragstart's value would be stale by the drop.
		dragCopy = ev.ctrlKey || ev.metaKey;
		if (ev.dataTransfer) ev.dataTransfer.dropEffect = dragCopy ? 'copy' : 'move';
		dragOverMeal = meal;
	}

	function onMealDragLeave(/** @type {DragEvent} */ ev, /** @type {string} */ meal) {
		if (dragOverMeal === meal) {
			// Only clear if leaving the element (not child)
			const related = /** @type {Element|null} */ (ev.relatedTarget);
			const target = /** @type {Element} */ (ev.currentTarget);
			if (!related || !target.contains(related)) {
				dragOverMeal = null;
			}
		}
	}

	function onMealDrop(/** @type {DragEvent} */ ev, /** @type {string} */ meal) {
		ev.preventDefault();
		const id = ev.dataTransfer?.getData('text/plain') || draggingEntryId;
		const copy = ev.ctrlKey || ev.metaKey;
		dragOverMeal = null;
		draggingEntryId = null;
		dragCopy = false;
		if (!id) return;
		if (copy) duplicateEntry(id, meal, currentDate);
		else moveEntryToMeal(id, meal);
	}

	/**
	 * Write an entry a second time — same food, same amount, a different meal or day.
	 *
	 * The whole logged shape is carried over, portions included, so a copy is not
	 * quietly a rounder version of the original.
	 */
	async function duplicateEntry(
		/** @type {string} */ entryId,
		/** @type {string} */ meal,
		/** @type {string} */ date,
	) {
		const entry = entries.find(e => e._id === entryId);
		if (!entry) return;
		try {
			const created = await postFoodLog({
				date,
				mealType: meal,
				name: entry.name,
				source: entry.source,
				sourceId: entry.sourceId,
				amountGrams: entry.amountGrams,
				...(entry.liquidMl ? { liquidMl: entry.liquidMl } : {}),
				...(entry.portions ? { portions: entry.portions } : {}),
				...(entry.selectedPortion ? { selectedPortion: entry.selectedPortion } : {}),
			});
			if (!created) throw new Error('copy failed');
			// Only lands in view when it was copied into the day being shown.
			if (date === currentDate) entries = [...entries, created];
			toast.success(
				date === currentDate
					? (isEn ? `Copied to ${mealLabels[meal]}` : `Nach ${mealLabels[meal]} kopiert`)
					: (isEn ? `Copied to tomorrow, ${mealLabels[meal]}` : `Auf morgen kopiert, ${mealLabels[meal]}`)
			);
		} catch {
			toast.error(isEn ? 'Could not copy' : 'Kopieren fehlgeschlagen');
		}
	}

	/** Move an entry to another day, keeping its meal unless one is given. */
	async function moveEntryToDate(
		/** @type {string} */ entryId,
		/** @type {string} */ meal,
		/** @type {string} */ date,
	) {
		const entry = entries.find(e => e._id === entryId);
		if (!entry) return;
		const snapshot = entries;
		entries = entries.filter(e => e._id !== entryId);
		try {
			const res = await fetch(`/api/fitness/food-log/${entryId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mealType: meal, date }),
			});
			if (!res.ok) throw new Error('update failed');
			toast.success(
				isEn ? `Moved to tomorrow, ${mealLabels[meal]}` : `Auf morgen verschoben, ${mealLabels[meal]}`
			);
		} catch {
			entries = snapshot;
			toast.error(isEn ? 'Failed to move' : 'Verschieben fehlgeschlagen');
		}
	}

	function onNextDayDragOver(/** @type {DragEvent} */ ev, /** @type {string} */ meal) {
		if (!draggingEntryId) return;
		ev.preventDefault();
		dragCopy = ev.ctrlKey || ev.metaKey;
		if (ev.dataTransfer) ev.dataTransfer.dropEffect = dragCopy ? 'copy' : 'move';
		dragOverNextDay = meal;
		dragOverMeal = null;
	}

	function onNextDayDrop(/** @type {DragEvent} */ ev, /** @type {string} */ meal) {
		ev.preventDefault();
		const id = ev.dataTransfer?.getData('text/plain') || draggingEntryId;
		const copy = ev.ctrlKey || ev.metaKey;
		dragOverNextDay = null;
		draggingEntryId = null;
		nextDayRailOpen = false;
		dragCopy = false;
		if (!id) return;
		if (copy) duplicateEntry(id, meal, nextDate);
		else moveEntryToDate(id, meal, nextDate);
	}

	/** Meal names for prose, keyed so a runtime mealType string can index them. */
	const mealLabels = $derived(
		/** @type {Record<string, string>} */ ({
			breakfast: t.breakfast,
			lunch: t.lunch,
			dinner: t.dinner,
			snack: t.snack,
		})
	);

	/** @param {string} id */
	async function deleteEntry(id) {
		// Name what is being removed and where from. "Delete this food entry?" gave no
		// way to tell a mis-click from the row you meant, on a page that lists dozens.
		const entry = entries.find((e) => e._id === id);
		const message = entry
			? t.delete_entry_confirm
					.replace('{food}', `„${entry.name}"`)
					.replace('{meal}', mealLabels[entry.mealType] ?? entry.mealType)
			: t.delete_entry_confirm_plain;
		if (!await confirm(message, { confirmText: t.action_remove, cancelText: t.action_cancel })) return;
		try {
			const res = await fetch(`/api/fitness/food-log/${id}`, { method: 'DELETE' });
			if (res.ok) {
				entries = entries.filter(e => e._id !== id);
			}
		} catch {}
	}

	// --- Micro details ---
	let showMicros = $state(false);
	let showTdeeInfo = $state(false);

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
		asparticAcid:  { en: 'Aspartic Acid (Asx)',  de: 'Asparaginsäure (Asx)' },
		cysteine:      { en: 'Cysteine',       de: 'Cystein' },
		glutamicAcid:  { en: 'Glutamic Acid (Glx)',  de: 'Glutaminsäure (Glx)' },
		glycine:       { en: 'Glycine',        de: 'Glycin' },
		proline:       { en: 'Proline',        de: 'Prolin' },
		serine:        { en: 'Serine',         de: 'Serin' },
		tyrosine:      { en: 'Tyrosine',       de: 'Tyrosin' },
	};

	const microSections = $derived.by(() => {
		const minerals = MINERAL_ORDER;
		const vitamins = VITAMIN_ORDER;
		// A day's running total lists all four, unlike a single food: the bar for what
		// you did not drink today is still worth seeing at zero.
		const other = OTHER_ORDER;

		/** The day's total for a nutrient, wherever dayTotals happens to keep it. */
		function dayValue(/** @type {string} */ k) {
			return k === 'fiber' ? dayTotals.fiber
				: k === 'sugars' ? dayTotals.sugars
				: k === 'carbs' ? dayTotals.carbs
				: k === 'alcohol' ? dayTotals.alcohol
				: k === 'sugarAlcohols' ? dayTotals.sugarAlcohols
				: k in dayTotals.micros ? dayTotals.micros[k]
				: dayTotals.fats[k] ?? 0;
		}

		/** @param {string[]} keys */
		function mkRows(keys) {
			// The shares-of-a-parent rows (retinol of vitamin A, starch of carbohydrate)
			// are handled inside the shared builder, which the recipe pages use too.
			return nutrientRows(keys, dayValue, dri, isEn);
		}

		// Trace minerals. A mineral nothing eaten today reported renders as a dash:
		// counting it as zero would draw an empty bar against the reference intake and
		// read as a deficiency, when it only means no source measured it.
		function mkTraceRows() {
			const traces = /** @type {Record<string, number | undefined>} */ (dayTotals.traces.totals);
			return nutrientRows(TRACE_MINERAL_KEYS, k => traces[k], dri, isEn);
		}

		// Essential amino acids: measured against the WHO requirement
		const essentialOrder = ['leucine', 'isoleucine', 'valine', 'lysine', 'methionine', 'phenylalanine', 'threonine', 'tryptophan', 'histidine'];
		// Non-essential ones have no requirement — shown as a distribution among themselves
		const nonEssentialOrder = ['alanine', 'arginine', 'asparticAcid', 'cysteine', 'glutamicAcid', 'glycine', 'proline', 'serine', 'tyrosine'];
		const w = latestWeight ?? AMINO_DRI_REFERENCE_WEIGHT;

		const essentialRows = essentialOrder.map(k => {
			const value = dayTotals.aminos[k] ?? 0;
			const goal = aminoDri(k, w);
			const pct = goal > 0 ? Math.round(value / goal * 100) : null;
			const meta = AMINO_META[/** @type {keyof typeof AMINO_META} */ (k)];
			return { key: k, label: isEn ? meta.en : meta.de, unit: 'g', value, goal, pct, bar: pct ?? 0, isMax: false, essential: true, noData: false };
		});

		const nonEssentialValues = nonEssentialOrder.map(k => dayTotals.aminos[k] ?? 0);
		const nonEssentialTotal = nonEssentialValues.reduce((a, b) => a + b, 0);
		const nonEssentialMax = Math.max(...nonEssentialValues);
		const nonEssentialRows = nonEssentialOrder.map((k, i) => {
			const value = nonEssentialValues[i];
			const meta = AMINO_META[/** @type {keyof typeof AMINO_META} */ (k)];
			// Share of the non-essential total; bars are scaled to the biggest one so they stay readable
			const pct = nonEssentialTotal > 0 ? Math.round(value / nonEssentialTotal * 100) : null;
			const bar = nonEssentialMax > 0 ? value / nonEssentialMax * 100 : 0;
			return { key: k, label: isEn ? meta.en : meta.de, unit: 'g', value, goal: 0, pct, bar, isMax: false, essential: false, noData: false };
		});

		// Carbohydrate and fat quality, judged against their reference intakes. Fibre and
		// sugars come from the core panel every source publishes, so these rows work on
		// anything already logged; the fatty acids below them only fill in for foods
		// imported since the fat panel was added.
		const carbQuality = ['fiber', 'sugars', ...CARB_DETAIL_ORDER];
		const fatQuality = ['saturatedFat', 'transFat', 'linoleicAcid', 'alphaLinolenicAcid', 'epaDha'];

		/** @param {string[]} keys */
		function mkFatRows(keys) {
			return nutrientRows(keys, dayValue, dri, isEn);
		}

		// The shape of the fat eaten, with each omega total heading the acids it sums.
		// Same builder the nutrient averages use, so the two views cannot drift apart.
		const compositionRows = fatCompositionRows(dayTotals.fats, {
			totalFat: dayTotals.fat,
			isEn,
		}).map(r => ({ ...r, goal: 0, isMax: false, essential: false, noData: false }));

		// Only the fat-composition rows nest, but every row carries the flags so the
		// renderer can stay one shape.
		/** @param {any[]} rows */
		const flat = (rows) => rows.map(r => ({ child: false, header: false, relativeTo: null, ...r }));

		return [
			{ title: isEn ? 'Carbohydrate Quality' : 'Kohlenhydrat-Qualität', rows: flat(mkFatRows(carbQuality)), note: isEn
				? 'Starch, fructose and lactose have no reference intake — they are shown to break the carbohydrates down, not to be met. BLS reports all three for nearly every food, USDA for a third of its own.'
				: 'Für Stärke, Fructose und Lactose gibt es keinen Referenzwert — sie schlüsseln die Kohlenhydrate auf, sie sind kein Ziel. BLS erfasst alle drei für fast jedes Lebensmittel, USDA nur für ein Drittel.' },
			{ title: isEn ? 'Fatty Acids' : 'Fettsäuren', rows: flat(mkFatRows(fatQuality)), note: isEn
				? `Saturated and trans fat are ceilings; linoleic and α-linolenic acid are adequate intakes, so passing them is fine. All four are shares of energy, scaled to ${energyBasisLabel}. EPA + DHA is a fixed 250 mg a day and does not scale.`
				: `Gesättigte und Trans-Fettsäuren sind Obergrenzen; Linol- und α-Linolensäure sind Richtwerte, ein Überschreiten ist unproblematisch. Alle vier sind Energieanteile, skaliert auf ${energyBasisLabel}. EPA + DHA sind fixe 250 mg pro Tag und skalieren nicht.` },
			{ title: isEn ? 'Fat Composition' : 'Fettzusammensetzung', rows: flat(compositionRows), note: fatCompositionNote(isEn) },
			{ title: isEn ? 'Minerals' : 'Mineralstoffe', rows: flat(mkRows(minerals)), note: '' },
			{ title: isEn ? 'Trace Minerals' : 'Spurenelemente', rows: flat(mkTraceRows()), note: traceCoverageNote(dayTotals.traces.coverage, isEn) },
			{ title: isEn ? 'Vitamins' : 'Vitamine', rows: flat(mkRows(vitamins)), note: isEn
				? 'Retinol is the preformed share of vitamin A and the only part with an upper limit — it has no target of its own. Biotin is measured by BLS for almost every food but by USDA for one in eight, so a day logged from USDA reads low.'
				: 'Retinol ist der vorgebildete Anteil von Vitamin A und der einzige mit einer Obergrenze — ein eigener Zielwert existiert nicht. Biotin erfasst BLS für fast jedes Lebensmittel, USDA nur für jedes achte; ein aus USDA erfasster Tag liegt daher zu tief.' },
			{ title: isEn ? 'Essential Amino Acids' : 'Essenzielle Aminosäuren', rows: flat(essentialRows), note: '' },
			{ title: isEn ? 'Non-Essential Amino Acids' : 'Nicht-essenzielle Aminosäuren', rows: flat(nonEssentialRows), note: isEn
				? 'No intake requirement — bars show each one’s share of the non-essential amino acids you ate.'
				: 'Kein Bedarfswert — die Balken zeigen den Anteil an den aufgenommenen nicht-essenziellen Aminosäuren.' },
			{ title: isEn ? 'Other' : 'Sonstiges', rows: flat(mkRows(other)), note: isEn
				? 'Caffeine is not in BLS at all: its coffees, teas, colas and chocolates take the figure from a matched USDA record, and the milk-coffee drinks are estimated from one espresso shot per serving. Anything else logged from BLS carries none.'
				: 'Koffein fehlt in BLS vollständig: Kaffee, Tee, Cola und Schokolade übernehmen den Wert eines zugeordneten USDA-Eintrags, Milchkaffeegetränke sind mit einem Espresso pro Portion geschätzt. Alles andere aus BLS führt keinen.' },
		];
	});

	const mealMeta = MEAL_META;

	/** @typedef {{ name: string, source: string, sourceId: string }} QuickFavorite */
	/** @typedef {{ name: string, source: string, sourceId: string, mealType?: string, amountGrams?: number, per100g?: Record<string, number> }} RecentFood */

	// --- Quick-log sidebar ---
	/** @type {'breakfast' | 'lunch' | 'dinner' | 'snack'} */
	let quickLogMealType = $state(defaultMealType());
	// svelte-ignore state_referenced_locally
	let quickFavorites = $state(/** @type {QuickFavorite[]} */ (data.favorites ?? []));
	// svelte-ignore state_referenced_locally
	let historicalRecents = $state(/** @type {RecentFood[]} */ (data.recentFoods ?? []));

	$effect(() => {
		quickFavorites = data.favorites ?? [];
		historicalRecents = data.recentFoods ?? [];
	});

	/** Recent foods: current-date entries (newest first) merged with historical recents from the server. */
	const recentFoods = $derived.by(() => {
		const seen = new Set();
		const out = [];
		for (let i = entries.length - 1; i >= 0; i--) {
			const e = entries[i];
			if (!e?.source || !e?.sourceId || e.mealType === 'water') continue;
			const key = `${e.source}:${e.sourceId}`;
			if (seen.has(key)) continue;
			seen.add(key);
			out.push(e);
			if (out.length >= 10) return out;
		}
		for (const e of historicalRecents) {
			if (!e?.source || !e?.sourceId) continue;
			const key = `${e.source}:${e.sourceId}`;
			if (seen.has(key)) continue;
			seen.add(key);
			out.push(e);
			if (out.length >= 10) break;
		}
		return out;
	});

	/** Callback from FoodSearch when a favorite is toggled — keep quick-log favorites in sync. */
	function handleFavoriteChange(/** @type {{ source: string, sourceId: string, name: string, favorited: boolean }} */ payload) {
		const { source, sourceId, name, favorited } = payload;
		const rest = quickFavorites.filter(f => !(f.source === source && f.sourceId === sourceId));
		quickFavorites = favorited ? [...rest, { source, sourceId, name }] : rest;
		favTabLoaded = false;
	}

	/** @type {{ name: string, source?: string, sourceId?: string, per100g?: any, portions?: Portion[], amountGrams?: number } | null} */
	let qlSelected = $state(null);
	let qlGrams = $state(100);
	/** @type {Portion | undefined} */
	let qlPortion = $state(undefined);
	let qlLoading = $state(false);

	/** @param {{ name: string, source?: string, sourceId?: string, per100g?: any, portions?: Portion[], amountGrams?: number }} item */
	async function qlSelect(item) {
		if (qlSelected && qlSelected.source === item.source && qlSelected.sourceId === item.sourceId) {
			qlSelected = null;
			return;
		}
		let chosen = item;
		// Look up whenever either the nutrition or the portion list is missing —
		// favourites carry neither, and recents cache per100g but never portions.
		if ((!item.per100g || !item.portions) && item.source && item.sourceId) {
			qlLoading = true;
			try {
				const res = await fetch(`/api/nutrition/lookup?source=${item.source}&id=${encodeURIComponent(item.sourceId)}`);
				if (res.ok) {
					const data = await res.json();
					chosen = { ...item, per100g: item.per100g ?? data.per100g, portions: item.portions ?? data.portions };
				}
			} catch {
				toast.error(isEn ? 'Failed to load food data' : 'Fehler beim Laden');
			}
			qlLoading = false;
		}
		if (!chosen.per100g) {
			toast.error(isEn ? 'Could not load food data' : 'Lebensmitteldaten nicht gefunden');
			return;
		}
		// Default to one whole portion when the food has one, mirroring FoodSearch.
		const first = chosen.portions?.[0];
		qlPortion = first;
		qlGrams = item.amountGrams ?? (first ? Math.round(first.grams) : 100);
		qlSelected = chosen;
	}

	function qlConfirm() {
		const item = qlSelected;
		if (!item?.per100g) return;
		return logFood(
			/** @type {FoodSelection} */ ({ ...item, amountGrams: qlGrams, selectedPortion: qlPortion }),
			quickLogMealType,
			() => {
				toast.success(isEn ? `Logged "${item.name}"` : `"${item.name}" eingetragen`);
				qlSelected = null;
			}
		);
	}
</script>

<svelte:head>
	<title>{t.nutrition_title} — Fitness</title>
</svelte:head>

{#snippet cmDetailScreen(/** @type {CustomMeal} */ meal, /** @type {(m: CustomMeal, grams?: number | null) => void} */ logFn)}
	{@const preview = cmPreview(meal)}
	<div class="cm-detail">
		<div class="cm-detail-header">
			<span class="cm-detail-name">{meal.name}</span>
			<span class="cm-detail-sub">{meal.ingredients.length} {t.ingredients} · {Math.round(preview.totalGrams)}g {isEn ? 'base' : 'Basis'}</span>
		</div>

		<!-- Amount selector -->
		<div class="cm-detail-amount">
			<input type="number" class="cm-detail-amount-input"
				value={cmAmountVal}
				oninput={e => { cmAmountVal = Number(e.currentTarget.value); }}
				min={cmAmountMode === 'grams' ? 1 : 0.1}
				step={cmAmountMode === 'grams' ? 1 : 0.1} />
			<select class="cm-detail-amount-unit" value={cmAmountMode} onchange={e => {
				cmAmountMode = e.currentTarget.value;
				cmAmountVal = cmAmountMode === 'multiplier' ? 1.0 : Math.round(mealTotalGrams(meal));
			}}>
				<option value="multiplier">× ({isEn ? 'servings' : 'Portionen'})</option>
				<option value="grams">g</option>
			</select>
		</div>
		{#if cmAmountMode === 'multiplier'}
			<span class="cm-detail-hint">= {Math.round(preview.grams)}g</span>
		{/if}

		<MacroBreakdown
			calories={preview.calories}
			protein={preview.protein}
			fat={preview.fat}
			carbs={preview.carbs}
			saturatedFat={preview.saturatedFat}
			sugars={preview.sugars}
			fiber={preview.fiber}
		/>

		<!-- Ingredients list -->
		<details class="cm-detail-ingredients">
			<summary>{isEn ? 'Ingredients' : 'Zutaten'} ({meal.ingredients.length})</summary>
			<ul>
				{#each meal.ingredients as ing}
					<li>{ing.name} — {ing.amountGrams}g</li>
				{/each}
			</ul>
		</details>

		<!-- Actions -->
		<div class="cm-detail-actions">
			<button class="cm-detail-btn-cancel" onclick={deselectCmMeal}>{t.cancel}</button>
			<button class="cm-detail-btn-confirm" onclick={() => logFn(meal, cmResolvedGrams(meal))}>{t.log_meal}</button>
		</div>
	</div>
{/snippet}

{#snippet favoritesTab(/** @type {(food: FoodSelection) => void} */ logFn)}
	<div class="fav-tab-list">
		{#if !favTabLoaded}
			<p class="meals-empty">{t.loading}</p>
		{:else}
			<FoodSearch onselect={logFn} onfavoritechange={handleFavoriteChange} showDetailLinks={false} showFavorites={false} initialResults={favTabItems} bind:query={addFoodQuery} />
			{#if favTabItems.length === 0}
				<p class="meals-empty">{isEn ? 'No favorites yet. Tap the heart on foods to add them here.' : 'Noch keine Favoriten. Tippe auf das Herz bei Lebensmitteln.'}</p>
			{/if}
		{/if}
	</div>
{/snippet}

{#snippet recentTab(/** @type {(food: FoodSelection) => void} */ logFn)}
	<div class="fav-tab-list">
		{#if !recentTabLoaded}
			<p class="meals-empty">{t.loading}</p>
		{:else}
			<FoodSearch onselect={logFn} onfavoritechange={handleFavoriteChange} showDetailLinks={false} showFavorites={false} initialResults={recentTabItems} bind:query={addFoodQuery} />
			{#if recentTabItems.length === 0}
				<p class="meals-empty">{isEn ? 'No recent foods yet.' : 'Noch keine kürzlichen Lebensmittel.'}</p>
			{/if}
		{/if}
	</div>
{/snippet}

{#snippet customMealsTab(/** @type {(m: CustomMeal, grams?: number | null) => void} */ logFn)}
	{#if selectedCmMeal}
		{@render cmDetailScreen(selectedCmMeal, logFn)}
	{:else}
		<div class="custom-meals-list">
			<div class="cm-filter-row">
				<input type="text" class="cm-filter-input" placeholder={t.search_food}
					bind:value={addFoodQuery} />
				{#if addFoodQuery}
					<button class="cm-clear-btn" onclick={() => addFoodQuery = ''} aria-label="Clear">
						<X size={16} />
					</button>
				{/if}
			</div>
			{#if customMeals.length === 0}
				<p class="meals-empty">{t.no_custom_meals}</p>
			{/if}
			{#each filteredCustomMeals as cm}
				<div class="custom-meal-card" role="button" tabindex="0" onclick={() => selectCmMeal(cm)} onkeydown={e => e.key === 'Enter' && selectCmMeal(cm)}>
					<div class="custom-meal-info">
						<span class="custom-meal-name">{cm.name}</span>
						<span class="custom-meal-detail">{cm.ingredients.length} {t.ingredients} · {fmtCal(mealTotalCal(cm))} kcal · {Math.round(mealTotalGrams(cm))}g</span>
					</div>
				</div>
			{/each}
			<a class="manage-meals-link" href={resolve('/fitness/[nutrition=fitnessNutrition]/meals', { nutrition: s.nutrition })}>
				<Settings size={13} />
				{isEn ? 'Manage meals' : 'Mahlzeiten verwalten'}
			</a>
		</div>
	{/if}
{/snippet}

<!-- The next mug, sitting where the next empty glass sits: right after the last
     full one of its own kind. Shape carries which drink is being added, so the
     outline can stay soft — it is an invitation, not an alert. -->
{#snippet hotDrinkAdd()}
	{#if hotDrinkEnabled}
		<button
			class="water-cup hot-drink-add"
			onclick={logHotDrink}
			disabled={loggingHotDrink}
			title="{hotDrinkName} · +{HOT_DRINK_ML} ml"
			aria-label={isEn ? `Log ${hotDrinkName}, ${HOT_DRINK_ML} ml` : `${hotDrinkName} erfassen, ${HOT_DRINK_ML} ml`}
		>
			<svg viewBox="0 0 24 32" class="cup-svg" overflow="hidden">
				<path class="mug-handle" d={MUG_HANDLE_PATH} fill="none" stroke="var(--orange)" stroke-width="1.6" stroke-opacity="0.5" />
				<path d={MUG_PATH} fill="var(--color-bg-tertiary)" stroke="var(--orange)" stroke-width="1.3" stroke-opacity="0.5" />
				<text x="11" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="var(--orange)" fill-opacity="0.7">+</text>
			</svg>
		</button>
	{/if}
{/snippet}

{#snippet roundOffSnippet()}
	<NudgeCard
		nudges={nudges}
		date={currentDate}
		{isEn}
		defaultMealType={defaultMealType()}
		onapplied={() => {
			invalidateAll();
		}}
	/>
{/snippet}

{#snippet microPanel()}
	<div class="micro-details" class:micro-hidden={!showMicros}>
		<p class="micro-source">
			{isEn ? '% of the daily reference intake' : '% der Tagesreferenzmenge'}
			<DriSourceInfo {isEn} />
		</p>
		{#if coverageGaps.length > 0}
			<p class="micro-coverage">
				<TriangleAlert size={13} />
				<span>
					{isEn
						? `Share of the day's calories whose source publishes no figures — ${coverageGaps.join(', ')}. Those foods may well contain these nutrients; they are simply unrecorded, so the totals below read low.`
						: `Anteil der Tageskalorien, für den die Quelle keine Werte veröffentlicht — ${coverageGaps.join(', ')}. Diese Lebensmittel können die Nährstoffe durchaus enthalten, sie sind nur nicht erfasst — die Werte unten liegen daher zu tief.`}
				</span>
			</p>
		{/if}
		{#if hasComposition}
			<div class="micro-section">
				<h4>{isEn ? 'Macro Breakdown' : 'Makro-Aufschlüsselung'}</h4>
				<div class="composition-grid">
					<CompositionBar
						title={isEn ? 'Energy' : 'Energie'}
						unit="kcal"
						total={dayTotals.calories}
						segments={energySegments}
						note={isEn
							? 'Protein, fat and carbohydrate at 4/9/4 kcal per gram and alcohol at 7. “Other” is what each food’s own energy figure carries beyond them — sugar alcohols, organic acids, and measurement rather than reconstruction.'
							: 'Eiweiss, Fett und Kohlenhydrate mit 4/9/4 kcal pro Gramm, Alkohol mit 7. «Übrige» ist, was der Energiewert des Lebensmittels darüber hinaus enthält — Zuckeralkohole, organische Säuren und der Unterschied zwischen Messung und Berechnung.'}
					/>
					<CompositionBar
						title={isEn ? 'Fat' : 'Fett'}
						total={dayTotals.fat}
						segments={fatSegments}
					/>
					<CompositionBar
						title={isEn ? 'Carbohydrates' : 'Kohlenhydrate'}
						total={dayTotals.carbs + dayTotals.fiber}
						segments={carbSegments}
					/>
				</div>
			</div>
		{/if}
		{#each microSections as section}
			<div class="micro-section">
				<h4>{section.title}</h4>
				{#if section.note}
					<p class="micro-note">{section.note}</p>
				{/if}
				{#each section.rows as row}
					<NutrientRow
						{row}
						href={nutrientHref(row.key)}
						child={row.child}
						header={row.header}
						{relativeTitle}
					/>
				{/each}
			</div>
		{/each}
	</div>
{/snippet}

<div class="nutrition-page">
	<!-- Date Navigator -->
	<div class="date-nav">
		<a class="date-btn" href={prevHref} aria-label="Previous day" data-sveltekit-replacestate data-sveltekit-noscroll>
			<ChevronLeft size={20} />
		</a>
		<span class="date-display" class:is-today={isToday}>
			{displayDate}
			{#if isToday}<span class="today-badge">{t.today}</span>{/if}
		</span>
		<a class="date-btn" href={nextHref} aria-label="Next day" data-sveltekit-replacestate data-sveltekit-noscroll>
			<ChevronRight size={20} />
		</a>
		{#if !isToday}
			<a class="go-today-btn" href={todayHref} data-sveltekit-replacestate data-sveltekit-noscroll>{t.today}</a>
		{/if}
	</div>


	<div class="sidebar-col">
	<!-- Daily Summary -->
	{#if goalCalories}
		<div class="daily-summary">
			<!-- Eaten / Ring / Burned row -->
			<div class="calorie-trio">
				<div class="cal-stat eaten">
					<span class="cal-stat-value">{fmtCal(eatenCalories)}</span>
					<span class="cal-stat-label">{isEn ? 'EATEN' : 'GEGESSEN'}</span>
				</div>

					<svg class="calorie-ring" width="130" height="130" viewBox="0 0 70 70">
						<circle class="ring-bg" cx="35" cy="35" r={RADIUS}
							stroke-dasharray="{ARC_LENGTH} {2 * Math.PI * RADIUS}"
							transform="rotate({ARC_ROTATE} 35 35)" />
						{#if calorieOverflow > 0}
							<circle class="ring-glow ring-calories-glow" cx="35" cy="35" r={RADIUS}
								stroke-dasharray="{ARC_LENGTH} {2 * Math.PI * RADIUS}"
								style="--glow-target: {strokeOffset(Math.max(calorieProgress - calorieOverflow, 0))}; --glow-start: {strokeOffset(100)}"
								transform="rotate({ARC_ROTATE} 35 35)" />
						{/if}
						<circle class="ring-fill ring-calories{calorieOverflow > 0 ? ' no-glow' : ''}" cx="35" cy="35" r={RADIUS}
							stroke-dasharray="{ARC_LENGTH} {2 * Math.PI * RADIUS}"
							stroke-dashoffset={strokeOffset(calorieProgress)}
							transform="rotate({ARC_ROTATE} 35 35)" />
						{#if calorieOverflow > 0}
							<circle class="ring-fill ring-overflow" cx="35" cy="35" r={RADIUS}
								stroke-dasharray="{ARC_LENGTH} {2 * Math.PI * RADIUS}"
								style="--overflow-target: {overflowOffset(calorieOverflow)}; --arc-length: {ARC_LENGTH}"
								stroke-linecap="butt"
								transform="translate(70, 0) scale(-1, 1) rotate({ARC_ROTATE} 35 35)" />
						{/if}
						<text class="ring-text-main" x="35" y="30">{fmtCal(Math.abs(calorieBalance))}</text>
						<text class="ring-text-sub" x="35" y="42">{calorieBalance >= 0 ? (isEn ? 'KCAL LEFT' : 'KCAL ÜBRIG') : (isEn ? 'KCAL OVER' : 'KCAL ÜBER')}</text>
					</svg>

				<div class="cal-stat burned">
					{#if exerciseKcal > 0}
						<span class="cal-stat-value">{fmtCal(exerciseKcal)}</span>
						<span class="cal-stat-label">{isEn ? 'BURNED' : 'VERBRANNT'}</span>
					{:else if projectedExercise}
						<button class="projection-toggle" class:active={includeProjection} onclick={() => includeProjection = !includeProjection}>
							<span class="cal-stat-value projected" class:included={includeProjection}>~{fmtCal(projectedExercise.kcal)}</span>
							<span class="cal-stat-label projected-label">{isEn ? 'PROJECTED' : 'PROGNOSE'}</span>
							<span class="projected-template">{projectedExercise.templateName}</span>
						</button>
					{:else}
						<span class="cal-stat-value">{fmtCal(0)}</span>
						<span class="cal-stat-label">{isEn ? 'BURNED' : 'VERBRANNT'}</span>
					{/if}
					<span class="burned-bmr tdee-info-wrap">
						+{fmtCal(Math.round(dailyTdee))} TDEE<button class="tdee-info-trigger" onclick={() => showTdeeInfo = !showTdeeInfo} aria-label="TDEE info"><Info size={10} /></button>
						{#if showTdeeInfo}
							<div class="tdee-info-tooltip" {@attach clampToViewport}>
								<span class="cite-note" style="margin-bottom: 0.2rem">{isEn ? 'TDEE = Total Daily Energy Expenditure — calories your body burns per day at rest + daily activity (excluding tracked exercise).' : 'TDEE = Gesamtenergieumsatz — Kalorien, die dein Körper pro Tag in Ruhe + Alltagsaktivität verbrennt (ohne getracktes Training).'}</span>
								<span class="cite-note" style="margin-bottom: 0.2rem">{isEn ? `BMR × ${activityMultiplier(activityLevel).toFixed(1)} (${activityLevel.replace('_', ' ')}) = ${fmtCal(Math.round(dailyTdee))} kcal` : `BMR × ${activityMultiplier(activityLevel).toFixed(1)} (${activityLevel.replace('_', ' ')}) = ${fmtCal(Math.round(dailyTdee))} kcal`}</span>
								{#if latestWeight}
									<span class="cite-note" style="margin-bottom: 0.2rem">{isEn ? `Based on your latest logged weight (${latestWeight} kg).` : `Basierend auf deinem letzten Gewicht (${latestWeight} kg).`}</span>
								{/if}
								<span class="cite-line"><strong>BMR:</strong> {fmtCal(Math.round(dailyBmr))} kcal — <a href="https://doi.org/10.1093/ajcn/51.2.241" target="_blank" rel="noopener">Mifflin-St Jeor (1990)</a></span>
								<span class="cite-line"><strong>NEAT:</strong> ×{activityMultiplier(activityLevel).toFixed(1)} — <a href="https://doi.org/10.1053/beem.2002.0227" target="_blank" rel="noopener">Levine (2002)</a></span>
								<span class="cite-note">{isEn ? 'NEAT multiplier accounts for non-exercise activity (walking, fidgeting, daily tasks). Tracked exercise kcal are added separately on top.' : 'NEAT-Multiplikator berücksichtigt Alltagsaktivität (Gehen, Bewegung, tägliche Aufgaben). Getracktes Training wird separat oben drauf addiert.'}</span>
							</div>
						{/if}
					</span>
					{#if !hasBmrData}
						<div class="bmr-hint">{isEn ? 'Set profile in' : 'Profil unter'} <a href={resolve('/fitness/[checkin=fitnessCheckIn]', { checkin: s.measure })}>{t.measure_title}</a></div>
					{/if}
				</div>
			</div>

			<!-- Macro progress bars -->
			<div class="macro-bars">
				{#each [
					{ value: dayTotals.protein, goal: proteinGoalGrams, label: t.protein, color: 'var(--green)', icon: Beef },
					{ value: dayTotals.fat, goal: fatGoalGrams, label: t.fat, color: 'var(--orange)', icon: Droplet },
					{ value: dayTotals.carbs, goal: carbGoalGrams, label: t.carbs, color: 'var(--lightblue)', icon: Wheat },
				] as macro}
					{@const pct = macro.goal ? macro.value / macro.goal * 100 : 0}
					{@const over = pct > 100}
					{@const overPct = Math.min(pct - 100, 100)}
					{@const remaining = macro.goal ? macro.goal - macro.value : 0}
					{@const MacroBarIcon = macro.icon}
					<div class="macro-bar-item">
						<span class="macro-bar-label"><MacroBarIcon size={12} /> {macro.label}</span>
						<div class="macro-bar-track">
							<div class="macro-bar-fill" style="width: {Math.min(pct, 100)}%; background: {macro.color}"></div>
							{#if over}
								<div class="macro-bar-overflow" style="width: {overPct}%"></div>
							{/if}
						</div>
						{#if macro.goal}
							<span class="macro-bar-info" class:over>
								{remaining >= 0 ? `${fmt(remaining)}/${fmt(macro.goal)}g ${t.remaining}` : `${fmt(-remaining)}g ${t.over} ${fmt(macro.goal)}g`}
							</span>
						{:else}
							<span class="macro-bar-info">{fmt(macro.value)}g</span>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Micros inline (mobile) -->
			<div class="micro-inline">
				<div class="details-toggle-row">
					<button class="details-toggle" onclick={() => showMicros = !showMicros}>
						<ChevronDown size={14} style={showMicros ? 'transform: rotate(180deg)' : ''} />
						{t.details}
					</button>
				</div>
				{@render microPanel()}
			</div>

		</div>
	{:else}
		<div class="no-goal">
			<div class="no-goal-icon"><Utensils size={32} /></div>
			<p>{t.set_goal_prompt}</p>
			<button class="btn-primary" onclick={openGoalEditor}>{t.set_goal}</button>
		</div>
	{/if}

	<!-- Goal editor toggle -->
	{#if goalCalories && !showGoalEditor}
		<button class="goal-edit-btn" onclick={openGoalEditor}>
			<Settings size={14} />
			{t.daily_goal}
		</button>
	{/if}

	<!-- Goal Editor (Stepped Wizard) -->
	{#if showGoalEditor}
		<div class="goal-editor">
			<h3>{t.daily_goal}</h3>

			<!-- Step indicators -->
			<div class="wizard-steps">
				<button class="wizard-step" class:active={goalStep === 1} class:done={goalStep > 1} onclick={() => goalStep = 1}>
					<span class="ws-num">{goalStep > 1 ? '' : '1'}{#if goalStep > 1}<Check size={12} />{/if}</span>
					<span class="ws-label">{isEn ? 'Plan' : 'Plan'}</span>
				</button>
				<div class="ws-line" class:done={goalStep > 1}></div>
				<button class="wizard-step" class:active={goalStep === 2} class:done={goalStep > 2} onclick={() => goalStep = 2}>
					<span class="ws-num">{goalStep > 2 ? '' : '2'}{#if goalStep > 2}<Check size={12} />{/if}</span>
					<span class="ws-label">{isEn ? 'Calories' : 'Kalorien'}</span>
				</button>
				<div class="ws-line" class:done={goalStep > 2}></div>
				<button class="wizard-step" class:active={goalStep === 3} onclick={() => goalStep = 3}>
					<span class="ws-num">3</span>
					<span class="ws-label">{isEn ? 'Macros' : 'Makros'}</span>
				</button>
			</div>

			<!-- Step 1: Diet Presets -->
			{#if goalStep === 1}
				<div class="preset-section">
					<div class="preset-grid">
						{#each dietPresets as preset, i}
							<button
								class="preset-card"
								class:selected={selectedPresetIdx === i}
								type="button"
								onclick={() => applyPreset(preset, i)}
							>
								<span class="preset-card-emoji">{preset.emoji}</span>
								<div class="preset-card-text">
									<span class="preset-card-name">{isEn ? preset.en : preset.de}</span>
									<span class="preset-card-desc">{isEn ? preset.descEn : preset.descDe}</span>
								</div>
							</button>
						{/each}
					</div>
					<button class="wizard-skip" type="button" onclick={() => goalStep = 2}>
						{isEn ? 'Skip — set manually' : 'Überspringen — manuell einstellen'} →
					</button>
				</div>

			<!-- Step 2: Calories & Activity -->
			{:else if goalStep === 2}
				<div class="step-calories">
					{#if selectedPresetIdx >= 0}
						<button class="step-pill" type="button" onclick={() => goalStep = 1}>
							{dietPresets[selectedPresetIdx].emoji} {stepPresetSummary}
						</button>
					{/if}

					{#if !hasBmrData}
						<div class="tdee-warning">
							<AlertTriangle size={16} />
							<div class="tdee-warning-text">
								<strong>{isEn ? 'TDEE unavailable' : 'TDEE nicht verfügbar'}</strong>
								<span>{isEn
									? 'Your TDEE (Total Daily Energy Expenditure) is the calories you burn per day. Set weight, height, and birth year under'
									: 'Dein TDEE (Gesamtenergieumsatz) sind die Kalorien, die du pro Tag verbrauchst. Gewicht, Grösse und Geburtsjahr einstellen unter'}
									<a href={resolve('/fitness/[checkin=fitnessCheckIn]', { checkin: s.measure })}>{t.measure_title}</a>
								</span>
							</div>
						</div>
					{/if}

					<div class="goal-field">
						<label for="goal-calories">{t.calorie_target}</label>
						<div class="calorie-input-row">
							<input id="goal-calories" type="number" bind:value={editCalories} min="500" max="10000" />
							{#if hasBmrData}
								<button class="bmr-calc-btn" type="button" onclick={() => editCalories = String(Math.round(editTdee))}>
									TDEE ({Math.round(editTdee)})
								</button>
							{/if}
						</div>
						{#if hasBmrData && latestWeight}
							<span class="tdee-basis">{isEn ? `TDEE based on latest weight: ${latestWeight} kg` : `TDEE basierend auf letztem Gewicht: ${latestWeight} kg`}</span>
						{/if}
					</div>

					<!-- TDEE Comparison Bar -->
					{#if hasBmrData && tdeeBarData}
						<div class="tdee-compare">
							<div class="tdee-compare-bar-wrap">
								<!-- TDEE = full width reference -->
								<div class="tdee-compare-ref"></div>
								<!-- Target overlaid -->
								<div class="tdee-compare-target"
									class:deficit={tdeeBarData.zone === 'deficit'}
									class:surplus={tdeeBarData.zone === 'surplus'}
									class:maintenance={tdeeBarData.zone === 'maintenance'}
									style="width: {tdeeBarData.targetPct}%"
								></div>
							</div>
							<div class="tdee-compare-labels">
								<span class="tdee-compare-label">{isEn ? 'Target' : 'Ziel'}: <strong>{tdeeBarData.target}</strong> kcal</span>
								<span class="tdee-compare-label">TDEE: <strong>{tdeeBarData.tdee}</strong> kcal</span>
							</div>
							<span class="tdee-compare-diff"
								class:deficit={tdeeBarData.zone === 'deficit'}
								class:surplus={tdeeBarData.zone === 'surplus'}
								class:maintenance={tdeeBarData.zone === 'maintenance'}>
								{tdeeBarData.zone === 'deficit' ? (isEn ? 'Deficit' : 'Defizit') : tdeeBarData.zone === 'surplus' ? (isEn ? 'Surplus' : 'Überschuss') : (isEn ? 'Maintenance' : 'Erhaltung')}:
								{tdeeBarData.diff > 0 ? '+' : ''}{tdeeBarData.diff} kcal ({tdeeBarData.pctOfTdee > 0 ? '+' : ''}{tdeeBarData.pctOfTdee}%)
							</span>
						</div>
					{/if}

					<div class="goal-field">
						<label for="goal-activity">{isEn ? 'Activity Level (excl. exercise)' : 'Aktivitätslevel (ohne Training)'}</label>
						<select id="goal-activity" bind:value={editActivityLevel}>
							<option value="sedentary">{isEn ? 'Sedentary — desk job' : 'Sitzend — Bürojob'} (×1.2)</option>
							<option value="light">{isEn ? 'Lightly active — some walking' : 'Leicht aktiv — etwas Gehen'} (×1.3)</option>
							<option value="moderate">{isEn ? 'Moderately active — on feet' : 'Mässig aktiv — auf den Beinen'} (×1.4)</option>
							<option value="very_active">{isEn ? 'Very active — physical job' : 'Sehr aktiv — körperliche Arbeit'} (×1.5)</option>
						</select>
					</div>

					<div class="wizard-nav">
						<button class="btn-secondary" type="button" onclick={() => goalStep = 1}>← {isEn ? 'Back' : 'Zurück'}</button>
						<button class="btn-primary" type="button" onclick={() => goalStep = 3}>{isEn ? 'Next' : 'Weiter'} →</button>
					</div>
				</div>

			<!-- Step 3: Macros -->
			{:else if goalStep === 3}
				<div class="step-macros">
					<!-- Summary pills for previous steps -->
					<div class="step-pills">
						<button class="step-pill" type="button" onclick={() => goalStep = 1}>
							{#if selectedPresetIdx >= 0}{dietPresets[selectedPresetIdx].emoji}{/if} {stepPresetSummary}
						</button>
						<button class="step-pill" type="button" onclick={() => goalStep = 2}>{stepCalSummary}</button>
					</div>

					<!-- Macro donut ring -->
					{#if editCalNum > 0}
						<div class="macro-ring-wrap">
							<svg class="macro-ring" width="120" height="120" viewBox="0 0 120 120">
								<!-- Fat -->
								<circle cx="60" cy="60" r={RING_R}
									fill="none" stroke="var(--orange)" stroke-width="10"
									stroke-dasharray="{Math.max(0, editMacroRing.fatLen - RING_GAP)} {RING_C - Math.max(0, editMacroRing.fatLen - RING_GAP)}"
									stroke-linecap="round"
									transform="rotate(-90 60 60)"
									opacity={editMacroRing.fat > 0 ? 1 : 0} />
								<!-- Carbs -->
								<circle cx="60" cy="60" r={RING_R}
									fill="none" stroke="var(--lightblue)" stroke-width="10"
									stroke-dasharray="{Math.max(0, editMacroRing.carbLen - RING_GAP)} {RING_C - Math.max(0, editMacroRing.carbLen - RING_GAP)}"
									stroke-linecap="round"
									transform="rotate({-90 + editMacroRing.fatDeg} 60 60)"
									opacity={editMacroRing.carb > 0 ? 1 : 0} />
								<!-- Protein -->
								<circle cx="60" cy="60" r={RING_R}
									fill="none" stroke="var(--green)" stroke-width="10"
									stroke-dasharray="{Math.max(0, editMacroRing.protLen - RING_GAP)} {RING_C - Math.max(0, editMacroRing.protLen - RING_GAP)}"
									stroke-linecap="round"
									transform="rotate({-90 + editMacroRing.fatDeg + editMacroRing.carbDeg} 60 60)"
									opacity={editMacroRing.prot > 0 ? 1 : 0} />
								<text x="60" y="55" text-anchor="middle" class="ring-cal-main">{editCalNum}</text>
								<text x="60" y="70" text-anchor="middle" class="ring-cal-sub">kcal</text>
							</svg>
							<div class="macro-ring-legend">
								<span class="mrl-item"><span class="mrl-dot" style="background: var(--green)"></span><Beef size={12} /> {t.protein} {editMacroRing.prot}%</span>
								<span class="mrl-item"><span class="mrl-dot" style="background: var(--orange)"></span><Droplet size={12} /> {t.fat} {editMacroRing.fat}%</span>
								<span class="mrl-item"><span class="mrl-dot" style="background: var(--lightblue)"></span><Wheat size={12} /> {t.carbs} {editMacroRing.carb}%</span>
							</div>
						</div>
					{/if}

					<div class="goal-field">
						<label for="goal-protein-mode">{t.protein_goal}</label>
						<div class="protein-mode">
							<select id="goal-protein-mode" bind:value={editProteinMode}>
								<option value="fixed">{t.protein_fixed}</option>
								<option value="per_kg">{t.protein_per_kg}</option>
							</select>
							<input id="goal-protein-target" type="number" bind:value={editProteinTarget} min="0" step="0.1"
								placeholder={editProteinMode === 'per_kg' ? 'g/kg' : 'g'} />
						</div>
					</div>
					<div class="goal-row">
						<div class="goal-field">
							<label for="goal-fat">{t.fat_percent} <span class="macro-actual">→ {editMacroRing.fat}%</span></label>
							<input id="goal-fat" type="number" bind:value={editFatPercent} min="0" max="100" />
						</div>
						<div class="goal-field">
							<label for="goal-carbs">{t.carb_percent} <span class="macro-actual">→ {editMacroRing.carb}%</span></label>
							<input id="goal-carbs" type="number" bind:value={editCarbPercent} min="0" max="100" />
						</div>
					</div>

					<div class="wizard-nav">
						<button class="btn-secondary" type="button" onclick={() => goalStep = 2}>← {isEn ? 'Back' : 'Zurück'}</button>
						<div class="goal-actions-final">
							<button class="btn-secondary" onclick={() => showGoalEditor = false}>{t.cancel}</button>
							<button class="btn-primary" onclick={saveGoals} disabled={goalSaving}>
								{goalSaving ? t.saving : t.save}
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Round Off This Day (mobile) -->
	{#if showRoundOff}
		<div class="round-off-mobile">
			{@render roundOffSnippet()}
		</div>
	{/if}

	<!-- Liquid Tracking Card -->
	<div class="water-card">
		<div class="water-header">
			<div class="water-title">
				<GlassWater size={16} />
				<h3>{isEn ? 'Liquids' : 'Flüssigkeit'}</h3>
			</div>
			<div class="water-stats">
				<span class="water-amount">{parseFloat((totalLiquidMl / 1000).toFixed(2))} L</span>
				{#if editingGoal}
					<form class="goal-edit-inline" onsubmit={e => { e.preventDefault(); saveGoal(); }}>
						<span class="goal-slash">/</span>
						<input type="number" class="goal-input-inline" bind:value={goalInputL} min="0.25" step="0.25" />
						<span class="goal-unit">L</span>
						<button type="submit" class="goal-save-inline"><Check size={12} /></button>
					</form>
				{:else}
					<button class="water-goal-btn" onclick={() => { goalInputL = parseFloat((waterGoalMl / 1000).toFixed(2)); editingGoal = true; }}>
						/ {parseFloat((waterGoalMl / 1000).toFixed(2))} L
					</button>
				{/if}
				<button
					class="drink-settings-btn"
					class:open={showDrinkSettings}
					onclick={() => showDrinkSettings = !showDrinkSettings}
					aria-expanded={showDrinkSettings}
					aria-label={isEn ? 'Drink settings' : 'Getränke-Einstellungen'}
					title={isEn ? 'Drink settings' : 'Getränke-Einstellungen'}
				>
					<Settings size={13} />
				</button>
			</div>
		</div>
		{#if showDrinkSettings}
			<div class="drink-settings">
				<Toggle
					bind:checked={hotDrinkEnabled}
					label={isEn ? 'One-tap hot drink' : 'Heissgetränk auf Tastendruck'}
				/>
				{#if hotDrinkEnabled}
					<label class="drink-select-label">
						<span>{isEn ? 'Logs' : 'Erfasst'}</span>
						<select class="drink-select" bind:value={hotDrinkCode}>
							{#each HOT_DRINK_GROUPS as group}
								<optgroup label={isEn ? HOT_DRINK_GROUP_LABELS[group].en : HOT_DRINK_GROUP_LABELS[group].de}>
									{#each HOT_DRINKS.filter(d => d.group === group) as drink}
										<option value={drink.code}>{hotDrinkLabel(drink, isEn)}</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</label>
					<p class="drink-settings-hint">
						{isEn
							? `${HOT_DRINK_ML} ml per tap, into whichever meal the time of day falls in.`
							: `${HOT_DRINK_ML} ml pro Tastendruck, in die Mahlzeit der aktuellen Tageszeit.`}
					</p>
				{/if}
			</div>
		{/if}
		<div class="water-cups">
			{#if rowHotCups === 0}{@render hotDrinkAdd()}{/if}
			{#each Array(displayCups) as _, i}
				{@const isHot = i < rowHotCups}
				{@const isBev = !isHot && i < rowBeverageCups}
				{@const isMealLiquid = !isHot && !isBev && i < rowBeverageCups + rowMealLiquidCups}
				{@const isAuto = isHot || isBev || isMealLiquid}
				{@const isFilled = i < rowTotalCups}
				{@const showWater = isFilled || drainingCups.has(i)}
				{@const isNextEmpty = i === rowTotalCups && !drainingCups.has(i)}
				{@const cupPath = isHot ? MUG_PATH : GLASS_PATH}
				{@const waveFill = isHot ? 'var(--orange)' : isAuto ? 'var(--nord7)' : 'var(--blue)'}
				{@const waveFillAlt = isHot ? 'var(--yellow)' : isAuto ? 'var(--nord8)' : 'var(--lightblue)'}
				{@const waves = isHot ? MUG_WAVES : GLASS_WAVES}
				<button
					class="water-cup"
					class:filled={isFilled}
					class:beverage={isBev}
					class:hot-drink={isHot}
					class:meal-liquid={isMealLiquid}
					class:filling={fillingCups.has(i)}
					class:draining={drainingCups.has(i)}
					class:next-empty={isNextEmpty}
					disabled={isBev || isMealLiquid}
					onclick={() => {
						if (isBev || isMealLiquid) return;
						// Mugs are the first run, so the index is the count to keep.
						if (isHot) return void setHotDrinkCups(i);
						const autoOffset = rowBeverageCups + rowMealLiquidCups;
						const waterTarget = i < rowTotalCups ? i - autoOffset : i - autoOffset + 1;
						setWaterCups(Math.max(0, waterTarget));
					}}
					title="{isBev ? (isEn ? 'Beverage' : 'Getränk') : isMealLiquid ? (isEn ? 'From meal' : 'Aus Mahlzeit') : (i + 1) * WATER_CUP_ML + ' ml'}"
				>
					<svg viewBox="0 0 24 32" class="cup-svg" overflow="hidden">
						<defs>
							<clipPath id="cup-clip-{i}">
								<path d={cupPath} />
							</clipPath>
						</defs>
						{#if isHot}
							<path class="mug-handle" d={MUG_HANDLE_PATH} fill="none" stroke="var(--color-border)" stroke-width="1.6" />
						{/if}
						<!-- The next empty glass is an invitation too, so it wears water's colour at
						     the same muted strength the next mug wears the brew's. -->
						<path
							d={cupPath}
							fill="var(--color-bg-tertiary)"
							stroke={isNextEmpty ? 'var(--blue)' : 'var(--color-border)'}
							stroke-width={isNextEmpty ? 1.3 : 1.2}
							stroke-opacity={isNextEmpty ? 0.5 : 1}
						/>
						{#if showWater}
							<g clip-path="url(#cup-clip-{i})" class="water-body">
								<path class="water-wave w1" d={waves[0]} fill={waveFill} opacity="0.85" />
								<path class="water-wave w2" d={waves[1]} fill={waveFillAlt} opacity="0.5" />
								<path class="water-wave w3" d={waves[2]} fill={waveFill} opacity="0.35" />
							</g>
						{/if}
						{#if isHot && showWater}
							<!-- Wisps drift on a stagger per cup, so a row of mugs doesn't pulse in lockstep. -->
							<g class="steam" stroke="var(--orange)" stroke-width="1.2" stroke-linecap="round" fill="none" style="--steam-offset: {(i % 3) * 0.6}s">
								<path d="M8.5 6 C7 4.6 10 3.2 8.5 1.6" />
								<path d="M13.5 6 C12 4.8 15 3.5 13.5 2" />
							</g>
						{/if}
						{#if isNextEmpty}
							<text x="12" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="var(--blue)" fill-opacity="0.7">+</text>
						{/if}
					</svg>
				</button>
				{#if i === rowHotCups - 1}{@render hotDrinkAdd()}{/if}
			{/each}
		</div>
		{#if beverageEntries.length > 0 || mealLiquidMl > 0}
			<div class="beverage-list">
				{#each beverageEntries as bev}
					<div class="beverage-item">
						<span class="beverage-name">{bev.name}</span>
						<span class="beverage-ml">{Math.round(bev.amountGrams)} ml</span>
					</div>
				{/each}
				{#each entries.filter(e => (e.liquidMl ?? 0) > 0) as e}
					<div class="beverage-item">
						<span class="beverage-name">{e.name}</span>
						<span class="beverage-ml">{Math.round(e.liquidMl ?? 0)} ml</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if goalCalories}
		<!-- Micros card (desktop) -->
		<div class="micro-card">
			<h3 class="micro-card-title">{t.details}</h3>
			{@render microPanel()}
		</div>
	{/if}

	</div>

	<!-- Meal Sections -->
	<div class="meals-col">
	<!-- Round Off This Day (desktop) -->
	{#if showRoundOff}
		<div class="round-off-desktop">
			{@render roundOffSnippet()}
		</div>
	{/if}
	<!-- Offered only on a day with nothing logged, and sitting with the meals it
	     fills rather than in the summary column: on a day that already has entries
	     the copy appends rather than replaces, which reads as a mistake more often
	     than as a shortcut. -->
	{#if entries.length === 0}
		<div class="copy-yesterday">
			{#if copiedIds.length > 0}
				<span class="copy-done">
					{isEn ? `Copied ${copiedIds.length} items from yesterday` : `${copiedIds.length} Einträge von gestern kopiert`}
				</span>
				<button class="copy-btn is-undo" onclick={undoCopyYesterday} disabled={copying}>
					<Undo2 size={14} />
					{isEn ? 'Undo' : 'Rückgängig'}
				</button>
			{:else}
				<button class="copy-btn" onclick={copyYesterday} disabled={copying}>
					<CopyIcon size={14} />
					{copying
						? (isEn ? 'Copying…' : 'Kopiere…')
						: (isEn ? 'Copy from yesterday' : 'Von gestern kopieren')}
				</button>
			{/if}
		</div>
	{/if}
	{#each mealTypes as meal, mi}
		{@const mealEntries = grouped[meal]}
		{@const mealCal = mealEntries.reduce((s, e) => s + entryCalories(e), 0)}
		{@const meta = mealMeta[meal]}
		{@const MealSectionIcon = meta.icon}
		<div
			class="meal-section"
			data-meal-section={meal}
			class:drop-target={dragOverMeal === meal && draggingEntryId}
			class:copy-target={dragOverMeal === meal && draggingEntryId && dragCopy}
			style="--meal-color: {meta.color}"
			ondragover={(ev) => onMealDragOver(ev, meal)}
			ondragleave={(ev) => onMealDragLeave(ev, meal)}
			ondrop={(ev) => onMealDrop(ev, meal)}
			role="region"
			aria-label={t[meal]}
		>
			<div class="meal-header">
				<div class="meal-title">
					<div class="meal-icon">
						<MealSectionIcon size={15} />
					</div>
					<h3>{t[meal]}</h3>
				</div>
				{#if mealEntries.length > 0}
					<span class="meal-cal">{fmtCal(mealCal)} {t.kcal}</span>
				{/if}
			</div>

			<div class="meal-entries" role="list">
				{#each mealEntries as entry}
					{@const imgUrl = entry.source === 'recipe' && entry.sourceId ? recipeImages[entry.sourceId] : null}
					<!-- Dimming says "this card is leaving here". On a copy it is not: the
					     original stays put, so it keeps its normal weight. -->
					<div
						class="food-card"
						class:has-image={!!imgUrl}
						class:dragging={draggingEntryId === entry._id && !dragCopy}
						draggable={editingEntryId !== entry._id}
						role="listitem"
						ondragstart={(ev) => onEntryDragStart(ev, entry._id)}
						ondragend={onEntryDragEnd}
					>
						{#if imgUrl}
							<img class="food-card-img" src={imgUrl} alt={entry.name} loading="lazy" draggable="false" />
						{:else}
							<div class="food-card-accent" style="background: var(--meal-color)"></div>
						{/if}
						<div class="food-card-body">
						{#if entry.source === 'bls' || entry.source === 'usda' || entry.source === 'off'}
							<a class="food-card-name food-card-link" draggable="false" href={resolve('/fitness/[nutrition=fitnessNutrition]/food/[source]/[id]', { nutrition: s.nutrition, source: entry.source, id: entry.sourceId })}>{entry.name}</a>
						{:else if (entry.source === 'recipe' || entry.source === 'custom') && entry.sourceId}
							<a class="food-card-name food-card-link" draggable="false" href={`${resolve('/fitness/[nutrition=fitnessNutrition]/food/[source]/[id]', { nutrition: s.nutrition, source: entry.source, id: entry.sourceId })}?logEntry=${entry._id}`}>{entry.name}</a>
						{:else}
							<span class="food-card-name">{entry.name}</span>
						{/if}
							{#if editingEntryId === entry._id}
								<div class="food-card-edit-form">
									<PortionAmountInput
										bind:grams={editingGrams}
										bind:selectedPortion={editingPortion}
										portions={editingPortions}
										size="compact"
										onenter={saveEditEntry}
									/>
								</div>
								<div class="food-card-meal-pills" role="radiogroup" aria-label={isEn ? 'Meal' : 'Mahlzeit'}>
									{#each mealTypes as m}
										{@const MPIcon = mealMeta[m].icon}
										<button
											type="button"
											class="meal-pill"
											class:active={editingMeal === m}
											style="--pill-color: {mealMeta[m].color}"
											role="radio"
											aria-checked={editingMeal === m}
											onclick={() => { editingMeal = m; }}
										>
											<MPIcon size={11} />
											<span>{t[m]}</span>
										</button>
									{/each}
								</div>
							{:else}
								<span class="food-card-detail">{formatAmountLabel(entry.amountGrams, entry.selectedPortion)} · {fmtCal(entryCalories(entry))} kcal</span>
							{/if}
							<span class="food-card-macros">{fmt(entryNutrient(entry, 'protein'))}g <Beef size={10} /> · {fmt(entryNutrient(entry, 'fat'))}g <Droplet size={10} /> · {fmt(entryNutrient(entry, 'carbs'))}g <Wheat size={10} /></span>
						</div>
						<div class="food-card-actions">
							<button class="food-card-action edit" class:active={editingEntryId === entry._id} onclick={() => {
								if (editingEntryId === entry._id) { saveEditEntry(); } else { startEditEntry(entry); }
							}} aria-label="Edit">
								{#if editingEntryId === entry._id}
									<Check size={14} />
								{:else}
									<Pencil size={14} />
								{/if}
							</button>
							<button class="food-card-action delete" onclick={() => deleteEntry(entry._id)} aria-label={t.delete_}>
								<Trash2 size={14} />
							</button>
						</div>
					</div>
				{/each}
			</div>

			{#if addingMeal === meal}
				<div class="add-food-form">
					<div class="add-food-form-header">
						<div class="fab-tabs">
							<button class="fab-tab" class:active={inlineTab === 'search'} onclick={() => inlineTab = 'search'}>
								<Search size={13} />
								{t.search_food.replace('…', '')}
							</button>
							<button class="fab-tab" class:active={inlineTab === 'favorites'} onclick={() => { inlineTab = 'favorites'; loadFavTab(); }}>
								<Heart size={13} />
								{isEn ? 'Favorites' : 'Favoriten'}
							</button>
							<button class="fab-tab" class:active={inlineTab === 'recent'} onclick={() => { inlineTab = 'recent'; loadRecentTab(); }}>
								<Clock size={13} />
								{isEn ? 'Recent' : 'Kürzlich'}
							</button>
							<button class="fab-tab" class:active={inlineTab === 'meals'} onclick={() => { inlineTab = 'meals'; loadCustomMeals(); }}>
								<UtensilsCrossed size={13} />
								{t.custom_meals}
							</button>
						</div>
						<button class="fab-close" onclick={cancelAdd}><Plus size={18} style="transform: rotate(45deg)" /></button>
					</div>

					{#if inlineTab === 'search'}
						<FoodSearch onselect={inlineLogFood} onfavoritechange={handleFavoriteChange} showFavorites={false} highlightFavorites={true} autofocus={true} bind:query={addFoodQuery} />
					{:else if inlineTab === 'favorites'}
						{@render favoritesTab(inlineLogFood)}
					{:else if inlineTab === 'recent'}
						{@render recentTab(inlineLogFood)}
					{:else}
						{@render customMealsTab(inlineLogCustomMeal)}
					{/if}
				</div>
			{:else}
				<button class="add-food-btn" onclick={() => startAdd(meal)}>
					<Plus size={14} />
					{t.add_food}
				</button>
			{/if}
		</div>
	{/each}
	</div>

	<!-- Quick-log sidebar (desktop) -->
	<aside class="quick-log-col">
		<div class="quick-log-card">
			<h3 class="quick-log-title">{isEn ? 'Quick Log' : 'Schnell eintragen'}</h3>
			<div class="quick-log-meal-select">
				<MealTypePicker value={quickLogMealType} {lang} onchange={(m) => quickLogMealType = m} />
			</div>

			{#if quickFavorites.length > 0}
				<div class="ql-section">
					<h4 class="ql-section-title"><Heart size={12} /> {isEn ? 'Favorites' : 'Favoriten'}</h4>
					{#each quickFavorites as fav}
						{@const isActive = qlSelected?.source === fav.source && qlSelected?.sourceId === fav.sourceId}
						<button class="ql-item" class:active={isActive} onclick={() => qlSelect(fav)}>
							<span class="ql-item-name">{fav.name}</span>
							<Plus size={14} class="ql-item-add" />
						</button>
						{#if isActive}
							<div class="ql-amount-row">
								<PortionAmountInput
									bind:grams={qlGrams}
									bind:selectedPortion={qlPortion}
									portions={qlSelected?.portions ?? []}
									size="compact"
									showGramsHint={false}
									onenter={qlConfirm}
								/>
								<button type="button" class="ql-amount-confirm" onclick={qlConfirm} aria-label={t.log_food}><Check size={14} /></button>
							</div>
						{/if}
					{/each}
				</div>
			{/if}

			{#if recentFoods.length > 0}
				<div class="ql-section">
					<h4 class="ql-section-title"><Clock size={12} /> {isEn ? 'Recent' : 'Kürzlich'}</h4>
					{#each recentFoods as item}
						{@const isActive = qlSelected?.source === item.source && qlSelected?.sourceId === item.sourceId}
						<button class="ql-item" class:active={isActive} onclick={() => qlSelect(item)}>
							<span class="ql-item-name">{item.name}</span>
							<Plus size={14} class="ql-item-add" />
						</button>
						{#if isActive}
							<div class="ql-amount-row">
								<PortionAmountInput
									bind:grams={qlGrams}
									bind:selectedPortion={qlPortion}
									portions={qlSelected?.portions ?? []}
									size="compact"
									showGramsHint={false}
									onenter={qlConfirm}
								/>
								<button type="button" class="ql-amount-confirm" onclick={qlConfirm} aria-label={t.log_food}><Check size={14} /></button>
							</div>
						{/if}
					{/each}
				</div>
			{/if}

			{#if quickFavorites.length === 0 && recentFoods.length === 0}
				<p class="ql-empty">{isEn ? 'No favorites yet. Star foods in search to see them here.' : 'Noch keine Favoriten. Markiere Lebensmittel in der Suche.'}</p>
			{/if}
		</div>
	</aside>

</div>

<!--
	Next-day drop targets, shown only while an entry is in flight.

	Wide screens get a panel over the quick-log column — that column is the only
	thing on screen you are never reaching for mid-drag, and the boxes are placed at
	the measured tops of today's meal sections so each one sits beside its own meal.
	Narrower screens have no such column, so the same targets live behind a thin edge
	on the right that opens when the drag reaches it.
-->
{#if draggingEntryId && nextDayCol}
	<div class="nextday-panel">
		{#each nextDayBoxes as box (box.meal)}
			<div
				class="nextday-box"
				class:is-over={dragOverNextDay === box.meal}
				class:is-copy={dragOverNextDay === box.meal && dragCopy}
				style="top: {box.top}px; height: {box.height}px; left: {nextDayCol.left}px; width: {nextDayCol.width}px; --meal-color: {mealColor(box.meal)}"
				ondragover={(ev) => onNextDayDragOver(ev, box.meal)}
				ondragleave={() => { if (dragOverNextDay === box.meal) dragOverNextDay = null; }}
				ondrop={(ev) => onNextDayDrop(ev, box.meal)}
				role="region"
				aria-label="{isEn ? 'Tomorrow' : 'Morgen'} — {mealLabels[box.meal]}"
			>
				<span class="nextday-day">{isEn ? 'Tomorrow' : 'Morgen'}</span>
				<span class="nextday-meal">{mealLabels[box.meal]}</span>
				<span class="nextday-hint">
					{dragCopy ? (isEn ? 'Copy here' : 'Hierher kopieren') : (isEn ? 'Move here' : 'Hierher verschieben')}
				</span>
			</div>
		{/each}
	</div>

{/if}

{#if draggingEntryId && !nextDayCol}
	<div
		class="nextday-rail"
		class:is-open={nextDayRailOpen}
		ondragenter={() => (nextDayRailOpen = true)}
		ondragover={(ev) => ev.preventDefault()}
		ondragleave={(ev) => {
			const related = /** @type {Element|null} */ (ev.relatedTarget);
			const target = /** @type {Element} */ (ev.currentTarget);
			if (!related || !target.contains(related)) nextDayRailOpen = false;
		}}
		role="region"
		aria-label={isEn ? 'Move to tomorrow' : 'Auf morgen verschieben'}
	>
		{#if nextDayRailOpen}
			<div class="rail-list">
				<span class="rail-title">{isEn ? 'Tomorrow' : 'Morgen'}</span>
				{#each mealTypes as meal (meal)}
					<div
						class="rail-box"
						class:is-over={dragOverNextDay === meal}
						class:is-copy={dragOverNextDay === meal && dragCopy}
						style="--meal-color: {mealColor(meal)}"
						ondragover={(ev) => onNextDayDragOver(ev, meal)}
						ondragleave={() => { if (dragOverNextDay === meal) dragOverNextDay = null; }}
						ondrop={(ev) => onNextDayDrop(ev, meal)}
						role="region"
						aria-label="{isEn ? 'Tomorrow' : 'Morgen'} — {mealLabels[meal]}"
					>
						{mealLabels[meal]}
					</div>
				{/each}
			</div>
		{:else}
			<span class="rail-edge-label">{isEn ? 'Tomorrow' : 'Morgen'}</span>
		{/if}
	</div>
{/if}

<!-- FAB -->
<AddButton href={fabHref} />

<!-- FAB Modal -->
{#if showFabModal}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fab-overlay" onclick={closeFabModal} onkeydown={(e) => e.key === 'Escape' && closeFabModal()}>
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
		<div class="fab-modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
			<div class="fab-modal-header">
				<h3>{t.add_food}</h3>
				<button class="fab-close" onclick={closeFabModal}><Plus size={18} style="transform: rotate(45deg)" /></button>
			</div>

			<!-- Meal type selector -->
			<div class="fab-meal-select">
				{#each mealTypes as meal}
					{@const meta = mealMeta[meal]}
					{@const MealIcon = meta.icon}
					<button
						class="fab-meal-btn"
						class:active={fabMealType === meal}
						style="--mc: {meta.color}"
						onclick={() => fabMealType = meal}
					>
						<MealIcon size={14} />
						<span>{t[meal]}</span>
					</button>
				{/each}
			</div>

			<!-- Tabs: Search / Favorites / Custom Meals -->
			<div class="fab-tabs">
				<button class="fab-tab" class:active={fabTab === 'search'} onclick={() => fabTab = 'search'}>
					<Search size={13} />
					{t.search_food.replace('…', '')}
				</button>
				<button class="fab-tab" class:active={fabTab === 'favorites'} onclick={() => { fabTab = 'favorites'; loadFavTab(); }}>
					<Heart size={13} />
					{isEn ? 'Favorites' : 'Favoriten'}
				</button>
				<button class="fab-tab" class:active={fabTab === 'recent'} onclick={() => { fabTab = 'recent'; loadRecentTab(); }}>
					<Clock size={13} />
					{isEn ? 'Recent' : 'Kürzlich'}
				</button>
				<button class="fab-tab" class:active={fabTab === 'meals'} onclick={() => { fabTab = 'meals'; loadCustomMeals(); }}>
					<UtensilsCrossed size={13} />
					{t.custom_meals}
				</button>
			</div>

			{#if fabTab === 'search'}
				<FoodSearch onselect={fabLogFood} onfavoritechange={handleFavoriteChange} showFavorites={false} highlightFavorites={true} autofocus={true} bind:query={addFoodQuery} />
			{:else if fabTab === 'favorites'}
				{@render favoritesTab(fabLogFood)}
			{:else if fabTab === 'recent'}
				{@render recentTab(fabLogFood)}
			{:else}
				{@render customMealsTab(logCustomMeal)}
			{/if}
		</div>
	</div>
{/if}

<style>
	.nutrition-page {
		max-width: 600px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.sidebar-col, .meals-col, .quick-log-col {
		display: contents;
	}
	.quick-log-col {
		display: none;
	}
	.round-off-desktop {
		display: none;
	}
	@media (min-width: 1024px) {
		.round-off-mobile {
			display: none;
		}
		.round-off-desktop {
			display: block;
		}
		.nutrition-page {
			max-width: none;
			display: grid;
			grid-template-columns: minmax(320px, 380px) 1fr;
			grid-template-rows: auto 1fr;
			column-gap: 1.5rem;
			align-items: start;
		}
		.date-nav {
			grid-column: 1 / -1;
		}
		.sidebar-col {
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
			position: sticky;
			top: 1rem;
			z-index: 10;
		}
		.meals-col {
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
			min-width: 0;
		}
		.micro-inline {
			display: none;
		}
		.micro-card {
			display: block;
		}
		.micro-card .micro-details,
		.micro-card .micro-details.micro-hidden {
			display: grid;
			grid-template-columns: 1fr;
		}
	}
	@media (min-width: 1600px) {
		.nutrition-page {
			grid-template-columns: minmax(320px, 380px) 1fr 260px;
		}
		.quick-log-col {
			display: block;
			position: sticky;
			top: 1rem;
		}
	}

	/* ── Next-day drop targets ───────────────────────────────────────────────
	   Fixed, not absolute: the boxes are placed from getBoundingClientRect, which
	   is already viewport-relative, and a fixed parent keeps them there without
	   having to subtract scroll on every dragover. */
	/* Rendered only when a quick-log column was actually measured, so there is no
	   breakpoint to repeat here. Each box gets its left/width/top from that
	   measurement inline. */
	.nextday-panel {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 60;
	}
	.nextday-box {
		position: fixed;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15rem;
		padding: 0.5rem;
		border-radius: var(--radius-lg);
		border: 2px dashed color-mix(in srgb, var(--meal-color) 55%, transparent);
		background: color-mix(in srgb, var(--color-surface) 92%, transparent);
		backdrop-filter: blur(var(--glass-blur));
		color: var(--color-text-secondary);
		text-align: center;
		pointer-events: auto;
		transition: var(--transition-fast);
	}
	.nextday-box.is-over {
		border-style: solid;
		border-color: var(--meal-color);
		background: color-mix(in srgb, var(--meal-color) 16%, var(--color-surface));
		color: var(--color-text-primary);
	}
	.nextday-box.is-copy {
		border-color: var(--green);
		background: color-mix(in srgb, var(--green) 16%, var(--color-surface));
	}
	.nextday-day {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-tertiary);
	}
	.nextday-meal {
		font-weight: 700;
		color: var(--meal-color);
	}
	.nextday-hint {
		font-size: 0.72rem;
	}
	.nextday-rail {
		position: fixed;
		top: 50%;
		right: 0;
		translate: 0 -50%;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		max-height: 80vh;
		padding: 1.5rem 0;
		border-radius: var(--radius-lg) 0 0 var(--radius-lg);
		background: var(--glass-bg);
		backdrop-filter: blur(var(--glass-blur));
		border: 1px solid var(--glass-border);
		border-right: none;
		box-shadow: 0 4px 24px var(--glass-shadow);
		transition: width var(--transition-normal);
		overflow: hidden;
	}
	.nextday-rail.is-open {
		width: 11rem;
		padding: 0.6rem;
	}
	.rail-edge-label {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		writing-mode: vertical-rl;
		white-space: nowrap;
	}
	.rail-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		width: 100%;
	}
	.rail-title {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		text-align: center;
	}
	.rail-box {
		padding: 0.55rem 0.5rem;
		border-radius: var(--radius-md);
		border: 2px dashed color-mix(in srgb, var(--meal-color) 55%, transparent);
		color: var(--meal-color);
		font-size: 0.85rem;
		font-weight: 600;
		text-align: center;
		transition: var(--transition-fast);
	}
	.rail-box.is-over {
		border-style: solid;
		background: color-mix(in srgb, var(--meal-color) 18%, transparent);
	}
	.rail-box.is-copy {
		border-color: var(--green);
		color: var(--green);
		background: color-mix(in srgb, var(--green) 18%, transparent);
	}

	.meal-section.copy-target {
		outline-color: var(--green);
		background: color-mix(in srgb, var(--green) 12%, transparent);
	}


	/* ── Date Navigator ── */
	.date-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		position: relative;
	}
	.date-btn {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		text-decoration: none;
		transition: color 0.15s, background 0.15s;
	}
	.date-btn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.date-display {
		background: none;
		border: none;
		color: var(--color-text-primary);
		font-size: 1.05rem;
		font-weight: 700;
		padding: 0.35rem 0.75rem;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: background 0.15s;
		letter-spacing: -0.01em;
	}
	.today-badge {
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
	}
	.go-today-btn {
		position: absolute;
		right: 0;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent);
		padding: 0.25rem 0.6rem;
		text-decoration: none;
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.15s;
		-webkit-tap-highlight-color: transparent;
	}
	.go-today-btn:hover {
		background: color-mix(in srgb, var(--color-primary) 20%, transparent);
	}

	/* ── Daily Summary Card ── */
	.daily-summary {
		background: var(--color-surface);
		border-radius: 12px;
		padding: 1.25rem;
		box-shadow: var(--shadow-sm);
		position: relative;
		z-index: 10;
	}
	.daily-summary::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 12px;
		background: linear-gradient(135deg, color-mix(in srgb, var(--nord8) 8%, transparent), transparent 60%);
		pointer-events: none;
	}

	/* ── Calorie Trio: Eaten / Ring / Burned ── */
	.calorie-trio {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.cal-stat {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
	}
	.cal-stat-value {
		font-size: 1.4rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.03em;
		color: var(--color-text-primary);
	}
	.cal-stat-label {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}
	.projection-toggle {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.cal-stat-value.projected {
		opacity: 0.45;
		font-style: italic;
	}
	.cal-stat-value.projected.included {
		opacity: 0.8;
		color: var(--green);
	}
	.projected-label {
		font-style: italic;
	}
	.projected-template {
		font-size: 0.55rem;
		color: var(--color-text-tertiary);
		max-width: 80px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.burned-bmr {
		margin-top: 0.1rem;
		font-size: 0.6rem;
		color: var(--color-text-tertiary);
	}
	.tdee-info-wrap {
		position: relative;
		z-index: 50;
	}
	.tdee-info-trigger {
		display: inline-flex;
		align-items: center;
		vertical-align: middle;
		opacity: 0.5;
		cursor: pointer;
		margin-left: 0.1rem;
		background: none;
		border: none;
		padding: 0;
		color: inherit;
	}
	.tdee-info-trigger:hover {
		opacity: 0.9;
	}
	.tdee-info-tooltip {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: 0.35rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border, var(--nord3));
		border-radius: 8px;
		padding: 0.45rem 0.6rem;
		font-size: 0.65rem;
		font-weight: 400;
		font-style: normal;
		line-height: 1.5;
		color: var(--color-text-secondary);
		/* Sentence-length citations: wrapped and capped, because a nowrap panel is as
		   wide as its longest line and hangs a phone-width page off its own right
		   edge. clampToViewport then moves what is left of the overhang. */
		width: max-content;
		max-width: min(24rem, calc(100vw - 2rem));
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		z-index: 100;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.tdee-info-tooltip a {
		color: var(--orange);
		text-decoration: underline;
	}
	.tdee-info-tooltip .cite-note {
		font-size: 0.58rem;
		color: var(--color-text-tertiary);
		white-space: normal;
		max-width: 220px;
		margin-top: 0.1rem;
	}
	.bmr-hint {
		font-size: 0.55rem;
		color: var(--color-text-secondary);
		opacity: 0.7;
		margin-top: 0.15rem;
		line-height: 1.3;
	}
	.bmr-hint a {
		color: var(--orange);
		text-decoration: underline;
	}
	.calorie-ring {
		flex-shrink: 0;
		overflow: visible;
	}

	/* ── Macro Progress Bars ── */
	.macro-bars {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0 0.25rem;
		margin-bottom: 0.25rem;
	}
	.composition-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: 1.25rem;
		padding: 1rem 0.25rem 0;
		margin-top: 0.75rem;
		border-top: 1px solid var(--color-border);
	}
	/* A shortcut, not a call to action — pushed to the trailing edge below the
	   suggestions so it stays available without competing with them. */
	.copy-yesterday {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.copy-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.3rem 0.7rem;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
		font-size: 0.78rem;
		cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.copy-btn:hover:not(:disabled) {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.copy-btn:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.copy-done {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	@media (max-width: 560px) {
		.composition-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}
	.macro-bar-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}
	.macro-bar-label {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}
	.macro-bar-track {
		width: 100%;
		height: var(--meter-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		overflow: hidden;
		position: relative;
	}
	.macro-bar-fill {
		height: 100%;
		border-radius: 3px;
		transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.macro-bar-overflow {
		position: absolute;
		top: 0;
		right: 0;
		height: 100%;
		background: var(--red);
		border-radius: 0 3px 3px 0;
		animation: bar-overflow-fill 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.5s both;
	}
	@keyframes bar-overflow-fill {
		from { width: 0%; }
	}
	.macro-bar-info {
		font-size: 0.68rem;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}
	.macro-bar-info.over {
		color: var(--red);
		font-weight: 600;
	}

	/* ── SVG Ring Styles ── */
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
		transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.ring-calories {
		stroke: var(--color-primary);
		filter: drop-shadow(0 0 4px color-mix(in srgb, var(--color-primary) 25%, transparent));
	}
	.ring-calories.no-glow {
		filter: none;
	}
	.ring-glow {
		fill: none;
		stroke-width: 5;
		stroke-linecap: round;
		pointer-events: none;
	}
	.ring-calories-glow {
		stroke: var(--color-primary);
		filter: drop-shadow(0 0 4px color-mix(in srgb, var(--color-primary) 25%, transparent));
		stroke-dashoffset: var(--glow-target);
		animation: glow-shrink 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.6s both;
	}
	@keyframes glow-shrink {
		from { stroke-dashoffset: var(--glow-start); }
		to { stroke-dashoffset: var(--glow-target); }
	}
	.ring-overflow {
		stroke: var(--red);
		filter: drop-shadow(0 0 4px color-mix(in srgb, var(--red) 25%, transparent));
		stroke-dashoffset: var(--overflow-target);
		animation: overflow-fill 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.6s both;
	}
	@keyframes overflow-fill {
		from { stroke-dashoffset: var(--arc-length); }
		to { stroke-dashoffset: var(--overflow-target); }
	}
	.ring-text-main {
		font-size: 14px;
		font-weight: 800;
		fill: currentColor;
		text-anchor: middle;
	}
	.ring-text-sub {
		font-size: 8px;
		fill: var(--color-text-secondary);
		text-anchor: middle;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	/* ── Micro Details ── */
	.micro-inline {
		margin-top: 0.75rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border);
	}
	.micro-card {
		background: var(--color-surface);
		border-radius: 14px;
		padding: 1rem;
	}
	@media (max-width: 1023px) {
		.micro-card {
			display: none;
		}
		.micro-inline {
			display: block;
		}
	}
	.micro-card-title {
		margin: 0 0 0.75rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.details-toggle-row {
		text-align: center;
	}
	.details-toggle {
		font-size: 0.8rem;
		cursor: pointer;
		color: var(--color-text-secondary);
		background: none;
		border: none;
		padding: 0.25rem 0.5rem;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		transition: color 0.15s;
		font-weight: 500;
	}
	.details-toggle:hover {
		color: var(--color-text-primary);
	}

	.micro-details {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}
	.micro-details.micro-hidden {
		display: none;
	}
	.micro-section h4 {
		margin: 0 0 0.4rem;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}
		.micro-source {
		display: flex;
		align-items: center;
		margin: 0 0 0.2rem;
		font-size: 0.7rem;
		color: var(--color-text-secondary);
	}
	.micro-coverage {
		display: flex;
		align-items: flex-start;
		gap: 0.3rem;
		margin: 0 0 0.4rem;
		font-size: 0.7rem;
		line-height: 1.4;
		color: var(--color-text-secondary);
	}
	.micro-coverage :global(svg) {
		flex-shrink: 0;
		margin-top: 0.1rem;
		color: var(--orange);
	}
	.micro-note {
		margin: 0 0 0.4rem;
		font-size: 0.7rem;
		line-height: 1.4;
		color: var(--color-text-secondary);
	}
	
	/* ── Empty / No Goal State ── */
	.no-goal {
		text-align: center;
		padding: 3rem 1.5rem 2.5rem;
		background: var(--color-surface);
		border-radius: 12px;
		box-shadow: var(--shadow-sm);

	}
	.no-goal-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 50%;
		margin: 0 auto 1rem;
		color: var(--purple);
		background: color-mix(in srgb, var(--purple) 12%, transparent);
	}
	.no-goal p {
		color: var(--color-text-secondary);
		margin: 0 0 1.25rem;
		font-size: 0.9rem;
	}

	/* ── Goal Editor ── */
	.goal-edit-btn {
		background: none;
		border: none;
		color: var(--color-text-tertiary);
		cursor: pointer;
		font-size: 0.75rem;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0;
		transition: color 0.15s;
		font-weight: 500;
	}
	.goal-edit-btn:hover {
		color: var(--color-text-primary);
	}

	.goal-editor {
		background: var(--color-surface);
		border-radius: 12px;
		padding: 1.25rem;
		box-shadow: var(--shadow-sm);
	}
	.goal-editor h3 {
		margin: 0 0 0.75rem;
		font-size: 0.95rem;
		font-weight: 700;
	}

	/* Wizard steps indicator */
	.wizard-steps {
		display: flex;
		align-items: center;
		gap: 0;
		margin-bottom: 1.25rem;
	}
	.wizard-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
	}
	.ws-num {
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		font-weight: 700;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		border: 2px solid var(--color-border);
		transition: all 0.2s;
	}
	.wizard-step.active .ws-num {
		background: var(--blue);
		color: white;
		border-color: var(--blue);
	}
	.wizard-step.done .ws-num {
		background: var(--green);
		color: white;
		border-color: var(--green);
	}
	.ws-label {
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-tertiary);
	}
	.wizard-step.active .ws-label {
		color: var(--blue);
	}
	.ws-line {
		flex: 1;
		height: 2px;
		background: var(--color-border);
		margin: 0 0.3rem;
		margin-bottom: 1rem;
		transition: background 0.2s;
	}
	.ws-line.done {
		background: var(--green);
	}

	/* Preset cards (Step 1) */
	.preset-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.preset-grid {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.preset-card {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.65rem 0.75rem;
		background: var(--color-bg-tertiary);
		border: 1.5px solid var(--color-border);
		border-radius: 10px;
		cursor: pointer;
		text-align: left;
		transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
	}
	.preset-card:hover {
		border-color: var(--blue);
		background: color-mix(in srgb, var(--blue) 6%, var(--color-bg-tertiary));
	}
	.preset-card.selected {
		border-color: var(--blue);
		background: color-mix(in srgb, var(--blue) 10%, var(--color-bg-tertiary));
		box-shadow: 0 0 0 1px var(--blue);
	}
	.preset-card-emoji {
		font-size: 1.3rem;
		flex-shrink: 0;
		width: 2rem;
		text-align: center;
	}
	.preset-card-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}
	.preset-card-name {
		font-size: 0.82rem;
		font-weight: 650;
		color: var(--color-text-primary);
	}
	.preset-card-desc {
		font-size: 0.68rem;
		color: var(--color-text-tertiary);
		line-height: 1.3;
	}
	.wizard-skip {
		background: none;
		border: none;
		color: var(--color-text-tertiary);
		font-size: 0.72rem;
		cursor: pointer;
		padding: 0.3rem 0;
		text-align: center;
		transition: color 0.15s;
	}
	.wizard-skip:hover {
		color: var(--color-text-secondary);
	}

	/* Step summary pills */
	.step-pills {
		display: flex;
		gap: 0.35rem;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}
	.step-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.6rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 20px;
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: border-color 0.15s;
	}
	.step-pill:hover {
		border-color: var(--blue);
		color: var(--blue);
	}

	/* TDEE warning */
	.tdee-warning {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.6rem 0.75rem;
		background: color-mix(in srgb, var(--yellow) 10%, var(--color-bg-tertiary));
		border: 1px solid color-mix(in srgb, var(--yellow) 30%, var(--color-border));
		border-radius: 8px;
		margin-bottom: 0.75rem;
		color: var(--color-amber-text);
	}
	.tdee-warning :global(svg) {
		flex-shrink: 0;
		margin-top: 0.1rem;
	}
	.tdee-warning-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		font-size: 0.75rem;
	}
	.tdee-warning-text strong {
		font-size: 0.78rem;
	}
	.tdee-warning-text span {
		color: var(--color-text-secondary);
	}
	.tdee-warning-text a {
		color: var(--blue);
		text-decoration: underline;
	}

	/* TDEE comparison */
	.tdee-compare {
		margin-bottom: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.tdee-compare-bar-wrap {
		position: relative;
		height: 10px;
		background: var(--color-bg-tertiary);
		border-radius: 5px;
		overflow: hidden;
	}
	.tdee-compare-ref {
		position: absolute;
		inset: 0;
		background: var(--color-text-tertiary);
		opacity: 0.18;
		border-radius: 5px;
	}
	.tdee-compare-target {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		border-radius: 5px;
		transition: width 0.3s;
	}
	.tdee-compare-target.deficit { background: var(--lightblue); }
	.tdee-compare-target.surplus { background: var(--orange); }
	.tdee-compare-target.maintenance { background: var(--green); }
	.tdee-compare-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.65rem;
		color: var(--color-text-tertiary);
	}
	.tdee-compare-label strong {
		color: var(--color-text-secondary);
	}
	.tdee-compare-diff {
		font-size: 0.68rem;
		font-weight: 600;
		text-align: center;
	}
	.tdee-compare-diff.deficit { color: var(--lightblue); }
	.tdee-compare-diff.surplus { color: var(--orange); }
	.tdee-compare-diff.maintenance { color: var(--green); }

	/* Macro donut ring */
	.macro-ring-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 0.75rem;
		padding: 0.5rem 0;
	}
	.macro-ring {
		flex-shrink: 0;
	}
	.ring-cal-main {
		font-size: 1.1rem;
		font-weight: 700;
		fill: var(--color-text-primary);
	}
	.ring-cal-sub {
		font-size: 0.55rem;
		font-weight: 500;
		fill: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.macro-ring-legend {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.mrl-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.72rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}
	.mrl-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	/* Goal form fields */
	.goal-field {
		margin-bottom: 0.75rem;
	}
	.calorie-input-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	.calorie-input-row input {
		flex: 1;
	}
	.bmr-calc-btn {
		padding: 0.4rem 0.6rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-secondary);
		font-size: 0.7rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}
	.bmr-calc-btn:hover {
		border-color: var(--blue);
		color: var(--blue);
	}
	.tdee-basis {
		display: block;
		font-size: 0.62rem;
		color: var(--color-text-tertiary);
		margin-top: 0.25rem;
	}
	.goal-field label {
		display: block;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		margin-bottom: 0.3rem;
	}
	.macro-actual {
		font-weight: 700;
		color: var(--color-text-primary);
		text-transform: none;
	}
	.goal-field input,
	.goal-field select {
		width: 100%;
		padding: 0.55rem 0.65rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 0.9rem;
		transition: border-color 0.15s;
		box-sizing: border-box;
	}
	.goal-field input:focus,
	.goal-field select:focus {
		outline: none;
		border-color: var(--nord8);
	}
	.protein-mode {
		display: flex;
		gap: 0.5rem;
	}
	.protein-mode select {
		flex: 1;
	}
	.protein-mode input {
		flex: 1;
	}
	.goal-row {
		display: flex;
		gap: 0.75rem;
	}
	.goal-row .goal-field {
		flex: 1;
	}
	.wizard-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.75rem;
	}
	.goal-actions-final {
		display: flex;
		gap: 0.5rem;
	}

	/* ── Meal Sections ── */
	/* Water card */
	.water-card {
		background: var(--color-surface);
		border-radius: 12px;
		padding: 0.75rem 1rem;
		margin-bottom: 0.75rem;
		border: 1px solid var(--color-border);
	}
	.water-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}
	.water-title {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--blue);
	}
	.water-title h3 {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.water-stats {
		display: flex;
		align-items: center;
		gap: 0.15rem;
	}
	.water-amount {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--blue);
	}
	.water-goal-btn {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		padding: 0;
	}
	.goal-edit-inline {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.goal-slash {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.goal-input-inline {
		width: 48px;
		padding: 0.15rem 0.3rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-text-primary);
		font-size: 0.8rem;
		text-align: right;
	}
	.goal-input-inline:focus {
		outline: none;
		border-color: var(--blue);
	}
	.goal-unit {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}
	.goal-save-inline {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 2px solid var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 200ms;
		padding: 0;
	}
	.goal-save-inline:hover {
		border-color: var(--green);
		background: var(--green);
		color: white;
		box-shadow: 0 2px 8px rgba(163, 190, 140, 0.35);
		transform: scale(1.08);
	}
	.goal-save-inline:active {
		transform: scale(0.95);
		background: #8fad7a;
		border-color: #8fad7a;
		color: white;
	}
	.water-cups {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		flex-wrap: wrap;
	}
	.water-cup {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		width: 26px;
		height: 34px;
		-webkit-tap-highlight-color: transparent;
	}
	@media (min-width: 500px) {
		.water-cup {
			width: 34px;
			height: 44px;
		}
	}
	.cup-svg {
		width: 100%;
		height: 100%;
	}
	.water-cup:disabled {
		cursor: default;
		opacity: 1;
	}
	.water-cup.next-empty:hover .cup-svg > path:first-of-type,
	.water-cup.next-empty:focus-visible .cup-svg > path:first-of-type {
		fill: color-mix(in srgb, var(--blue) 20%, var(--color-bg-tertiary));
	}
	/* Both ghost vessels come up to full strength only under the pointer. */
	.water-cup.next-empty:hover .cup-svg path,
	.water-cup.next-empty:focus-visible .cup-svg path,
	.water-cup.next-empty:hover .cup-svg text,
	.water-cup.next-empty:focus-visible .cup-svg text {
		stroke-opacity: 1;
		fill-opacity: 1;
	}

	/* Steam off a filled mug — the only thing on this card that moves on its own,
	   so it stays slow and faint rather than blinking for attention. */
	.steam path {
		transform-box: fill-box;
		transform-origin: bottom center;
		opacity: 0;
		animation: steam-rise 3.2s ease-out infinite;
		animation-delay: var(--steam-offset, 0s);
	}
	.steam path:nth-child(2) {
		animation-duration: 3.8s;
		animation-delay: calc(var(--steam-offset, 0s) + 1.3s);
	}
	@keyframes steam-rise {
		0% { opacity: 0; transform: translateY(2.5px) scaleY(0.65); }
		25% { opacity: 0.65; }
		65% { opacity: 0.4; }
		100% { opacity: 0; transform: translateY(-3px) scaleY(1.2); }
	}
	@media (prefers-reduced-motion: reduce) {
		.steam path {
			animation: none;
			opacity: 0.5;
		}
	}

	/* Hot drinks: an empty mug you press to log another cup. Same solid outline and
	   filled body as the next empty glass, drawn in a muted brew colour so shape and
	   colour agree on what it pours without shouting over the day's record. */
	.hot-drink-add {
		cursor: pointer;
		transition: transform var(--transition-fast);
	}
	.hot-drink-add:hover .cup-svg > path:nth-of-type(2),
	.hot-drink-add:focus-visible .cup-svg > path:nth-of-type(2) {
		fill: color-mix(in srgb, var(--orange) 20%, var(--color-bg-tertiary));
	}
	/* Full strength only under the pointer — the resting state stays quiet. */
	.hot-drink-add:hover .cup-svg path,
	.hot-drink-add:focus-visible .cup-svg path,
	.hot-drink-add:hover .cup-svg text,
	.hot-drink-add:focus-visible .cup-svg text {
		stroke-opacity: 1;
		fill-opacity: 1;
	}
	.hot-drink-add:active {
		transform: scale(0.94);
	}
	.hot-drink-add:disabled {
		opacity: 0.4;
		cursor: progress;
	}

	/* Drink settings */
	.drink-settings-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		padding: 0.15rem;
		margin-left: 0.3rem;
		cursor: pointer;
		color: var(--color-text-secondary);
		transition: color var(--transition-fast);
	}
	.drink-settings-btn:hover,
	.drink-settings-btn.open {
		color: var(--color-text-primary);
	}
	.drink-settings {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.6rem;
		padding: 0.6rem 0.7rem;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-md);
	}
	.drink-select-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.drink-select {
		flex: 1;
		min-width: 0;
		padding: 0.3rem 0.4rem;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-primary);
		font-size: 0.8rem;
	}
	.drink-select:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.drink-settings-hint {
		margin: 0;
		font-size: 0.72rem;
		color: var(--color-text-secondary);
	}

	/* Water fill animation — only on newly filled cups */
	.water-cup.filling .water-body {
		animation: water-rise 800ms ease-out both;
	}
	.water-cup.filling .water-wave.w1 {
		animation: wave-slosh 1.2s ease-in-out both;
	}
	.water-cup.filling .water-wave.w2 {
		animation: wave-slosh 1s ease-in-out 0.1s both reverse;
	}
	.water-cup.filling .water-wave.w3 {
		animation: wave-slosh 1.4s ease-in-out 0.05s both;
	}
	.water-cup.draining .water-body {
		animation: water-drain 400ms ease-in both;
	}
	.water-cup.draining .water-wave.w1 {
		animation: wave-slosh 500ms ease-in-out both;
	}
	.water-cup.draining .water-wave.w2 {
		animation: wave-slosh 400ms ease-in-out both reverse;
	}
	.water-cup.draining .water-wave.w3 {
		animation: wave-slosh 550ms ease-in-out both;
	}
	@keyframes water-rise {
		from { transform: translateY(24px); }
		to { transform: translateY(0); }
	}
	@keyframes water-drain {
		from { transform: translateY(0); }
		to { transform: translateY(24px); }
	}
	@keyframes wave-slosh {
		0% { transform: translateX(0); }
		20% { transform: translateX(-6px); }
		40% { transform: translateX(5px); }
		60% { transform: translateX(-3px); }
		80% { transform: translateX(2px); }
		100% { transform: translateX(0); }
	}

	/* Beverage list */
	.beverage-list {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.beverage-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.8rem;
	}
	.beverage-name {
		color: var(--color-text-secondary);
	}
	.beverage-ml {
		color: var(--blue);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.meal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.3rem;
		padding: 0 0.1rem;
	}
	.meal-title {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.meal-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 6px;
		color: var(--meal-color);
		background: color-mix(in srgb, var(--meal-color) 12%, transparent);
	}
	.meal-header h3 {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}
	.meal-cal {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.meal-entries {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.35rem;
	}

	/* ── Food card: horizontal (mobile default) ── */
	.food-card {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem;
		background: var(--color-surface);
		border-radius: 10px;
		box-shadow: var(--shadow-sm);
		transition: background 0.12s, opacity 0.12s, transform 0.12s;
		position: relative;
	}
	.food-card[draggable="true"] {
		cursor: grab;
	}
	.food-card[draggable="true"]:active {
		cursor: grabbing;
	}
	.food-card.dragging {
		opacity: 0.4;
		transform: scale(0.98);
	}
	.food-card:hover {
		background: var(--color-bg-elevated);
	}
	.meal-section.drop-target {
		background: color-mix(in srgb, var(--meal-color) 14%, transparent);
		outline: 2px dashed var(--meal-color);
		outline-offset: -4px;
		border-radius: 12px;
	}
	.food-card-meal-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 0.25rem;
	}
	.meal-pill {
		all: unset;
		-webkit-tap-highlight-color: transparent;
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.15rem 0.45rem;
		border-radius: var(--radius-pill, 1000px);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: 0.68rem;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid transparent;
		transition: background 0.1s, color 0.1s, border-color 0.1s;
	}
	.meal-pill:hover {
		color: var(--color-text-primary);
	}
	.meal-pill.active {
		background: var(--pill-color);
		color: var(--color-text-on-primary, #fff);
		border-color: var(--pill-color);
	}
	.food-card-img {
		width: 3.2rem;
		height: 3.2rem;
		border-radius: 8px;
		object-fit: cover;
		flex-shrink: 0;
	}
	.food-card-accent {
		width: 4px;
		height: 2.6rem;
		border-radius: 2px;
		opacity: 0.5;
		flex-shrink: 0;
		margin-left: 0.2rem;
	}
	.food-card-body {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
		flex: 1;
	}
	.food-card-name {
		font-size: 0.85rem;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	.food-card-link {
		color: var(--color-text-primary);
		text-decoration: none;
	}
	.food-card-link:hover {
		text-decoration: underline;
		text-decoration-color: var(--nord8);
		text-underline-offset: 2px;
	}
	.food-card-detail {
		font-size: 0.72rem;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}
	.food-card-edit-form {
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}
	.food-card-macros {
		display: flex;
		align-items: center;
		gap: 0.15rem;
		font-size: 0.65rem;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}
	.food-card-actions {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		flex-shrink: 0;
		align-self: flex-start;
	}
	.food-card-action {
		background: none;
		border: none;
		color: var(--color-text-tertiary);
		cursor: pointer;
		padding: 0.3rem;
		border-radius: 6px;
		transition: color 0.12s, background 0.12s;
		display: flex;
	}
	.food-card-action.edit:hover {
		color: var(--blue);
		background: color-mix(in srgb, var(--blue) 10%, transparent);
	}
	.food-card-action.edit.active {
		color: var(--green);
	}
	.food-card-action.edit.active:hover {
		color: var(--green);
		background: color-mix(in srgb, var(--green) 10%, transparent);
	}
	.food-card-action.delete:hover {
		color: var(--red);
		background: color-mix(in srgb, var(--red) 10%, transparent);
	}

	/* ── Wider screens: grid of vertical cards ── */
	@media (min-width: 600px) {
		.meal-entries {
			grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
			gap: 0.5rem;
		}
		.food-card {
			flex-direction: column;
			align-items: stretch;
			padding: 0;
			overflow: hidden;
		}
		.food-card-img {
			width: 100%;
			height: 7rem;
			border-radius: 0;
		}
		.food-card-accent {
			width: 100%;
			height: 4px;
			margin-left: 0;
			border-radius: 0;
		}
		.food-card-body {
			padding: 0.5rem 0.6rem;
			gap: 0.15rem;
		}
		.food-card-name {
			font-size: 0.8rem;
			white-space: normal;
		}
		.food-card-actions {
			position: absolute;
			bottom: 0.3rem;
			right: 0.3rem;
			flex-direction: row;
			opacity: 0;
			transition: opacity 0.15s;
		}
		.food-card-action {
			background: color-mix(in srgb, var(--color-surface) 80%, transparent);
			border-radius: 50%;
			padding: 0.25rem;
		}
		.food-card:hover .food-card-actions,
		.food-card-actions:has(.active) {
			opacity: 1;
		}
	}

	/* ── Add Food ── */
	.add-food-btn {
		background: none;
		border: 1px dashed var(--color-border);
		color: var(--color-text-tertiary);
		cursor: pointer;
		padding: 0.45rem 0.75rem;
		border-radius: 10px;
		font-size: 0.78rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		width: 100%;
		justify-content: center;
		transition: color 0.15s, border-color 0.15s;
		margin-top: 0.5rem;
	}
	.add-food-btn:hover {
		color: var(--meal-color);
		border-color: var(--meal-color);
	}

	.add-food-form {
		background: var(--color-surface);
		border-radius: 10px;
		padding: 0.85rem;
		box-shadow: var(--shadow-sm);
		margin-top: 0.5rem;
	}
	.add-food-form-header {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}
	.add-food-form-header .fab-close {
		margin-top: -0.5rem;
		margin-right: -0.5rem;
	}
	.add-food-form-header .fab-tabs {
		flex: 1;
	}
	/* Search/food selection handled by FoodSearch component */

	/* ── Buttons ── */
	.btn-primary {
		padding: 0.5rem 1.1rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.01em;
		transition: background 0.15s, transform 0.1s;
	}
	.btn-primary:hover {
		filter: brightness(1.1);
	}
	.btn-primary:active {
		transform: scale(0.97);
	}
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}
	.btn-secondary {
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

	/* ── Day Total ── */
	/* ── FAB Modal ── */
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

	/* ── FAB Meal selector ── */
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

	/* ── FAB Tabs ── */
	.fab-tabs {
		display: flex;
		gap: 0;
		border-bottom: 2px solid var(--color-border);
		margin-bottom: 0.25rem;
	}
	.fab-tab {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		padding: 0.5rem 0.25rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		cursor: pointer;
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--color-text-tertiary);
		transition: color 0.15s, border-color 0.15s;
	}
	.fab-tab.active {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
	}
	.fab-tab:hover:not(.active) {
		color: var(--color-text-secondary);
	}

	/* ── Custom Meals in FAB ── */
	.custom-meals-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.meals-empty {
		text-align: center;
		color: var(--color-text-tertiary);
		font-size: 0.85rem;
		padding: 1rem 0;
		margin: 0;
	}
	.cm-filter-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.25rem;
	}
	.cm-filter-input {
		flex: 1;
		min-width: 0;
		padding: 0.55rem 0.65rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 0.9rem;
		box-sizing: border-box;
		transition: border-color 0.15s;
	}
	.cm-filter-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.cm-clear-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.3rem;
		border-radius: 50%;
		flex-shrink: 0;
		transition: background 0.12s;
	}
	.cm-clear-btn:hover {
		background: var(--color-bg-elevated);
	}
	.custom-meal-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.6rem 0.75rem;
		cursor: pointer;
		background: var(--color-bg-tertiary);
		border-radius: 10px;
		border: 1px solid var(--color-border);
	}
	.custom-meal-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}
	.custom-meal-name {
		font-weight: 600;
		font-size: 0.88rem;
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.custom-meal-detail {
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
	}
	/* Custom meal detail screen */
	.cm-detail {
		padding: 0.75rem;
	}
	.cm-detail-header {
		margin-bottom: 0.75rem;
	}
	.cm-detail-name {
		display: block;
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-text-primary);
		line-height: 1.3;
	}
	.cm-detail-sub {
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
	}
	.cm-detail-amount {
		display: flex;
		gap: 0.4rem;
		margin-bottom: 0.25rem;
	}
	.cm-detail-amount-input {
		width: 5rem;
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		font-size: 0.9rem;
		text-align: right;
	}
	.cm-detail-amount-input:focus {
		outline: none;
		border-color: var(--nord8);
	}
	.cm-detail-amount-unit {
		flex: 1;
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		font-size: 0.9rem;
	}
	.cm-detail-hint {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		margin-bottom: 0.5rem;
	}
	.cm-detail-ingredients {
		margin-bottom: 0.75rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.cm-detail-ingredients summary {
		cursor: pointer;
		font-weight: 600;
		color: var(--color-text-primary);
		padding: 0.3rem 0;
	}
	.cm-detail-ingredients ul {
		margin: 0.25rem 0 0;
		padding-left: 1.2rem;
		list-style: disc;
	}
	.cm-detail-ingredients li {
		padding: 0.15rem 0;
	}
	.cm-detail-actions {
		display: flex;
		gap: 0.5rem;
	}
	.cm-detail-btn-cancel {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: 0.85rem;
		cursor: pointer;
		transition: background 0.12s;
	}
	.cm-detail-btn-cancel:hover {
		background: var(--color-bg-elevated);
	}
	.cm-detail-btn-confirm {
		flex: 2;
		padding: 0.5rem;
		border: none;
		border-radius: 8px;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.12s;
	}
	.cm-detail-btn-confirm:hover {
		opacity: 0.9;
	}
	.manage-meals-link {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		padding: 0.5rem;
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: 0.78rem;
		font-weight: 500;
		transition: color 0.15s;
	}
	.manage-meals-link:hover {
		color: var(--color-text-primary);
	}

	/* ── Quick-log Sidebar ── */
	.quick-log-card {
		background: var(--color-surface);
		border-radius: 14px;
		padding: 0.75rem;
	}
	.quick-log-title {
		margin: 0 0 0.5rem;
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}
	.quick-log-meal-select {
		margin-bottom: 0.75rem;
	}
	.ql-section {
		margin-bottom: 0.5rem;
	}
	.ql-section-title {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		margin: 0 0 0.3rem;
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
	}
	.ql-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.4rem 0.5rem;
		border-radius: 8px;
		border: none;
		background: none;
		cursor: pointer;
		color: var(--color-text-primary);
		font-size: 0.78rem;
		text-align: left;
		transition: background 0.12s;
	}
	.ql-item:hover {
		background: var(--color-bg-elevated);
	}
	.ql-item-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
		flex: 1;
	}
	.ql-item :global(.ql-item-add) {
		flex-shrink: 0;
		color: var(--color-text-tertiary);
		transition: color 0.12s;
	}
	.ql-item:hover :global(.ql-item-add) {
		color: var(--color-primary);
	}
	.ql-item.active {
		background: var(--color-bg-elevated);
	}
	.ql-amount-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.3rem;
		padding: 0.25rem 0.5rem 0.4rem;
	}
	.ql-amount-confirm {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.3rem;
		border: none;
		border-radius: 6px;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		cursor: pointer;
		transition: filter 0.12s;
	}
	.ql-amount-confirm:hover {
		filter: brightness(1.1);
	}
	.ql-empty {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		text-align: center;
		padding: 1rem 0.5rem;
		margin: 0;
	}
</style>
