/** Fitness route i18n — slug mappings and UI translations */

const slugMap: Record<string, Record<string, string>> = {
	en: { statistik: 'stats', verlauf: 'history', training: 'workout', aktiv: 'active', uebungen: 'exercises', messen: 'measure', ernaehrung: 'nutrition' },
	de: { stats: 'statistik', history: 'verlauf', workout: 'training', active: 'aktiv', exercises: 'uebungen', measure: 'messen', nutrition: 'ernaehrung' }
};

const germanSlugs = new Set(Object.keys(slugMap.en));

/** Detect language from a fitness path by checking for any German slug */
export function detectFitnessLang(pathname: string): 'en' | 'de' {
	const segments = pathname.replace(/^\/fitness\/?/, '').split('/');
	for (const seg of segments) {
		if (germanSlugs.has(seg)) return 'de';
	}
	return 'en';
}

/** Convert a fitness path to the target language */
export function convertFitnessPath(pathname: string, targetLang: 'en' | 'de'): string {
	const map = slugMap[targetLang];
	const segments = pathname.split('/');
	return segments.map(seg => map[seg] ?? seg).join('/');
}

/** Get translated sub-route slugs for a given language */
export function fitnessSlugs(lang: 'en' | 'de') {
	return {
		stats: lang === 'en' ? 'stats' : 'statistik',
		history: lang === 'en' ? 'history' : 'verlauf',
		workout: lang === 'en' ? 'workout' : 'training',
		active: lang === 'en' ? 'active' : 'aktiv',
		exercises: lang === 'en' ? 'exercises' : 'uebungen',
		measure: lang === 'en' ? 'measure' : 'messen',
		nutrition: lang === 'en' ? 'nutrition' : 'ernaehrung'
	};
}

/** Get translated nav labels */
export function fitnessLabels(lang: 'en' | 'de') {
	return {
		stats: lang === 'en' ? 'Stats' : 'Statistik',
		history: lang === 'en' ? 'History' : 'Verlauf',
		workout: lang === 'en' ? 'Workout' : 'Training',
		exercises: lang === 'en' ? 'Exercises' : 'Übungen',
		measure: lang === 'en' ? 'Measure' : 'Messen',
		nutrition: lang === 'en' ? 'Nutrition' : 'Ernährung'
	};
}

type Translations = Record<string, Record<string, string>>;

const translations: Translations = {
	// Common
	save: { en: 'Save', de: 'Speichern' },
	saving: { en: 'Saving…', de: 'Speichern…' },
	cancel: { en: 'CANCEL', de: 'ABBRECHEN' },
	delete_: { en: 'Delete', de: 'Löschen' },
	edit: { en: 'Edit', de: 'Bearbeiten' },
	loading: { en: 'Loading…', de: 'Laden…' },
	set: { en: 'set', de: 'Satz' },
	sets: { en: 'sets', de: 'Sätze' },
	exercise: { en: 'exercise', de: 'Übung' },
	exercises_word: { en: 'exercises', de: 'Übungen' },

	// Units
	kg: { en: 'kg', de: 'kg' },
	km: { en: 'km', de: 'km' },
	min: { en: 'min', de: 'Min' },

	// Stats page
	stats_title: { en: 'Stats', de: 'Statistik' },
	workout_singular: { en: 'Workout', de: 'Training' },
	workouts_plural: { en: 'Workouts', de: 'Trainings' },
	lifted: { en: 'Lifted', de: 'Gehoben' },
	est_kcal: { en: 'Est. kcal', de: 'Gesch. kcal' },
	burned: { en: 'Burned', de: 'Verbrannt' },
	kcal_set_profile: { en: 'Set sex & height in', de: 'Geschlecht & Grösse unter' },
	covered: { en: 'Covered', de: 'Zurückgelegt' },
	workouts_per_week: { en: 'Workouts per week', de: 'Trainings pro Woche' },
	sex: { en: 'Sex', de: 'Geschlecht' },
	male: { en: 'Male', de: 'Männlich' },
	female: { en: 'Female', de: 'Weiblich' },
	height: { en: 'Height (cm)', de: 'Grösse (cm)' },
	birth_year: { en: 'Birth Year', de: 'Geburtsjahr' },
	no_workout_data: { en: 'No workout data to display yet.', de: 'Noch keine Trainingsdaten vorhanden.' },
	weight: { en: 'Weight', de: 'Gewicht' },

	// History page
	history_title: { en: 'History', de: 'Verlauf' },
	no_workouts_yet: { en: 'No workouts yet. Start your first workout!', de: 'Noch keine Trainings. Starte dein erstes Training!' },
	load_more: { en: 'Load more', de: 'Mehr laden' },

	// History detail
	date: { en: 'Date', de: 'Datum' },
	time: { en: 'Time', de: 'Uhrzeit' },
	duration_min: { en: 'Duration (min)', de: 'Dauer (Min)' },
	notes: { en: 'Notes', de: 'Notizen' },
	notes_placeholder: { en: 'Workout notes...', de: 'Trainingsnotizen...' },
	gps_track_stored: { en: 'GPS track stored', de: 'GPS-Track gespeichert' },
	add_set: { en: '+ ADD SET', de: '+ SATZ HINZUFÜGEN' },
	add_exercise: { en: '+ ADD EXERCISE', de: '+ ÜBUNG HINZUFÜGEN' },
	splits: { en: 'Splits', de: 'Splits' },
	pace: { en: 'PACE', de: 'TEMPO' },
	upload_gpx: { en: 'Upload GPX', de: 'GPX hochladen' },
	uploading: { en: 'Uploading...', de: 'Hochladen...' },
	personal_records: { en: 'Personal Records', de: 'Persönliche Rekorde' },
	delete_session_confirm: { en: 'Delete this workout session?', de: 'Dieses Training löschen?' },
	remove_gps_confirm: { en: 'Remove GPS track from this exercise?', de: 'GPS-Track von dieser Übung entfernen?' },
	recalc_title: { en: 'Recalculate volume, PRs, and GPS previews', de: 'Volumen, PRs und GPS-Vorschauen neu berechnen' },

	// Workout templates page
	next_in_schedule: { en: 'Next in schedule', de: 'Nächstes im Plan' },
	start_empty_workout: { en: 'Empty Workout', de: 'leeres Training' },
	templates: { en: 'Templates', de: 'Vorlagen' },
	schedule: { en: 'Schedule', de: 'Zeitplan' },
	my_templates: { en: 'My Templates', de: 'Meine Vorlagen' },
	no_templates_yet: { en: 'No templates yet. Create one or start an empty workout.', de: 'Noch keine Vorlagen. Erstelle eine oder starte ein leeres Training.' },
	edit_template: { en: 'Edit Template', de: 'Vorlage bearbeiten' },
	new_template: { en: 'New Template', de: 'Neue Vorlage' },
	template_name_placeholder: { en: 'Template name', de: 'Vorlagenname' },
	add_set_lower: { en: '+ Add set', de: '+ Satz hinzufügen' },
	add_exercise_btn: { en: 'Add Exercise', de: 'Übung hinzufügen' },
	save_template: { en: 'Save Template', de: 'Vorlage speichern' },
	workout_schedule: { en: 'Workout Schedule', de: 'Trainingsplan' },
	schedule_hint: { en: 'Select templates and arrange their order. After completing a workout, the next one in the rotation will be suggested.', de: 'Wähle Vorlagen und ordne sie an. Nach Abschluss eines Trainings wird das nächste in der Rotation vorgeschlagen.' },
	available_templates: { en: 'Available templates', de: 'Verfügbare Vorlagen' },
	all_templates_scheduled: { en: 'All templates are in the schedule', de: 'Alle Vorlagen sind im Zeitplan' },
	save_schedule: { en: 'Save Schedule', de: 'Zeitplan speichern' },
	start_workout: { en: 'Start Workout', de: 'Training starten' },
	delete_template: { en: 'Delete', de: 'Löschen' },

	// Active workout / completion
	workout_complete: { en: 'Workout Complete', de: 'Training abgeschlossen' },
	workout_saved_offline: { en: 'Saved offline — will sync when back online.', de: 'Offline gespeichert — wird bei Verbindung synchronisiert.' },
	duration: { en: 'Duration', de: 'Dauer' },
	tonnage: { en: 'Tonnage', de: 'Tonnage' },
	distance: { en: 'Distance', de: 'Distanz' },
	exercises_heading: { en: 'Exercises', de: 'Übungen' },
	volume: { en: 'volume', de: 'Volumen' },
	avg: { en: 'avg', de: 'Ø' },
	update_template: { en: 'Update Template', de: 'Vorlage aktualisieren' },
	template_updated: { en: 'Template updated', de: 'Vorlage aktualisiert' },
	template_diff_desc: { en: 'Your weights or reps differ from the template:', de: 'Gewichte oder Wiederholungen weichen von der Vorlage ab:' },
	updating: { en: 'Updating...', de: 'Aktualisieren...' },
	view_workout: { en: 'VIEW WORKOUT', de: 'TRAINING ANSEHEN' },
	done: { en: 'DONE', de: 'FERTIG' },
	workout_name_placeholder: { en: 'Workout name', de: 'Trainingsname' },
	cancel_workout: { en: 'CANCEL WORKOUT', de: 'TRAINING ABBRECHEN' },
	finish: { en: 'FINISH', de: 'BEENDEN' },
	new_set_added: { en: 'new set', de: 'neuer Satz' },
	new_sets_added: { en: 'new sets', de: 'neue Sätze' },

	// Exercises page
	exercises_title: { en: 'Exercises', de: 'Übungen' },
	search_exercises: { en: 'Search exercises…', de: 'Übungen suchen…' },
	all_body_parts: { en: 'All body parts', de: 'Alle Körperteile' },
	all_equipment: { en: 'All equipment', de: 'Alle Geräte' },
	no_exercises_match: { en: 'No exercises match your search.', de: 'Keine Übungen gefunden.' },

	// Exercise detail
	about: { en: 'ABOUT', de: 'INFO' },
	history_tab: { en: 'HISTORY', de: 'VERLAUF' },
	charts: { en: 'CHARTS', de: 'DIAGRAMME' },
	records: { en: 'RECORDS', de: 'REKORDE' },
	instructions: { en: 'Instructions', de: 'Anleitung' },
	no_history_yet: { en: 'No history for this exercise yet.', de: 'Noch kein Verlauf für diese Übung.' },
	est_1rm: { en: 'EST. 1RM', de: 'GESCH. 1RM' },
	best_set_1rm: { en: 'Best Set (Est. 1RM)', de: 'Bester Satz (Gesch. 1RM)' },
	best_set_max: { en: 'Best Set (Max Weight)', de: 'Bester Satz (Max. Gewicht)' },
	total_volume: { en: 'Total Volume', de: 'Gesamtvolumen' },
	not_enough_data: { en: 'Not enough data to display charts yet.', de: 'Noch nicht genug Daten für Diagramme.' },
	estimated_1rm: { en: 'Estimated 1RM', de: 'Geschätztes 1RM' },
	max_volume: { en: 'Max Volume', de: 'Max. Volumen' },
	max_weight: { en: 'Max Weight', de: 'Max. Gewicht' },
	rep_records: { en: 'Rep Records', de: 'Wiederholungsrekorde' },
	reps: { en: 'REPS', de: 'WDH' },
	best_performance: { en: 'BEST PERFORMANCE', de: 'BESTLEISTUNG' },

	// Measure page
	measure_title: { en: 'Measure', de: 'Messen' },
	profile: { en: 'Profile', de: 'Profil' },
	new_measurement: { en: 'New Measurement', de: 'Neue Messung' },
	edit_measurement: { en: 'Edit Measurement', de: 'Messung bearbeiten' },
	weight_kg: { en: 'Weight (kg)', de: 'Gewicht (kg)' },
	body_fat: { en: 'Body Fat %', de: 'Körperfett %' },
	calories_kcal: { en: 'Calories (kcal)', de: 'Kalorien (kcal)' },
	body_parts_cm: { en: 'Body Parts (cm)', de: 'Körpermasse (cm)' },
	neck: { en: 'Neck', de: 'Hals' },
	shoulders: { en: 'Shoulders', de: 'Schultern' },
	chest: { en: 'Chest', de: 'Brust' },
	l_bicep: { en: 'L Bicep', de: 'L Bizeps' },
	r_bicep: { en: 'R Bicep', de: 'R Bizeps' },
	l_forearm: { en: 'L Forearm', de: 'L Unterarm' },
	r_forearm: { en: 'R Forearm', de: 'R Unterarm' },
	waist: { en: 'Waist', de: 'Taille' },
	hips: { en: 'Hips', de: 'Hüfte' },
	l_thigh: { en: 'L Thigh', de: 'L Oberschenkel' },
	r_thigh: { en: 'R Thigh', de: 'R Oberschenkel' },
	l_calf: { en: 'L Calf', de: 'L Wade' },
	r_calf: { en: 'R Calf', de: 'R Wade' },
	save_measurement: { en: 'Save Measurement', de: 'Messung speichern' },
	update_measurement: { en: 'Update Measurement', de: 'Messung aktualisieren' },
	latest: { en: 'Latest', de: 'Aktuell' },
	body_fat_short: { en: 'Body Fat', de: 'Körperfett' },
	calories: { en: 'Calories', de: 'Kalorien' },
	body_parts: { en: 'Body Parts', de: 'Körpermasse' },
	body_measurements_only: { en: 'Body measurements only', de: 'Nur Körpermasse' },
	delete_measurement_confirm: { en: 'Delete this measurement?', de: 'Diese Messung löschen?' },
	general: { en: 'General', de: 'Allgemein' },
	body_fat_pct: { en: 'Body Fat (%)', de: 'Körperfett (%)' },
	history: { en: 'History', de: 'Verlauf' },

	// SetTable
	set_header: { en: 'SET', de: 'SATZ' },
	prev_header: { en: 'PREV', de: 'VORH' },
	rpe: { en: 'RPE', de: 'RPE' },

	// ExercisePicker
	picker_title: { en: 'Add Exercise', de: 'Übung hinzufügen' },
	no_exercises_found: { en: 'No exercises found', de: 'Keine Übungen gefunden' },

	// TemplateCard
	last_performed: { en: 'Last performed:', de: 'Zuletzt durchgeführt:' },
	today: { en: 'Today', de: 'Heute' },
	yesterday: { en: 'Yesterday', de: 'Gestern' },
	days_ago: { en: 'days ago', de: 'Tagen' },
	more: { en: 'more', de: 'weitere' },

	// WorkoutFab
	active_workout: { en: 'Active Workout', de: 'Aktives Training' },

	// Streak / Goal
	streak: { en: 'Streak', de: 'Serie' },
	streak_weeks: { en: 'Weeks', de: 'Wochen' },
	streak_week: { en: 'Week', de: 'Woche' },
	weekly_goal: { en: 'Weekly Goal', de: 'Wochenziel' },
	workouts_per_week_goal: { en: 'workouts / week', de: 'Trainings / Woche' },
	set_goal: { en: 'Set Goal', de: 'Ziel setzen' },
	goal_set: { en: 'Goal set', de: 'Ziel gesetzt' },

	// Intervals
	intervals: { en: 'Intervals', de: 'Intervalle' },
	no_intervals: { en: 'None', de: 'Keine' },
	new_interval: { en: 'New Interval', de: 'Neues Intervall' },
	edit_interval: { en: 'Edit Interval', de: 'Intervall bearbeiten' },
	delete_interval: { en: 'Delete', de: 'Löschen' },
	delete_interval_confirm: { en: 'Delete this interval template?', de: 'Diese Intervallvorlage löschen?' },
	add_step: { en: '+ Add Step', de: '+ Schritt hinzufügen' },
	step_label: { en: 'Label', de: 'Bezeichnung' },
	meters: { en: 'meters', de: 'Meter' },
	seconds: { en: 'seconds', de: 'Sekunden' },
	intervals_complete: { en: 'Intervals complete', de: 'Intervalle abgeschlossen' },
	select_interval: { en: 'Select Interval', de: 'Intervall wählen' },
	custom: { en: 'Custom', de: 'Eigene' },
	steps_count: { en: 'steps', de: 'Schritte' },
	save_interval: { en: 'Save Interval', de: 'Intervall speichern' },
	interval_name_placeholder: { en: 'Interval name', de: 'Intervallname' },
	// Preset labels
	label_easy: { en: 'Easy', de: 'Leicht' },
	label_moderate: { en: 'Moderate', de: 'Moderat' },
	label_hard: { en: 'Hard', de: 'Hart' },
	label_sprint: { en: 'Sprint', de: 'Sprint' },
	label_recovery: { en: 'Recovery', de: 'Erholung' },
	label_hill_sprints: { en: 'Hill Sprints', de: 'Bergsprints' },
	label_tempo: { en: 'Tempo', de: 'Tempo' },
	label_warm_up: { en: 'Warm Up', de: 'Aufwärmen' },
	label_cool_down: { en: 'Cool Down', de: 'Abkühlen' },

	// Nutrition / Food log
	nutrition_title: { en: 'Nutrition', de: 'Ernährung' },
	breakfast: { en: 'Breakfast', de: 'Frühstück' },
	lunch: { en: 'Lunch', de: 'Mittagessen' },
	dinner: { en: 'Dinner', de: 'Abendessen' },
	snack: { en: 'Snack', de: 'Snack' },
	add_food: { en: 'Add food', de: 'Essen hinzufügen' },
	search_food: { en: 'Search food…', de: 'Essen suchen…' },
	amount_grams: { en: 'Amount (g)', de: 'Menge (g)' },
	meal_type: { en: 'Meal', de: 'Mahlzeit' },
	daily_goal: { en: 'Daily Goal', de: 'Tagesziel' },
	calorie_target: { en: 'Calorie target (kcal)', de: 'Kalorienziel (kcal)' },
	protein_goal: { en: 'Protein goal', de: 'Proteinziel' },
	protein_fixed: { en: 'Fixed (g/day)', de: 'Fest (g/Tag)' },
	protein_per_kg: { en: 'Per kg bodyweight', de: 'Pro kg Körpergewicht' },
	fat_percent: { en: 'Fat (%)', de: 'Fett (%)' },
	carb_percent: { en: 'Carbs (%)', de: 'Kohlenhydrate (%)' },
	kcal: { en: 'kcal', de: 'kcal' },
	protein: { en: 'Protein', de: 'Protein' },
	fat: { en: 'Fat', de: 'Fett' },
	carbs: { en: 'Carbs', de: 'Kohlenhydrate' },
	remaining: { en: 'remaining', de: 'übrig' },
	over: { en: 'over', de: 'über' },
	no_entries_yet: { en: 'No entries yet. Add food to start tracking.', de: 'Noch keine Einträge. Füge Essen hinzu, um zu tracken.' },
	set_goal_prompt: { en: 'Set a daily calorie goal to start tracking.', de: 'Setze ein Kalorienziel, um mit dem Tracking zu beginnen.' },
	micro_details: { en: 'Micronutrients', de: 'Mikronährstoffe' },
	of_daily: { en: 'of daily goal', de: 'vom Tagesziel' },
	per_serving: { en: 'per serving', de: 'pro Portion' },
	log_food: { en: 'Log', de: 'Eintragen' },
	delete_entry_confirm: { en: 'Delete this food entry?', de: 'Diesen Eintrag löschen?' },

	// Period tracker
	period_tracker: { en: 'Period Tracker', de: 'Periodentracker' },
	current_period: { en: 'Current Period', de: 'Aktuelle Periode' },
	no_period_data: { en: 'No period data yet. Log your first period to start tracking.', de: 'Noch keine Periodendaten. Erfasse deine erste Periode.' },
	start_period: { en: 'Start Period', de: 'Periode starten' },
	end_period: { en: 'Period Ended', de: 'Periode vorbei' },
	period_day: { en: 'Day', de: 'Tag' },
	predicted_end: { en: 'Predicted end', de: 'Voraussichtliches Ende' },
	next_period: { en: 'Next period', de: 'Nächste Periode' },
	cycle_length: { en: 'Cycle length', de: 'Zykluslänge' },
	period_length: { en: 'Period length', de: 'Periodenlänge' },
	avg_cycle: { en: 'Avg. cycle', de: 'Ø Zyklus' },
	avg_period: { en: 'Avg. period', de: 'Ø Periode' },
	days: { en: 'days', de: 'Tage' },
	delete_period_confirm: { en: 'Delete this period entry?', de: 'Diesen Periodeneintrag löschen?' },
	add_past_period: { en: 'Add Past Period', de: 'Vergangene Periode hinzufügen' },
	period_start: { en: 'Start', de: 'Beginn' },
	period_end: { en: 'End', de: 'Ende' },
	ongoing: { en: 'ongoing', de: 'laufend' },
	share: { en: 'Share', de: 'Teilen' },
	shared_with: { en: 'Shared with', de: 'Geteilt mit' },
	add_user: { en: 'Add user…', de: 'Nutzer hinzufügen…' },
	no_shared: { en: 'Not shared with anyone.', de: 'Mit niemandem geteilt.' },
	shared_by: { en: 'Shared by', de: 'Geteilt von' },
	fertile_window: { en: 'Fertile window', de: 'Fruchtbares Fenster' },
	peak_fertility: { en: 'Peak fertility', de: 'Höchste Fruchtbarkeit' },
	ovulation: { en: 'Ovulation', de: 'Eisprung' },
	fertile: { en: 'Fertile', de: 'Fruchtbar' },
	luteal_phase: { en: 'Luteal', de: 'Luteal' },
	predicted_ovulation: { en: 'Predicted ovulation', de: 'Voraussichtlicher Eisprung' },
	to: { en: 'to', de: 'bis' },

	// Exercise detail (enriched)
	overview: { en: 'Overview', de: 'Überblick' },
	tips: { en: 'Tips', de: 'Tipps' },
	similar_exercises: { en: 'Similar Exercises', de: 'Ähnliche Übungen' },
	primary_muscles: { en: 'Primary', de: 'Primär' },
	secondary_muscles: { en: 'Secondary', de: 'Sekundär' },
	play_video: { en: 'Play Video', de: 'Video abspielen' },

	// Muscle heatmap
	muscle_balance: { en: 'Muscle Balance', de: 'Muskelbalance' },
	weekly_sets: { en: 'Sets per week', de: 'Sätze pro Woche' },

	// Custom meals
	custom_meals: { en: 'Custom Meals', de: 'Eigene Mahlzeiten' },
	custom_meal: { en: 'Custom Meal', de: 'Eigene Mahlzeit' },
	new_meal: { en: 'New Meal', de: 'Neue Mahlzeit' },
	meal_name: { en: 'Meal name', de: 'Name der Mahlzeit' },
	add_ingredient: { en: 'Add ingredient', de: 'Zutat hinzufügen' },
	no_custom_meals: { en: 'No custom meals yet.', de: 'Noch keine eigenen Mahlzeiten.' },
	create_meal_hint: { en: 'Create reusable meals for quick logging.', de: 'Erstelle wiederverwendbare Mahlzeiten zum schnellen Eintragen.' },
	ingredients: { en: 'Ingredients', de: 'Zutaten' },
	total: { en: 'Total', de: 'Gesamt' },
	log_meal: { en: 'Log Meal', de: 'Mahlzeit eintragen' },
	delete_meal_confirm: { en: 'Delete this custom meal?', de: 'Diese Mahlzeit löschen?' },
	save_meal: { en: 'Save Meal', de: 'Mahlzeit speichern' },

	// Favorites
	favorites: { en: 'Favorites', de: 'Favoriten' },

	// Ingredient detail
	per_100g: { en: 'per 100 g', de: 'pro 100 g' },
	macros: { en: 'Macronutrients', de: 'Makronährstoffe' },
	minerals: { en: 'Minerals', de: 'Mineralstoffe' },
	vitamins: { en: 'Vitamins', de: 'Vitamine' },
	amino_acids: { en: 'Amino Acids', de: 'Aminosäuren' },
	essential: { en: 'Essential', de: 'Essenziell' },
	non_essential: { en: 'Non-Essential', de: 'Nicht-essenziell' },
	saturated_fat: { en: 'Saturated Fat', de: 'Gesättigte Fettsäuren' },
	fiber: { en: 'Fiber', de: 'Ballaststoffe' },
	sugars: { en: 'Sugars', de: 'Zucker' },
	source_db: { en: 'Source', de: 'Quelle' },
};

/** Get a translated string */
export function t(key: string, lang: 'en' | 'de'): string {
	return translations[key]?.[lang] ?? translations[key]?.en ?? key;
}
