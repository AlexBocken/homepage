<script>
	import { page } from '$app/stores';
	import { goto, invalidateAll } from '$app/navigation';
	import { ChevronLeft, ChevronRight, Plus, Trash2, ChevronDown, Settings, Coffee, Sun, Moon, Cookie, Utensils, Info, UtensilsCrossed, AlertTriangle, Check, GlassWater, Pencil, Heart, Clock, Search } from '@lucide/svelte';
	import { detectFitnessLang, fitnessSlugs, t } from '$lib/js/fitnessI18n';
	import AddButton from '$lib/components/AddButton.svelte';
	import FoodSearch from '$lib/components/fitness/FoodSearch.svelte';
	import MacroBreakdown from '$lib/components/fitness/MacroBreakdown.svelte';
	import { toast } from '$lib/js/toast.svelte';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import { getDRI, NUTRIENT_META } from '$lib/data/dailyReferenceIntake';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const s = $derived(fitnessSlugs(lang));
	const isEn = $derived(lang === 'en');

	let { data } = $props();

	// --- Date navigation ---
	// svelte-ignore state_referenced_locally
	let currentDate = $state(data.date);
	const todayStr = new Date().toISOString().slice(0, 10);
	const isToday = $derived(currentDate === todayStr);

	const displayDate = $derived.by(() => {
		const d = new Date(currentDate + 'T12:00:00');
		return d.toLocaleDateString(isEn ? 'en-US' : 'de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
	});

	async function navigateDate(offset) {
		const d = new Date(currentDate + 'T12:00:00');
		d.setDate(d.getDate() + offset);
		currentDate = d.toISOString().slice(0, 10);
		await loadEntries();
	}

	async function goToday() {
		currentDate = todayStr;
		await loadEntries();
	}

	// --- Entries ---
	// svelte-ignore state_referenced_locally
	let entries = $state(data.foodLog?.entries ?? []);
	// svelte-ignore state_referenced_locally
	let recipeImages = $state(data.recipeImages ?? {});

	async function loadEntries() {
		await goto(`/fitness/${s.nutrition}?date=${currentDate}`, { replaceState: true, noScroll: true });
	}

	// Keep reactive with server data when navigating
	$effect(() => {
		entries = data.foodLog?.entries ?? [];
		recipeImages = data.recipeImages ?? {};
		exerciseKcal = Number(data.exerciseKcal) || 0;
		currentDate = data.date;
	});

	// --- Goals ---
	// svelte-ignore state_referenced_locally
	let goalCalories = $state(data.goal?.dailyCalories ?? null);
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
		editCalories = String(goalCalories ?? '');
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
	const RING_R = 48;
	const RING_C = 2 * Math.PI * RING_R;
	const RING_GAP = 4;
	const editMacroRing = $derived.by(() => {
		const cal = Number(editCalories) || 0;
		const fat = Number(editFatPercent) || 0;
		const carb = Number(editCarbPercent) || 0;
		const prot = Math.max(0, 100 - fat - carb);
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
	const stepMacroSummary = $derived.by(() => {
		const f = Number(editFatPercent) || 0;
		const c = Number(editCarbPercent) || 0;
		const p = Math.max(0, 100 - f - c);
		return `P${p}% F${f}% C${c}%`;
	});

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
				goalCalories = d.dailyCalories;
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
	const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

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

	/** BLS Trinkwasser (N110000) per100g */
	const WATER_PER100G = {
		calories: 0, protein: 0, fat: 0, saturatedFat: 0, carbs: 0, fiber: 0, sugars: 0,
		calcium: 5.3, iron: 0, magnesium: 0.9, phosphorus: 0.011, potassium: 0.2,
		sodium: 2.3, zinc: 0.001, vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminE: 0,
		vitaminK: 0, thiamin: 0, riboflavin: 0, niacin: 0, vitaminB6: 0, vitaminB12: 0,
		folate: 0, cholesterol: 0,
	};

	/** Detect if a food log entry is a beverage (non-water) */
	const DRINK_PATTERNS = /^(milch|kaffee|coffee|tee|tea|cola|fanta|sprite|saft|juice|limo|smoothie|kakao|cocoa|bier|beer|wein|wine|eistee|ice tea|energy|redbull|red bull|mate|schorle|sprudel|mineral|orangensaft|apfelsaft|multivitamin|iso|gatorade|powerade)/i;
	function isBeverage(e) {
		if (e.mealType === 'water') return false;
		if (e.source === 'bls' && e.sourceId?.startsWith('N')) return true;
		return DRINK_PATTERNS.test(e.name);
	}

	/** Detect if a custom meal ingredient is a liquid (for hydration auto-logging) */
	function isLiquidIngredient(ing) {
		if (ing.source === 'bls' && ing.sourceId?.startsWith('N')) return true;
		return DRINK_PATTERNS.test(ing.name) || /^(wasser|water|trinkwasser)/i.test(ing.name);
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

	let waterEntries = $derived(entries.filter(e => e.mealType === 'water'));
	let beverageEntries = $derived(entries.filter(isBeverage));
	let waterMl = $derived(waterEntries.reduce((s, e) => s + e.amountGrams, 0));
	let beverageMl = $derived(beverageEntries.reduce((s, e) => s + e.amountGrams, 0));
	let mealLiquidMl = $derived(entries.reduce((s, e) => s + (e.liquidMl ?? 0), 0));
	let totalLiquidMl = $derived(waterMl + beverageMl + mealLiquidMl);
	let beverageCups = $derived(Math.round(beverageMl / WATER_CUP_ML));
	let waterCups = $derived(Math.round(waterMl / WATER_CUP_ML));
	let mealLiquidCups = $derived(Math.round(mealLiquidMl / WATER_CUP_ML));
	let totalCups = $derived(beverageCups + waterCups + mealLiquidCups);
	let goalCups = $derived(Math.round(waterGoalMl / WATER_CUP_ML));
	let displayCups = $derived(Math.max(goalCups, totalCups + 1));

	/** @type {Set<number>} cups currently animating fill/drain */
	let fillingCups = $state(new Set());
	let drainingCups = $state(new Set());
	let lastTotalCups = $state(-1);

	$effect(() => {
		const cur = totalCups;
		if (lastTotalCups === -1) {
			lastTotalCups = cur;
			return;
		}
		if (cur > lastTotalCups) {
			const s = new Set(fillingCups);
			for (let i = lastTotalCups; i < cur; i++) s.add(i);
			fillingCups = s;
			setTimeout(() => { fillingCups = new Set(); }, 1500);
		} else if (cur < lastTotalCups) {
			const s = new Set(drainingCups);
			for (let i = cur; i < lastTotalCups; i++) s.add(i);
			drainingCups = s;
			setTimeout(() => { drainingCups = new Set(); }, 700);
		}
		lastTotalCups = cur;
	});

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
				if (newEntries.length) entries = [...entries, ...newEntries];
			} else {
				const toRemove = waterEntries.slice(target);
				const ids = toRemove.map(e => e._id);
				await Promise.all(ids.map(id =>
					fetch(`/api/fitness/food-log/${id}`, { method: 'DELETE' })
				));
				entries = entries.filter(e => !ids.includes(e._id));
			}
		} catch {
			toast.error(isEn ? 'Failed to update water' : 'Fehler beim Aktualisieren');
		}
	}

	function entryCalories(e) {
		return (e.per100g?.calories ?? 0) * e.amountGrams / 100;
	}
	function entryNutrient(e, key) {
		return (e.per100g?.[key] ?? 0) * e.amountGrams / 100;
	}

	const microKeys = ['calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc',
		'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK', 'thiamin', 'riboflavin', 'niacin',
		'vitaminB6', 'vitaminB12', 'folate', 'cholesterol'];
	const aminoKeys = ['isoleucine', 'leucine', 'lysine', 'methionine', 'phenylalanine',
		'threonine', 'tryptophan', 'valine', 'histidine', 'alanine', 'arginine',
		'asparticAcid', 'cysteine', 'glutamicAcid', 'glycine', 'proline', 'serine', 'tyrosine'];

	const dayTotals = $derived.by(() => {
		let calories = 0, protein = 0, fat = 0, carbs = 0, fiber = 0, sugars = 0, saturatedFat = 0;
		const micros = {};
		const aminos = {};
		for (const k of microKeys) micros[k] = 0;
		for (const k of aminoKeys) aminos[k] = 0;

		for (const e of entries) {
			const r = e.amountGrams / 100;
			const p = e.per100g ?? {};
			calories += (p.calories ?? 0) * r;
			protein += (p.protein ?? 0) * r;
			fat += (p.fat ?? 0) * r;
			carbs += (p.carbs ?? 0) * r;
			fiber += (p.fiber ?? 0) * r;
			sugars += (p.sugars ?? 0) * r;
			saturatedFat += (p.saturatedFat ?? 0) * r;
			for (const k of microKeys) micros[k] += (p[k] ?? 0) * r;
			for (const k of aminoKeys) aminos[k] += (p[k] ?? 0) * r;
		}
		return { calories, protein, fat, carbs, fiber, sugars, saturatedFat, micros, aminos };
	});

	// Macro percentages by calorie contribution
	const macroPercent = $derived.by(() => {
		const proteinCal = dayTotals.protein * 4;
		const fatCal = dayTotals.fat * 9;
		const carbsCal = dayTotals.carbs * 4;
		const total = proteinCal + fatCal + carbsCal;
		if (total === 0) return { protein: 0, fat: 0, carbs: 0 };
		return {
			protein: Math.round(proteinCal / total * 100),
			fat: Math.round(fatCal / total * 100),
			carbs: 100 - Math.round(proteinCal / total * 100) - Math.round(fatCal / total * 100),
		};
	});

	// Protein goal in grams
	const proteinGoalGrams = $derived.by(() => {
		if (goalProteinTarget) {
			if (goalProteinMode === 'per_kg' && latestWeight) {
				return goalProteinTarget * latestWeight;
			}
			if (goalProteinMode === 'fixed') return goalProteinTarget;
		}
		// Fallback: derive from remaining calorie % (100 - fat% - carb%)
		if (goalCalories && goalFatPercent != null && goalCarbPercent != null) {
			const proteinPct = 100 - (goalFatPercent || 0) - (goalCarbPercent || 0);
			if (proteinPct > 0) return (goalCalories * proteinPct / 100) / 4;
		}
		return null;
	});

	// Fat/carb goals in grams (from calorie %)
	const fatGoalGrams = $derived(goalCalories && goalFatPercent ? (goalCalories * goalFatPercent / 100) / 9 : null);
	const carbGoalGrams = $derived(goalCalories && goalCarbPercent ? (goalCalories * goalCarbPercent / 100) / 4 : null);

	// --- Burned kcal ---
	// svelte-ignore state_referenced_locally
	let exerciseKcal = $state(Number(data.exerciseKcal) || 0);

	// BMR via Mifflin-St Jeor (doi:10.1093/ajcn/51.2.241)
	const birthYear = $derived(data.goal?.birthYear ?? null);
	const userAge = $derived(birthYear ? new Date().getFullYear() - birthYear : null);
	const hasBmrData = $derived(latestWeight != null && data.goal?.heightCm != null && birthYear != null);

	// NEAT-only multipliers (exercise tracked separately)
	const ACTIVITY_MULT = { sedentary: 1.2, light: 1.3, moderate: 1.4, very_active: 1.5 };

	const dailyBmr = $derived.by(() => {
		const w = Number(latestWeight) || 80;
		const h = Number(data.goal?.heightCm) || 175;
		const age = userAge ?? 30;
		if (goalSex === 'female') return 10 * w + 6.25 * h - 5 * age - 161;
		return 10 * w + 6.25 * h - 5 * age + 5;
	});

	const dailyTdee = $derived(dailyBmr * (ACTIVITY_MULT[activityLevel] ?? 1.3));

	// TDEE comparison bar (for goal editor)
	const editTdee = $derived(dailyBmr * (ACTIVITY_MULT[editActivityLevel] ?? 1.3));
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



	// Net calorie balance: goal + burned - eaten
	const calorieBalance = $derived(goalCalories ? (goalCalories + (exerciseKcal || 0) - dayTotals.calories) : 0);
	const calorieProgressRaw = $derived(goalCalories ? dayTotals.calories / (goalCalories + (exerciseKcal || 0)) * 100 : 0);
	const calorieProgress = $derived(Math.min(calorieProgressRaw, 100));
	const calorieOverflow = $derived(Math.max(calorieProgressRaw - 100, 0));

	// DRI for micros
	const dri = $derived(getDRI(goalSex));

	// SVG ring constants (same as NutritionSummary)
	const RADIUS = 28;
	const ARC_DEGREES = 300;
	const ARC_LENGTH = (ARC_DEGREES / 360) * 2 * Math.PI * RADIUS;
	const ARC_ROTATE = 120;

	function strokeOffset(percent) {
		return ARC_LENGTH - (Math.min(percent, 100) / 100) * ARC_LENGTH;
	}

	/** Stroke offset for overflow arc drawn from the end backwards */
	function overflowOffset(overflowPct) {
		return ARC_LENGTH - (Math.min(overflowPct, 100) / 100) * ARC_LENGTH;
	}

	// --- Inline add food ---
	let addingMeal = $state(null);
	let inlineTab = $state('search'); // 'search' | 'favorites' | 'meals'

	// --- FAB modal (route-based via ?add param) ---
	const showFabModal = $derived($page.url.searchParams.has('add'));
	let fabMealType = $state('lunch');

	const fabHref = $derived(`/fitness/${s.nutrition}?add`);

	function defaultMealType() {
		const h = new Date().getHours();
		if (h >= 5 && h < 10) return 'breakfast';
		if (h >= 10 && h < 15) return 'lunch';
		if (h >= 15 && h < 17) return 'snack';
		return 'dinner';
	}

	// Reset modal state when it opens
	$effect(() => {
		if (showFabModal) {
			fabMealType = defaultMealType();
			fabTab = 'search';
			loadCustomMeals();
		}
	});

	function closeFabModal() {
		selectedCmMeal = null;
		goto(`/fitness/${s.nutrition}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	async function fabLogFood(food) {
		try {
			const res = await fetch('/api/fitness/food-log', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					date: currentDate,
					mealType: fabMealType,
					name: food.name,
					source: food.source,
					sourceId: food.sourceId,
					amountGrams: food.amountGrams,
					per100g: food.per100g,
				})
			});
			if (res.ok) {
				const entry = await res.json();
				entries = [...entries, entry];
				closeFabModal();
			}
		} catch {
			toast.error(isEn ? 'Failed to log food' : 'Fehler beim Eintragen');
		}
	}

	// --- Custom meals in FAB ---
	let fabTab = $state('search'); // 'search' | 'favorites' | 'meals'

	// --- Favorites tab ---
	let favTabItems = $state([]); // enriched with per100g
	let favTabLoaded = $state(false);

	async function loadFavTab(force = false) {
		if (favTabLoaded && !force) return;
		const favs = quickFavorites;
		// Fetch per100g for each favorite in parallel
		const enriched = await Promise.all(favs.map(async (fav) => {
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
		favTabItems = enriched.filter(Boolean);
		favTabLoaded = true;
	}
	let customMeals = $state([]);
	let customMealsLoaded = $state(false);

	// Custom meal filter
	let cmFilter = $state('');
	const filteredCustomMeals = $derived(
		cmFilter
			? customMeals.filter(cm => cm.name.toLowerCase().includes(cmFilter.toLowerCase()))
			: customMeals
	);

	// Custom meal detail screen (replaces meal list when a meal is selected)
	let selectedCmMeal = $state(null);
	let cmAmountMode = $state('multiplier'); // 'multiplier' | 'grams'
	let cmAmountVal = $state(1.0);

	function selectCmMeal(meal) {
		selectedCmMeal = meal;
		cmAmountMode = 'multiplier';
		cmAmountVal = 1.0;
	}

	function deselectCmMeal() {
		selectedCmMeal = null;
	}

	function cmResolvedGrams(meal) {
		const base = mealTotalGrams(meal);
		if (cmAmountMode === 'grams') return cmAmountVal;
		return base * cmAmountVal;
	}

	/** Preview macros scaled to the selected amount */
	function cmPreview(meal) {
		const { per100g, totalGrams } = aggregateMealPer100g(meal);
		const grams = cmResolvedGrams(meal);
		const s = grams / 100;
		return {
			calories: Math.round(per100g.calories * s),
			protein: per100g.protein * s,
			fat: per100g.fat * s,
			carbs: per100g.carbs * s,
			fiber: per100g.fiber * s,
			sugars: per100g.sugars * s,
			saturatedFat: per100g.saturatedFat * s,
			grams,
			totalGrams,
		};
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

	const NUTRIENT_KEYS = ['calories', 'protein', 'fat', 'saturatedFat', 'carbs', 'fiber', 'sugars',
		'calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc',
		'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK',
		'thiamin', 'riboflavin', 'niacin', 'vitaminB6', 'vitaminB12', 'folate', 'cholesterol',
		'isoleucine', 'leucine', 'lysine', 'methionine', 'phenylalanine', 'threonine',
		'tryptophan', 'valine', 'histidine', 'alanine', 'arginine', 'asparticAcid',
		'cysteine', 'glutamicAcid', 'glycine', 'proline', 'serine', 'tyrosine'];

	function mealTotalGrams(meal) {
		return meal.ingredients.reduce((sum, ing) => sum + ing.amountGrams, 0);
	}

	function mealTotalCal(meal) {
		return meal.ingredients.reduce((sum, ing) => sum + (ing.per100g?.calories ?? 0) * ing.amountGrams / 100, 0);
	}

	function aggregateMealPer100g(meal) {
		const totals = {};
		for (const k of NUTRIENT_KEYS) totals[k] = 0;
		let totalGrams = 0;
		for (const ing of meal.ingredients) {
			const r = ing.amountGrams / 100;
			totalGrams += ing.amountGrams;
			for (const k of NUTRIENT_KEYS) totals[k] += (ing.per100g?.[k] ?? 0) * r;
		}
		const per100g = {};
		const scale = totalGrams > 0 ? 100 / totalGrams : 0;
		for (const k of NUTRIENT_KEYS) per100g[k] = totals[k] * scale;
		const liquidMl = meal.ingredients
			.filter(isLiquidIngredient)
			.reduce((sum, ing) => sum + ing.amountGrams, 0);
		return { per100g, totalGrams, liquidMl };
	}

	async function logCustomMeal(meal, amountGrams = null) {
		try {
			const { per100g, totalGrams, liquidMl } = aggregateMealPer100g(meal);
			const logGrams = amountGrams ?? totalGrams;
			const liquidScale = totalGrams > 0 ? logGrams / totalGrams : 0;

			await fetch('/api/fitness/food-log', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					date: currentDate,
					mealType: fabMealType,
					name: meal.name,
					source: 'custom',
					sourceId: meal._id,
					amountGrams: logGrams,
					per100g,
					...(liquidMl > 0 && { liquidMl: liquidMl * liquidScale }),
				})
			});

			await goto(`/fitness/${s.nutrition}?date=${currentDate}`, { replaceState: true, noScroll: true });
			selectedCmMeal = null;
			closeFabModal();
			toast.success(isEn ? `Logged "${meal.name}"` : `"${meal.name}" eingetragen`);
		} catch {
			toast.error(isEn ? 'Failed to log meal' : 'Fehler beim Eintragen');
		}
	}

	function startAdd(meal) {
		addingMeal = meal;
		inlineTab = 'search';
		selectedCmMeal = null;
		cmFilter = '';
		loadCustomMeals();
	}

	function cancelAdd() {
		addingMeal = null;
		selectedCmMeal = null;
		cmFilter = '';
	}

	async function inlineLogCustomMeal(meal, amountGrams = null) {
		if (!addingMeal) return;
		try {
			const { per100g, totalGrams, liquidMl } = aggregateMealPer100g(meal);
			const logGrams = amountGrams ?? totalGrams;
			const liquidScale = totalGrams > 0 ? logGrams / totalGrams : 0;

			await fetch('/api/fitness/food-log', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					date: currentDate,
					mealType: addingMeal,
					name: meal.name,
					source: 'custom',
					sourceId: meal._id,
					amountGrams: logGrams,
					per100g,
					...(liquidMl > 0 && { liquidMl: liquidMl * liquidScale }),
				})
			});

			await goto(`/fitness/${s.nutrition}?date=${currentDate}`, { replaceState: true, noScroll: true });
			selectedCmMeal = null;
			cancelAdd();
			toast.success(isEn ? `Logged "${meal.name}"` : `"${meal.name}" eingetragen`);
		} catch {
			toast.error(isEn ? 'Failed to log meal' : 'Fehler beim Eintragen');
		}
	}

	async function inlineLogFood(food) {
		try {
			const res = await fetch('/api/fitness/food-log', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					date: currentDate,
					mealType: addingMeal,
					name: food.name,
					source: food.source,
					sourceId: food.sourceId,
					amountGrams: food.amountGrams,
					per100g: food.per100g,
				})
			});
			if (res.ok) {
				const entry = await res.json();
				entries = [...entries, entry];
				cancelAdd();
			}
		} catch {
			toast.error(isEn ? 'Failed to log food' : 'Fehler beim Eintragen');
		}
	}

	/** @type {string|null} */
	let editingEntryId = $state(null);
	let editingGrams = $state(0);

	function startEditEntry(entry) {
		editingEntryId = entry._id;
		editingGrams = entry.amountGrams;
	}

	async function saveEditEntry() {
		if (!editingEntryId || editingGrams <= 0) return;
		try {
			const res = await fetch(`/api/fitness/food-log/${editingEntryId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amountGrams: editingGrams }),
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

	async function deleteEntry(id) {
		if (!await confirm(t('delete_entry_confirm', lang))) return;
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

	// WHO essential amino acid requirements (mg/kg/day for adults)
	const AMINO_DRI_PER_KG = {
		histidine: 10, isoleucine: 20, leucine: 39, lysine: 30,
		methionine: 15, phenylalanine: 25, threonine: 15, tryptophan: 4, valine: 26
	};

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

	const microSections = $derived.by(() => {
		const minerals = ['calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc'];
		const vitamins = ['vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK', 'thiamin', 'riboflavin', 'niacin', 'vitaminB6', 'vitaminB12', 'folate'];
		const other = ['cholesterol'];

		function mkRows(keys) {
			return keys.map(k => {
				const meta = NUTRIENT_META[k];
				const value = dayTotals.micros[k] ?? 0;
				const goal = dri[k] ?? 0;
				const pct = goal > 0 ? Math.round(value / goal * 100) : 0;
				return { key: k, label: isEn ? meta.label : meta.labelDe, unit: meta.unit, value, goal, pct, isMax: meta.isMax };
			});
		}

		// Amino acids: essential first (with DRI), then non-essential
		const essentialOrder = ['leucine', 'isoleucine', 'valine', 'lysine', 'methionine', 'phenylalanine', 'threonine', 'tryptophan', 'histidine'];
		const nonEssentialOrder = ['alanine', 'arginine', 'asparticAcid', 'cysteine', 'glutamicAcid', 'glycine', 'proline', 'serine', 'tyrosine'];
		const w = latestWeight ?? 70;
		const aminoRows = [...essentialOrder, ...nonEssentialOrder].map(k => {
			const value = dayTotals.aminos[k] ?? 0;
			// WHO DRI is mg/kg/day; value is in grams → convert goal to grams
			const driPerKg = AMINO_DRI_PER_KG[k];
			const goal = driPerKg ? (driPerKg * w) / 1000 : 0;
			const pct = goal > 0 ? Math.round(value / goal * 100) : 0;
			const meta = AMINO_META[k];
			return { key: k, label: isEn ? meta.en : meta.de, unit: 'g', value, goal, pct, isMax: false };
		});

		return [
			{ title: isEn ? 'Minerals' : 'Mineralstoffe', rows: mkRows(minerals) },
			{ title: isEn ? 'Vitamins' : 'Vitamine', rows: mkRows(vitamins) },
			{ title: isEn ? 'Amino Acids' : 'Aminosäuren', rows: aminoRows },
			{ title: isEn ? 'Other' : 'Sonstiges', rows: mkRows(other) },
		];
	});

	function fmt(v) {
		if (v >= 100) return Math.round(v).toString();
		if (v >= 10) return v.toFixed(1);
		return v.toFixed(1);
	}

	function fmtCal(v) {
		return Math.round(v).toString();
	}

	const mealMeta = {
		breakfast: { icon: Coffee, color: 'var(--nord13)' },
		lunch:     { icon: Sun, color: 'var(--nord12)' },
		dinner:    { icon: Moon, color: 'var(--nord15)' },
		snack:     { icon: Cookie, color: 'var(--nord14)' },
	};

	// --- Quick-log sidebar ---
	let quickLogMealType = $state(defaultMealType());
	// svelte-ignore state_referenced_locally
	let quickFavorites = $state(data.favorites ?? []);
	// svelte-ignore state_referenced_locally
	let recentFoods = $state(data.recentFoods ?? []);

	$effect(() => {
		quickFavorites = data.favorites ?? [];
		recentFoods = data.recentFoods ?? [];
	});

	/** @type {{ name: string, source: string, sourceId: string, per100g?: any, amountGrams?: number } | null} */
	let qlSelected = $state(null);
	let qlGrams = $state(100);
	let qlLoading = $state(false);

	async function qlSelect(item) {
		if (qlSelected && qlSelected.source === item.source && qlSelected.sourceId === item.sourceId) {
			qlSelected = null;
			return;
		}
		qlGrams = item.amountGrams ?? 100;
		if (item.per100g) {
			qlSelected = item;
		} else {
			// Favorites don't have per100g — fetch by exact source+id
			qlLoading = true;
			try {
				const res = await fetch(`/api/nutrition/lookup?source=${item.source}&id=${encodeURIComponent(item.sourceId)}`);
				if (res.ok) {
					const data = await res.json();
					if (data.per100g) {
						qlSelected = { ...item, per100g: data.per100g };
					} else {
						toast.error(isEn ? 'Could not load food data' : 'Lebensmitteldaten nicht gefunden');
					}
				}
			} catch {
				toast.error(isEn ? 'Failed to load food data' : 'Fehler beim Laden');
			}
			qlLoading = false;
		}
	}

	async function qlConfirm() {
		if (!qlSelected?.per100g) return;
		try {
			const res = await fetch('/api/fitness/food-log', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					date: currentDate,
					mealType: quickLogMealType,
					name: qlSelected.name,
					source: qlSelected.source,
					sourceId: qlSelected.sourceId,
					amountGrams: qlGrams,
					per100g: qlSelected.per100g,
				})
			});
			if (res.ok) {
				const entry = await res.json();
				entries = [...entries, entry];
				toast.success(isEn ? `Logged "${qlSelected.name}"` : `"${qlSelected.name}" eingetragen`);
				qlSelected = null;
			}
		} catch {
			toast.error(isEn ? 'Failed to log food' : 'Fehler beim Eintragen');
		}
	}
</script>

<svelte:head>
	<title>{t('nutrition_title', lang)} — Fitness</title>
</svelte:head>

{#snippet cmDetailScreen(meal, logFn)}
	{@const preview = cmPreview(meal)}
	<div class="cm-detail">
		<div class="cm-detail-header">
			<span class="cm-detail-name">{meal.name}</span>
			<span class="cm-detail-sub">{meal.ingredients.length} {t('ingredients', lang)} · {Math.round(preview.totalGrams)}g {isEn ? 'base' : 'Basis'}</span>
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
			<button class="cm-detail-btn-cancel" onclick={deselectCmMeal}>{t('cancel', lang)}</button>
			<button class="cm-detail-btn-confirm" onclick={() => logFn(meal, cmResolvedGrams(meal))}>{t('log_meal', lang)}</button>
		</div>
	</div>
{/snippet}

{#snippet favoritesTab(logFn)}
	<div class="fav-tab-list">
		{#if !favTabLoaded}
			<p class="meals-empty">{t('loading', lang)}</p>
		{:else if favTabItems.length === 0}
			<p class="meals-empty">{isEn ? 'No favorites yet. Tap the heart on foods to add them here.' : 'Noch keine Favoriten. Tippe auf das Herz bei Lebensmitteln.'}</p>
		{:else}
			<FoodSearch onselect={logFn} showDetailLinks={false} showFavorites={false} initialResults={favTabItems} />
		{/if}
	</div>
{/snippet}

{#snippet customMealsTab(logFn)}
	{#if selectedCmMeal}
		{@render cmDetailScreen(selectedCmMeal, logFn)}
	{:else}
		<div class="custom-meals-list">
			{#if customMeals.length > 3}
				<input type="text" class="cm-filter-input" placeholder={isEn ? 'Filter meals…' : 'Mahlzeiten filtern…'}
					bind:value={cmFilter} />
			{/if}
			{#if customMeals.length === 0}
				<p class="meals-empty">{t('no_custom_meals', lang)}</p>
			{/if}
			{#each filteredCustomMeals as cm}
				<div class="custom-meal-card" role="button" tabindex="0" onclick={() => selectCmMeal(cm)} onkeydown={e => e.key === 'Enter' && selectCmMeal(cm)}>
					<div class="custom-meal-info">
						<span class="custom-meal-name">{cm.name}</span>
						<span class="custom-meal-detail">{cm.ingredients.length} {t('ingredients', lang)} · {fmtCal(mealTotalCal(cm))} kcal · {Math.round(mealTotalGrams(cm))}g</span>
					</div>
				</div>
			{/each}
			<a class="manage-meals-link" href="/fitness/{s.nutrition}/meals">
				<Settings size={13} />
				{isEn ? 'Manage meals' : 'Mahlzeiten verwalten'}
			</a>
		</div>
	{/if}
{/snippet}

{#snippet microPanel()}
	<div class="micro-details" class:micro-hidden={!showMicros}>
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
{/snippet}

<div class="nutrition-page">
	<!-- Date Navigator -->
	<div class="date-nav">
		<button class="date-btn" onclick={() => navigateDate(-1)} aria-label="Previous day">
			<ChevronLeft size={20} />
		</button>
		<button class="date-display" onclick={goToday} class:is-today={isToday}>
			{displayDate}
			{#if isToday}<span class="today-badge">{t('today', lang)}</span>{/if}
		</button>
		<button class="date-btn" onclick={() => navigateDate(1)} aria-label="Next day">
			<ChevronRight size={20} />
		</button>
		{#if !isToday}
			<button class="go-today-btn" onclick={goToday}>{t('today', lang)}</button>
		{/if}
	</div>

	<div class="sidebar-col">
	<!-- Daily Summary -->
	{#if goalCalories}
		<div class="daily-summary">
			<!-- Eaten / Ring / Burned row -->
			<div class="calorie-trio">
				<div class="cal-stat eaten">
					<span class="cal-stat-value">{fmtCal(dayTotals.calories)}</span>
					<span class="cal-stat-label">{isEn ? 'EATEN' : 'GEGESSEN'}</span>
				</div>

				<div class="calorie-ring-wrap">
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
				</div>

				<div class="cal-stat burned">
					<span class="cal-stat-value">{fmtCal(exerciseKcal)}</span>
					<span class="cal-stat-label">{isEn ? 'BURNED' : 'VERBRANNT'}</span>
					<span class="burned-bmr tdee-info-wrap">
						+{fmtCal(tdeeSoFar)} TDEE<button class="tdee-info-trigger" onclick={() => showTdeeInfo = !showTdeeInfo} aria-label="TDEE info"><Info size={10} /></button>
						{#if showTdeeInfo}
							<div class="tdee-info-tooltip">
								<span class="cite-note" style="margin-bottom: 0.2rem">{isEn ? 'TDEE = Total Daily Energy Expenditure — calories your body burns per day at rest + daily activity.' : 'TDEE = Gesamtenergieumsatz — Kalorien, die dein Körper pro Tag in Ruhe + Alltagsaktivität verbrennt.'}</span>
								{#if latestWeight}
									<span class="cite-note" style="margin-bottom: 0.2rem">{isEn ? `Based on your latest logged weight (${latestWeight} kg).` : `Basierend auf deinem letzten Gewicht (${latestWeight} kg).`}</span>
								{/if}
								<span class="cite-line"><strong>BMR:</strong> <a href="https://doi.org/10.1093/ajcn/51.2.241" target="_blank" rel="noopener">Mifflin-St Jeor (1990)</a></span>
								<span class="cite-line"><strong>NEAT:</strong> <a href="https://doi.org/10.1093/ajcn/75.5.914" target="_blank" rel="noopener">Levine (2002)</a></span>
								<span class="cite-note">{isEn ? 'Multipliers reduced vs. standard Harris-Benedict factors — logged exercise kcal added separately.' : 'Multiplikatoren reduziert ggü. Harris-Benedict — geloggte Trainings-kcal werden separat addiert.'}</span>
							</div>
						{/if}
					</span>
					{#if !hasBmrData}
						<div class="bmr-hint">{isEn ? 'Set profile in' : 'Profil unter'} <a href="/fitness/{s.measure}">{t('measure_title', lang)}</a></div>
					{/if}
				</div>
			</div>

			<!-- Macro progress bars -->
			<div class="macro-bars">
				{#each [
					{ value: dayTotals.protein, goal: proteinGoalGrams, label: t('protein', lang), color: 'var(--nord14)' },
					{ value: dayTotals.fat, goal: fatGoalGrams, label: t('fat', lang), color: 'var(--nord12)' },
					{ value: dayTotals.carbs, goal: carbGoalGrams, label: t('carbs', lang), color: 'var(--nord9)' },
				] as macro}
					{@const pct = macro.goal ? macro.value / macro.goal * 100 : 0}
					{@const over = pct > 100}
					{@const overPct = Math.min(pct - 100, 100)}
					{@const remaining = macro.goal ? macro.goal - macro.value : 0}
					<div class="macro-bar-item">
						<span class="macro-bar-label">{macro.label}</span>
						<div class="macro-bar-track">
							<div class="macro-bar-fill" style="width: {Math.min(pct, 100)}%; background: {macro.color}"></div>
							{#if over}
								<div class="macro-bar-overflow" style="width: {overPct}%"></div>
							{/if}
						</div>
						{#if macro.goal}
							<span class="macro-bar-info" class:over>
								{remaining >= 0 ? `${fmt(remaining)}g ${t('remaining', lang)}` : `${fmt(-remaining)}g ${t('over', lang)}`}
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
						{t('micro_details', lang)}
					</button>
				</div>
				{@render microPanel()}
			</div>

		</div>
	{:else}
		<div class="no-goal">
			<div class="no-goal-icon"><Utensils size={32} /></div>
			<p>{t('set_goal_prompt', lang)}</p>
			<button class="btn-primary" onclick={openGoalEditor}>{t('set_goal', lang)}</button>
		</div>
	{/if}

	<!-- Goal editor toggle -->
	{#if goalCalories && !showGoalEditor}
		<button class="goal-edit-btn" onclick={openGoalEditor}>
			<Settings size={14} />
			{t('daily_goal', lang)}
		</button>
	{/if}

	<!-- Goal Editor (Stepped Wizard) -->
	{#if showGoalEditor}
		<div class="goal-editor">
			<h3>{t('daily_goal', lang)}</h3>

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
									: 'Dein TDEE (Gesamtenergieumsatz) sind die Kalorien, die du pro Tag verbrauchst. Gewicht, Größe und Geburtsjahr einstellen unter'}
									<a href="/fitness/{s.measure}">{t('measure_title', lang)}</a>
								</span>
							</div>
						</div>
					{/if}

					<div class="goal-field">
						<label for="goal-calories">{t('calorie_target', lang)}</label>
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
							<option value="moderate">{isEn ? 'Moderately active — on feet' : 'Mäßig aktiv — auf den Beinen'} (×1.4)</option>
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
									fill="none" stroke="var(--nord12)" stroke-width="10"
									stroke-dasharray="{Math.max(0, editMacroRing.fatLen - RING_GAP)} {RING_C - Math.max(0, editMacroRing.fatLen - RING_GAP)}"
									stroke-linecap="round"
									transform="rotate(-90 60 60)"
									opacity={editMacroRing.fat > 0 ? 1 : 0} />
								<!-- Carbs -->
								<circle cx="60" cy="60" r={RING_R}
									fill="none" stroke="var(--nord9)" stroke-width="10"
									stroke-dasharray="{Math.max(0, editMacroRing.carbLen - RING_GAP)} {RING_C - Math.max(0, editMacroRing.carbLen - RING_GAP)}"
									stroke-linecap="round"
									transform="rotate({-90 + editMacroRing.fatDeg} 60 60)"
									opacity={editMacroRing.carb > 0 ? 1 : 0} />
								<!-- Protein -->
								<circle cx="60" cy="60" r={RING_R}
									fill="none" stroke="var(--nord14)" stroke-width="10"
									stroke-dasharray="{Math.max(0, editMacroRing.protLen - RING_GAP)} {RING_C - Math.max(0, editMacroRing.protLen - RING_GAP)}"
									stroke-linecap="round"
									transform="rotate({-90 + editMacroRing.fatDeg + editMacroRing.carbDeg} 60 60)"
									opacity={editMacroRing.prot > 0 ? 1 : 0} />
								<text x="60" y="55" text-anchor="middle" class="ring-cal-main">{editCalNum}</text>
								<text x="60" y="70" text-anchor="middle" class="ring-cal-sub">kcal</text>
							</svg>
							<div class="macro-ring-legend">
								<span class="mrl-item"><span class="mrl-dot" style="background: var(--nord14)"></span> {t('protein', lang)} {editMacroRing.prot}%</span>
								<span class="mrl-item"><span class="mrl-dot" style="background: var(--nord12)"></span> {t('fat', lang)} {editMacroRing.fat}%</span>
								<span class="mrl-item"><span class="mrl-dot" style="background: var(--nord9)"></span> {t('carbs', lang)} {editMacroRing.carb}%</span>
							</div>
						</div>
					{/if}

					<div class="goal-field">
						<label for="goal-protein-mode">{t('protein_goal', lang)}</label>
						<div class="protein-mode">
							<select id="goal-protein-mode" bind:value={editProteinMode}>
								<option value="fixed">{t('protein_fixed', lang)}</option>
								<option value="per_kg">{t('protein_per_kg', lang)}</option>
							</select>
							<input id="goal-protein-target" type="number" bind:value={editProteinTarget} min="0" step="0.1"
								placeholder={editProteinMode === 'per_kg' ? 'g/kg' : 'g'} />
						</div>
					</div>
					<div class="goal-row">
						<div class="goal-field">
							<label for="goal-fat">{t('fat_percent', lang)}</label>
							<input id="goal-fat" type="number" bind:value={editFatPercent} min="0" max="100" />
						</div>
						<div class="goal-field">
							<label for="goal-carbs">{t('carb_percent', lang)}</label>
							<input id="goal-carbs" type="number" bind:value={editCarbPercent} min="0" max="100" />
						</div>
					</div>

					<div class="wizard-nav">
						<button class="btn-secondary" type="button" onclick={() => goalStep = 2}>← {isEn ? 'Back' : 'Zurück'}</button>
						<div class="goal-actions-final">
							<button class="btn-secondary" onclick={() => showGoalEditor = false}>{t('cancel', lang)}</button>
							<button class="btn-primary" onclick={saveGoals} disabled={goalSaving}>
								{goalSaving ? t('saving', lang) : t('save', lang)}
							</button>
						</div>
					</div>
				</div>
			{/if}
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
			</div>
		</div>
		<div class="water-cups">
			{#each Array(displayCups) as _, i}
				{@const isBev = i < beverageCups}
				{@const isMealLiquid = !isBev && i < beverageCups + mealLiquidCups}
				{@const isAuto = isBev || isMealLiquid}
				{@const isFilled = i < totalCups}
				{@const showWater = isFilled || drainingCups.has(i)}
				{@const isNextEmpty = i === totalCups && !drainingCups.has(i)}
				<button
					class="water-cup"
					class:filled={isFilled}
					class:beverage={isBev}
					class:meal-liquid={isMealLiquid}
					class:filling={fillingCups.has(i)}
					class:draining={drainingCups.has(i)}
					class:next-empty={isNextEmpty}
					disabled={isAuto}
					onclick={() => {
						if (isAuto) return;
						const autoOffset = beverageCups + mealLiquidCups;
						const waterTarget = i < totalCups ? i - autoOffset : i - autoOffset + 1;
						setWaterCups(Math.max(0, waterTarget));
					}}
					title="{isAuto ? (isEn ? (isBev ? 'Beverage' : 'From meal') : (isBev ? 'Getränk' : 'Aus Mahlzeit')) : (i + 1) * WATER_CUP_ML + ' ml'}"
				>
					<svg viewBox="0 0 24 32" class="cup-svg" overflow="hidden">
						<defs>
							<clipPath id="cup-clip-{i}">
								<path d="M4 4 L6 28 C6 30 8 30 8 30 L16 30 C16 30 18 30 18 28 L20 4 Z" />
							</clipPath>
						</defs>
						<path d="M4 4 L6 28 C6 30 8 30 8 30 L16 30 C16 30 18 30 18 28 L20 4 Z" fill="var(--color-bg-tertiary)" stroke="var(--color-border)" stroke-width="1.2" />
						{#if showWater}
							<g clip-path="url(#cup-clip-{i})" class="water-body">
								<path class="water-wave w1" d="M-8 10 Q-2 6 4 10 T16 10 T28 10 T40 10 V34 H-8 Z" fill={isAuto ? 'var(--nord7)' : 'var(--nord10)'} opacity="0.85" />
								<path class="water-wave w2" d="M-4 12 Q2 8 8 12 T20 12 T32 12 V34 H-4 Z" fill={isAuto ? 'var(--nord8)' : 'var(--nord9)'} opacity="0.5" />
								<path class="water-wave w3" d="M0 11 Q6 7 12 11 T24 11 T36 11 V34 H0 Z" fill={isAuto ? 'var(--nord7)' : 'var(--nord10)'} opacity="0.35" />
							</g>
						{/if}
						{#if isNextEmpty}
							<text x="12" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="var(--color-text-secondary)">+</text>
						{/if}
					</svg>
				</button>
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
						<span class="beverage-ml">{Math.round(e.liquidMl)} ml</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if goalCalories}
		<!-- Micros card (desktop) -->
		<div class="micro-card">
			<h3 class="micro-card-title">{t('micro_details', lang)}</h3>
			{@render microPanel()}
		</div>
	{/if}

	</div>

	<!-- Meal Sections -->
	<div class="meals-col">
	{#each mealTypes as meal, mi}
		{@const mealEntries = grouped[meal]}
		{@const mealCal = mealEntries.reduce((s, e) => s + entryCalories(e), 0)}
		{@const meta = mealMeta[meal]}
		{@const MealSectionIcon = meta.icon}
		<div class="meal-section" style="--meal-color: {meta.color}">
			<div class="meal-header">
				<div class="meal-title">
					<div class="meal-icon">
						<MealSectionIcon size={15} />
					</div>
					<h3>{t(meal, lang)}</h3>
				</div>
				{#if mealEntries.length > 0}
					<span class="meal-cal">{fmtCal(mealCal)} {t('kcal', lang)}</span>
				{/if}
			</div>

			<div class="meal-entries">
				{#each mealEntries as entry}
					{@const imgUrl = entry.source === 'recipe' && entry.sourceId ? recipeImages[entry.sourceId] : null}
					<div class="food-card" class:has-image={!!imgUrl}>
						{#if imgUrl}
							<img class="food-card-img" src={imgUrl} alt={entry.name} loading="lazy" />
						{:else}
							<div class="food-card-accent" style="background: var(--meal-color)"></div>
						{/if}
						<div class="food-card-body">
						{#if entry.source === 'bls' || entry.source === 'usda'}
							<a class="food-card-name food-card-link" href="/fitness/{s.nutrition}/food/{entry.source}/{entry.sourceId}">{entry.name}</a>
						{:else}
							<span class="food-card-name">{entry.name}</span>
						{/if}
							{#if editingEntryId === entry._id}
								<form class="food-card-edit-form" onsubmit={e => { e.preventDefault(); saveEditEntry(); }}>
									<input type="number" class="food-card-edit-input" bind:value={editingGrams} min="1" step="1" />
									<span class="food-card-edit-unit">g</span>
								</form>
							{:else}
								<span class="food-card-detail">{entry.amountGrams}g · {fmtCal(entryCalories(entry))} kcal</span>
							{/if}
							<span class="food-card-macros">{fmt(entryNutrient(entry, 'protein'))}g P · {fmt(entryNutrient(entry, 'fat'))}g F · {fmt(entryNutrient(entry, 'carbs'))}g C</span>
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
							<button class="food-card-action delete" onclick={() => deleteEntry(entry._id)} aria-label={t('delete_', lang)}>
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
								{t('search_food', lang).replace('…', '')}
							</button>
							<button class="fab-tab" class:active={inlineTab === 'favorites'} onclick={() => { inlineTab = 'favorites'; loadFavTab(); }}>
								<Heart size={13} />
								{isEn ? 'Favorites' : 'Favoriten'}
							</button>
							<button class="fab-tab" class:active={inlineTab === 'meals'} onclick={() => { inlineTab = 'meals'; loadCustomMeals(); }}>
								<UtensilsCrossed size={13} />
								{t('custom_meals', lang)}
							</button>
						</div>
						<button class="fab-close" onclick={cancelAdd}><Plus size={18} style="transform: rotate(45deg)" /></button>
					</div>

					{#if inlineTab === 'search'}
						<FoodSearch onselect={inlineLogFood} showDetailLinks={false} showFavorites={false} autofocus={true} />
					{:else if inlineTab === 'favorites'}
						{@render favoritesTab(inlineLogFood)}
					{:else}
						{@render customMealsTab(inlineLogCustomMeal)}
					{/if}
				</div>
			{:else}
				<button class="add-food-btn" onclick={() => startAdd(meal)}>
					<Plus size={14} />
					{t('add_food', lang)}
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
				{#each mealTypes as meal}
					{@const meta = mealMeta[meal]}
					{@const MealIcon = meta.icon}
					<button
						class="ql-meal-btn"
						class:active={quickLogMealType === meal}
						style="--mc: {meta.color}"
						onclick={() => quickLogMealType = meal}
						title={t(meal, lang)}
					>
						<MealIcon size={14} />
					</button>
				{/each}
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
							<form class="ql-amount-row" onsubmit={e => { e.preventDefault(); qlConfirm(); }}>
								<input type="number" class="ql-amount-input" bind:value={qlGrams} min="1" step="1" />
								<span class="ql-amount-unit">g</span>
								<button type="submit" class="ql-amount-confirm"><Check size={14} /></button>
							</form>
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
							<form class="ql-amount-row" onsubmit={e => { e.preventDefault(); qlConfirm(); }}>
								<input type="number" class="ql-amount-input" bind:value={qlGrams} min="1" step="1" />
								<span class="ql-amount-unit">g</span>
								<button type="submit" class="ql-amount-confirm"><Check size={14} /></button>
							</form>
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

<!-- FAB -->
<AddButton href={fabHref} />

<!-- FAB Modal -->
{#if showFabModal}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fab-overlay" onclick={closeFabModal} onkeydown={(e) => e.key === 'Escape' && closeFabModal()}>
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
		<div class="fab-modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
			<div class="fab-modal-header">
				<h3>{t('add_food', lang)}</h3>
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
						<span>{t(meal, lang)}</span>
					</button>
				{/each}
			</div>

			<!-- Tabs: Search / Favorites / Custom Meals -->
			<div class="fab-tabs">
				<button class="fab-tab" class:active={fabTab === 'search'} onclick={() => fabTab = 'search'}>
					<Search size={13} />
					{t('search_food', lang).replace('…', '')}
				</button>
				<button class="fab-tab" class:active={fabTab === 'favorites'} onclick={() => { fabTab = 'favorites'; loadFavTab(); }}>
					<Heart size={13} />
					{isEn ? 'Favorites' : 'Favoriten'}
				</button>
				<button class="fab-tab" class:active={fabTab === 'meals'} onclick={() => { fabTab = 'meals'; loadCustomMeals(); }}>
					<UtensilsCrossed size={13} />
					{t('custom_meals', lang)}
				</button>
			</div>

			{#if fabTab === 'search'}
				<FoodSearch onselect={fabLogFood} showFavorites={false} autofocus={true} />
			{:else if fabTab === 'favorites'}
				{@render favoritesTab(fabLogFood)}
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
	@media (min-width: 1024px) {
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
		cursor: pointer;
		padding: 0.35rem 0.75rem;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: background 0.15s;
		letter-spacing: -0.01em;
	}
	.date-display:hover {
		background: var(--color-bg-elevated);
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
	.burned-bmr {
		margin-top: 0.1rem;
		font-size: 0.6rem;
		color: var(--color-text-tertiary);
	}
	.tdee-info-wrap {
		position: relative;
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
		white-space: nowrap;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		z-index: 20;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.tdee-info-tooltip a {
		color: var(--nord12);
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
		color: var(--nord12);
		text-decoration: underline;
	}
	.calorie-ring-wrap {
		flex-shrink: 0;
	}
	.calorie-ring {
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
	.macro-bar-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}
	.macro-bar-label {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}
	.macro-bar-track {
		width: 100%;
		height: 6px;
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
		background: var(--nord11);
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
		color: var(--nord11);
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
		stroke: var(--nord11);
		filter: drop-shadow(0 0 4px color-mix(in srgb, var(--nord11) 25%, transparent));
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
	/* Macro rings (custom meal detail + food detail) */
	.ring-text {
		font-size: 14px;
		font-weight: 700;
		fill: currentColor;
		text-anchor: middle;
		dominant-baseline: central;
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
	.micro-row {
		display: grid;
		grid-template-columns: 7rem 1fr 4rem 2.5rem;
		align-items: center;
		gap: 0.4rem;
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
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
	}
	.micro-pct {
		text-align: right;
		font-weight: 700;
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
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
		color: var(--nord15);
		background: color-mix(in srgb, var(--nord15) 12%, transparent);
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
		background: var(--nord10);
		color: white;
		border-color: var(--nord10);
	}
	.wizard-step.done .ws-num {
		background: var(--nord14);
		color: white;
		border-color: var(--nord14);
	}
	.ws-label {
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-tertiary);
	}
	.wizard-step.active .ws-label {
		color: var(--nord10);
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
		background: var(--nord14);
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
		border-color: var(--nord10);
		background: color-mix(in srgb, var(--nord10) 6%, var(--color-bg-tertiary));
	}
	.preset-card.selected {
		border-color: var(--nord10);
		background: color-mix(in srgb, var(--nord10) 10%, var(--color-bg-tertiary));
		box-shadow: 0 0 0 1px var(--nord10);
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
		border-color: var(--nord10);
		color: var(--nord10);
	}

	/* TDEE warning */
	.tdee-warning {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.6rem 0.75rem;
		background: color-mix(in srgb, var(--nord13) 10%, var(--color-bg-tertiary));
		border: 1px solid color-mix(in srgb, var(--nord13) 30%, var(--color-border));
		border-radius: 8px;
		margin-bottom: 0.75rem;
		color: var(--nord13);
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
		color: var(--nord10);
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
	.tdee-compare-target.deficit { background: var(--nord9); }
	.tdee-compare-target.surplus { background: var(--nord12); }
	.tdee-compare-target.maintenance { background: var(--nord14); }
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
	.tdee-compare-diff.deficit { color: var(--nord9); }
	.tdee-compare-diff.surplus { color: var(--nord12); }
	.tdee-compare-diff.maintenance { color: var(--nord14); }

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
		border-color: var(--nord10);
		color: var(--nord10);
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
		color: var(--nord10);
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
		color: var(--nord10);
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
		border-color: var(--nord10);
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
		border-color: var(--nord14);
		background: var(--nord14);
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
	.water-cup.next-empty:hover .cup-svg > path:first-of-type {
		fill: color-mix(in srgb, var(--nord10) 20%, var(--color-bg-tertiary));
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
		color: var(--nord10);
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
		transition: background 0.12s;
		position: relative;
	}
	.food-card:hover {
		background: var(--color-bg-elevated);
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
	.food-card-edit-input {
		width: 55px;
		padding: 0.1rem 0.3rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-text-primary);
		font-size: 0.75rem;
		text-align: right;
	}
	.food-card-edit-input:focus {
		outline: none;
		border-color: var(--nord10);
	}
	.food-card-edit-unit {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
	}
	.food-card-macros {
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
		color: var(--nord10);
		background: color-mix(in srgb, var(--nord10) 10%, transparent);
	}
	.food-card-action.edit.active {
		color: var(--nord14);
	}
	.food-card-action.edit.active:hover {
		color: var(--nord14);
		background: color-mix(in srgb, var(--nord14) 10%, transparent);
	}
	.food-card-action.delete:hover {
		color: var(--nord11);
		background: color-mix(in srgb, var(--nord11) 10%, transparent);
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
	.cm-filter-input {
		width: 100%;
		padding: 0.55rem 0.65rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 0.9rem;
		box-sizing: border-box;
		transition: border-color 0.15s;
		margin-bottom: 0.25rem;
	}
	.cm-filter-input:focus {
		outline: none;
		border-color: var(--color-primary);
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
	.custom-meal-info[role="button"] {
		cursor: pointer;
		border-radius: 6px;
		transition: background 0.12s;
	}
	.custom-meal-info[role="button"]:hover {
		background: var(--color-bg-elevated);
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
	.btn-sm {
		padding: 0.3rem 0.65rem;
		font-size: 0.72rem;
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
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
	}
	.ql-meal-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.15s;
	}
	.ql-meal-btn.active {
		background: color-mix(in srgb, var(--mc) 15%, transparent);
		border-color: var(--mc);
		color: var(--mc);
	}
	.ql-meal-btn:hover:not(.active) {
		border-color: var(--color-text-tertiary);
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
	.ql-amount-input {
		width: 4rem;
		padding: 0.3rem 0.4rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		font-size: 0.78rem;
		text-align: right;
	}
	.ql-amount-input:focus {
		border-color: var(--nord8);
		outline: none;
	}
	.ql-amount-unit {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
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
