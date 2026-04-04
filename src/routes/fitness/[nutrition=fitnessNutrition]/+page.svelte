<script>
	import { page } from '$app/stores';
	import { goto, invalidateAll } from '$app/navigation';
	import { ChevronLeft, ChevronRight, Plus, Trash2, ChevronDown, Settings, Coffee, Sun, Moon, Cookie, Utensils, Info, UtensilsCrossed } from 'lucide-svelte';
	import { detectFitnessLang, fitnessSlugs, t } from '$lib/js/fitnessI18n';
	import AddButton from '$lib/components/AddButton.svelte';
	import FoodSearch from '$lib/components/fitness/FoodSearch.svelte';
	import { toast } from '$lib/js/toast.svelte';
	import { getDRI, NUTRIENT_META } from '$lib/data/dailyReferenceIntake';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const s = $derived(fitnessSlugs(lang));
	const isEn = $derived(lang === 'en');

	let { data } = $props();

	// --- Date navigation ---
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
	let entries = $state(data.foodLog?.entries ?? []);
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
	let goalCalories = $state(data.goal?.dailyCalories ?? null);
	let goalProteinMode = $state(data.goal?.proteinMode ?? 'fixed');
	let goalProteinTarget = $state(data.goal?.proteinTarget ?? null);
	let goalFatPercent = $state(data.goal?.fatPercent ?? null);
	let goalCarbPercent = $state(data.goal?.carbPercent ?? null);
	let goalSex = $state(data.goal?.sex ?? 'male');
	let activityLevel = $state(data.goal?.activityLevel ?? 'light');
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
		// calories: null = don't change, 'bmr' = use BMR, number = multiplier of BMR
		{ emoji: '⚖️', en: 'WHO Balanced', de: 'WHO Ausgewogen',
			proteinMode: 'per_kg', proteinTarget: 0.83, fatPercent: 30, carbPercent: 55 },
		{ emoji: '💪', en: 'Maintain', de: 'Halten',
			proteinMode: 'per_kg', proteinTarget: 1.6, fatPercent: 30, carbPercent: 45, calMult: 1.0 },
		{ emoji: '🔪', en: 'Cut', de: 'Definieren',
			proteinMode: 'per_kg', proteinTarget: 2.2, fatPercent: 25, carbPercent: 40, calMult: 0.8 },
		{ emoji: '🍖', en: 'Bulk', de: 'Aufbauen',
			proteinMode: 'per_kg', proteinTarget: 1.8, fatPercent: 30, carbPercent: 50, calMult: 1.15 },
		{ emoji: '🥑', en: 'Keto', de: 'Keto',
			proteinMode: 'per_kg', proteinTarget: 1.5, fatPercent: 70, carbPercent: 5 },
		{ emoji: '🏋️', en: 'High Protein', de: 'Proteinreich',
			proteinMode: 'per_kg', proteinTarget: 2.5, fatPercent: 30, carbPercent: 30 },
		{ emoji: '🥩', en: 'Carnivore', de: 'Karnivor',
			proteinMode: 'per_kg', proteinTarget: 2.5, fatPercent: 65, carbPercent: 0 },
	];

	function applyPreset(preset) {
		editProteinMode = preset.proteinMode;
		editProteinTarget = String(preset.proteinTarget);
		editFatPercent = String(preset.fatPercent);
		editCarbPercent = String(preset.carbPercent);
		if (preset.calMult && hasBmrData) {
			editCalories = String(Math.round(dailyTdee * preset.calMult));
		}
	}

	function openGoalEditor() {
		editCalories = String(goalCalories ?? '');
		editActivityLevel = activityLevel;
		editProteinMode = goalProteinMode;
		editProteinTarget = String(goalProteinTarget ?? '');
		editFatPercent = String(goalFatPercent ?? '');
		editCarbPercent = String(goalCarbPercent ?? '');
		showGoalEditor = true;
	}

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
			if (g[e.mealType]) g[e.mealType].push(e);
		}
		return g;
	});

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

	// TDEE (excl. exercise) prorated to current time of day (for today only)
	const tdeeSoFar = $derived.by(() => {
		if (currentDate !== todayStr) return Math.round(dailyTdee);
		const now = new Date();
		const fraction = (now.getHours() * 60 + now.getMinutes()) / 1440;
		return Math.round(dailyTdee * fraction);
	});



	// Net calorie balance: goal + burned - eaten
	const calorieBalance = $derived(goalCalories ? (goalCalories + (exerciseKcal || 0) - dayTotals.calories) : 0);
	const calorieProgress = $derived(goalCalories ? Math.min(dayTotals.calories / (goalCalories + (exerciseKcal || 0)) * 100, 100) : 0);

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

	// --- Inline add food ---
	let addingMeal = $state(null);

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
	let fabTab = $state('search'); // 'search' | 'meals'
	let customMeals = $state([]);
	let customMealsLoaded = $state(false);

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

	function mealTotalCal(meal) {
		return meal.ingredients.reduce((sum, ing) => sum + (ing.per100g?.calories ?? 0) * ing.amountGrams / 100, 0);
	}

	async function logCustomMeal(meal) {
		try {
			// Aggregate all ingredients into a single per100g snapshot
			const totals = {};
			const nutrientKeys = ['calories', 'protein', 'fat', 'saturatedFat', 'carbs', 'fiber', 'sugars',
				'calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc',
				'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK',
				'thiamin', 'riboflavin', 'niacin', 'vitaminB6', 'vitaminB12', 'folate', 'cholesterol',
				'isoleucine', 'leucine', 'lysine', 'methionine', 'phenylalanine', 'threonine',
				'tryptophan', 'valine', 'histidine', 'alanine', 'arginine', 'asparticAcid',
				'cysteine', 'glutamicAcid', 'glycine', 'proline', 'serine', 'tyrosine'];
			for (const k of nutrientKeys) totals[k] = 0;
			let totalGrams = 0;
			for (const ing of meal.ingredients) {
				const r = ing.amountGrams / 100;
				totalGrams += ing.amountGrams;
				for (const k of nutrientKeys) totals[k] += (ing.per100g?.[k] ?? 0) * r;
			}
			// Convert absolute totals back to per-100g
			const per100g = {};
			const scale = totalGrams > 0 ? 100 / totalGrams : 0;
			for (const k of nutrientKeys) per100g[k] = totals[k] * scale;

			await fetch('/api/fitness/food-log', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					date: currentDate,
					mealType: fabMealType,
					name: meal.name,
					source: 'custom',
					sourceId: meal._id,
					amountGrams: totalGrams,
					per100g,
				})
			});
			await goto(`/fitness/${s.nutrition}?date=${currentDate}`, { replaceState: true, noScroll: true });
			closeFabModal();
			toast.success(isEn ? `Logged "${meal.name}"` : `"${meal.name}" eingetragen`);
		} catch {
			toast.error(isEn ? 'Failed to log meal' : 'Fehler beim Eintragen');
		}
	}

	function startAdd(meal) {
		addingMeal = meal;
	}

	function cancelAdd() {
		addingMeal = null;
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

	async function deleteEntry(id) {
		if (!confirm(t('delete_entry_confirm', lang))) return;
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
</script>

<svelte:head>
	<title>{t('nutrition_title', lang)} — Fitness</title>
</svelte:head>

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
	</div>

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
						<circle class="ring-fill ring-calories" cx="35" cy="35" r={RADIUS}
							stroke-dasharray="{ARC_LENGTH} {2 * Math.PI * RADIUS}"
							stroke-dashoffset={strokeOffset(calorieProgress)}
							transform="rotate({ARC_ROTATE} 35 35)" />
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
					{@const remaining = macro.goal ? macro.goal - macro.value : 0}
					<div class="macro-bar-item">
						<span class="macro-bar-label">{macro.label}</span>
						<div class="macro-bar-track">
							<div class="macro-bar-fill" class:over style="width: {Math.min(pct, 100)}%; {over ? '' : `background: ${macro.color}`}"></div>
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

			<!-- Micro toggle -->
			<div class="details-toggle-row">
				<button class="details-toggle" onclick={() => showMicros = !showMicros}>
					<ChevronDown size={14} style={showMicros ? 'transform: rotate(180deg)' : ''} />
					{t('micro_details', lang)}
				</button>
			</div>

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

	<!-- Goal Editor -->
	{#if showGoalEditor}
		<div class="goal-editor">
			<h3>{t('daily_goal', lang)}</h3>

			<!-- Diet presets -->
			<div class="preset-section">
				<span class="preset-label">{isEn ? 'Presets' : 'Vorlagen'}</span>
				<div class="preset-chips">
					{#each dietPresets as preset}
						<button class="preset-chip" type="button" onclick={() => applyPreset(preset)}>
							<span class="preset-emoji">{preset.emoji}</span>
							<span>{isEn ? preset.en : preset.de}</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="goal-field">
				<label for="goal-calories">{t('calorie_target', lang)}</label>
				<div class="calorie-input-row">
					<input id="goal-calories" type="number" bind:value={editCalories} min="500" max="10000" />
					{#if hasBmrData}
						<button class="bmr-calc-btn" type="button" onclick={() => editCalories = String(Math.round(dailyTdee))}>
							TDEE ({Math.round(dailyTdee)})
						</button>
					{/if}
				</div>
			</div>
			<div class="goal-field">
				<label for="goal-activity">{isEn ? 'Activity Level (excl. exercise)' : 'Aktivitätslevel (ohne Training)'}</label>
				<select id="goal-activity" bind:value={editActivityLevel}>
					<option value="sedentary">{isEn ? 'Sedentary — desk job' : 'Sitzend — Bürojob'} (×1.2)</option>
					<option value="light">{isEn ? 'Lightly active — some walking' : 'Leicht aktiv — etwas Gehen'} (×1.3)</option>
					<option value="moderate">{isEn ? 'Moderately active — on feet' : 'Mäßig aktiv — auf den Beinen'} (×1.4)</option>
					<option value="very_active">{isEn ? 'Very active — physical job' : 'Sehr aktiv — körperliche Arbeit'} (×1.5)</option>
				</select>
			</div>
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
			<div class="goal-actions">
				<button class="btn-secondary" onclick={() => showGoalEditor = false}>{t('cancel', lang)}</button>
				<button class="btn-primary" onclick={saveGoals} disabled={goalSaving}>
					{goalSaving ? t('saving', lang) : t('save', lang)}
				</button>
			</div>
		</div>
	{/if}

	<!-- Meal Sections -->
	{#each mealTypes as meal, mi}
		{@const mealEntries = grouped[meal]}
		{@const mealCal = mealEntries.reduce((s, e) => s + entryCalories(e), 0)}
		{@const meta = mealMeta[meal]}
		{@const MealSectionIcon = meta.icon}
		<div class="meal-section" style="--meal-color: {meta.color}; animation-delay: {mi * 60}ms">
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
							<span class="food-card-detail">{entry.amountGrams}g · {fmtCal(entryCalories(entry))} kcal</span>
							<span class="food-card-macros">{fmt(entryNutrient(entry, 'protein'))}g P · {fmt(entryNutrient(entry, 'fat'))}g F · {fmt(entryNutrient(entry, 'carbs'))}g C</span>
						</div>
						<button class="food-card-delete" onclick={() => deleteEntry(entry._id)} aria-label={t('delete_', lang)}>
							<Trash2 size={14} />
						</button>
					</div>
				{/each}
			</div>

			{#if addingMeal === meal}
				<div class="add-food-form">
					<FoodSearch onselect={inlineLogFood} oncancel={cancelAdd} showDetailLinks={false} autofocus={true} />
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

<!-- FAB -->
<AddButton href={fabHref} />

<!-- FAB Modal -->
{#if showFabModal}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fab-overlay" onclick={closeFabModal} onkeydown={(e) => e.key === 'Escape' && closeFabModal()}>
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
		<div class="fab-modal" onclick={(e) => e.stopPropagation()}>
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

			<!-- Tabs: Search / Custom Meals -->
			<div class="fab-tabs">
				<button class="fab-tab" class:active={fabTab === 'search'} onclick={() => fabTab = 'search'}>
					{t('search_food', lang).replace('…', '')}
				</button>
				<button class="fab-tab" class:active={fabTab === 'meals'} onclick={() => { fabTab = 'meals'; loadCustomMeals(); }}>
					<UtensilsCrossed size={13} />
					{t('custom_meals', lang)}
				</button>
			</div>

			{#if fabTab === 'search'}
				<FoodSearch onselect={fabLogFood} autofocus={true} />
			{:else}
				<!-- Custom Meals tab -->
				<div class="custom-meals-list">
					{#if customMeals.length === 0}
						<p class="meals-empty">{t('no_custom_meals', lang)}</p>
					{/if}
					{#each customMeals as meal}
						<div class="custom-meal-card">
							<div class="custom-meal-info">
								<span class="custom-meal-name">{meal.name}</span>
								<span class="custom-meal-detail">{meal.ingredients.length} {t('ingredients', lang)} · {fmtCal(mealTotalCal(meal))} kcal</span>
							</div>
							<button class="btn-primary btn-sm" onclick={() => logCustomMeal(meal)}>{t('log_meal', lang)}</button>
						</div>
					{/each}
					<a class="manage-meals-link" href="/fitness/{s.nutrition}/meals">
						<Settings size={13} />
						{isEn ? 'Manage meals' : 'Mahlzeiten verwalten'}
					</a>
				</div>
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

	/* ── Entrance animations ── */
	@keyframes fade-up {
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* ── Date Navigator ── */
	.date-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		animation: fade-up 0.3s ease both;
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
		color: var(--nord8);
		background: color-mix(in srgb, var(--nord8) 12%, transparent);
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
	}

	/* ── Daily Summary Card ── */
	.daily-summary {
		background: var(--color-surface);
		border-radius: 12px;
		padding: 1.25rem;
		box-shadow: var(--shadow-sm);
		position: relative;
		animation: fade-up 0.35s ease both;
		animation-delay: 50ms;
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
		filter: drop-shadow(0 0 8px color-mix(in srgb, var(--nord8) 20%, transparent));
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
	}
	.macro-bar-fill {
		height: 100%;
		border-radius: 3px;
		transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.macro-bar-fill.over {
		background: var(--nord11) !important;
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
	.ring-calories { stroke: var(--nord8); }
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
	/* (macro rings replaced by macro bars) */

	/* ── Micro Details ── */
	.details-toggle-row {
		text-align: center;
		margin-top: 0.75rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border);
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
		margin-top: 0.75rem;
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
		animation: fade-up 0.25s ease both;
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
		animation: fade-up 0.35s ease both;
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
		animation: fade-up 0.25s ease both;
	}
	.preset-section {
		margin-bottom: 1rem;
	}
	.preset-label {
		display: block;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		margin-bottom: 0.4rem;
	}
	.preset-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.preset-chip {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.3rem 0.55rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 20px;
		color: var(--color-text-primary);
		font-size: 0.7rem;
		font-weight: 500;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}
	.preset-chip:hover {
		border-color: var(--nord10);
		background: color-mix(in srgb, var(--nord10) 10%, var(--color-bg-tertiary));
	}
	.preset-emoji {
		font-size: 0.8rem;
	}
	.goal-editor h3 {
		margin: 0 0 1rem;
		font-size: 0.95rem;
		font-weight: 700;
	}
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
	.goal-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 0.75rem;
	}

	/* ── Meal Sections ── */
	.meal-section {
		animation: fade-up 0.35s ease both;
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
	.food-card-macros {
		font-size: 0.65rem;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}
	.food-card-delete {
		background: none;
		border: none;
		color: var(--color-text-tertiary);
		cursor: pointer;
		padding: 0.3rem;
		border-radius: 6px;
		flex-shrink: 0;
		transition: color 0.12s, background 0.12s;
		display: flex;
		align-self: flex-start;
	}
	.food-card-delete:hover {
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
		.food-card-delete {
			position: absolute;
			top: 0.3rem;
			right: 0.3rem;
			background: color-mix(in srgb, var(--color-surface) 80%, transparent);
			border-radius: 50%;
			padding: 0.25rem;
			opacity: 0;
			transition: opacity 0.15s, color 0.12s, background 0.12s;
		}
		.food-card:hover .food-card-delete {
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
		animation: fade-up 0.2s ease both;
	}
	/* Search/food selection handled by FoodSearch component */

	/* ── Buttons ── */
	.btn-primary {
		padding: 0.5rem 1.1rem;
		background: var(--nord8);
		color: white;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.01em;
		transition: background 0.15s, transform 0.1s;
	}
	.btn-primary:hover {
		background: var(--nord10);
	}
	.btn-primary:active {
		transform: scale(0.97);
	}
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}
	.btn-secondary,
	.btn-cancel {
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
	.btn-cancel:hover {
		background: var(--color-bg-elevated);
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
		color: var(--nord8);
		border-bottom-color: var(--nord8);
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
	.custom-meal-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.6rem 0.75rem;
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
</style>
