/**
 * Maps ExerciseDB anatomical muscle names (CAPS) to simplified display names
 * used in exercises.ts and throughout the UI.
 */

/** ExerciseDB anatomical name → simplified group name */
const MUSCLE_NAME_MAP: Record<string, string> = {
	// Chest
	'PECTORALIS MAJOR STERNAL HEAD': 'pectorals',
	'PECTORALIS MAJOR CLAVICULAR HEAD': 'pectorals',
	'SERRATUS ANTERIOR': 'pectorals',
	'SERRATUS ANTE': 'pectorals',

	// Shoulders
	'ANTERIOR DELTOID': 'anterior deltoids',
	'LATERAL DELTOID': 'lateral deltoids',
	'POSTERIOR DELTOID': 'rear deltoids',
	'INFRASPINATUS': 'rotator cuff',
	'TERES MINOR': 'rotator cuff',
	'SUBSCAPULARIS': 'rotator cuff',

	// Arms
	'BICEPS BRACHII': 'biceps',
	'BRACHIALIS': 'biceps',
	'BRACHIORADIALIS': 'brachioradialis',
	'TRICEPS BRACHII': 'triceps',
	'WRIST FLEXORS': 'forearms',
	'WRIST EXTENSORS': 'forearms',

	// Back
	'LATISSIMUS DORSI': 'lats',
	'TERES MAJOR': 'lats',
	'TRAPEZIUS UPPER FIBERS': 'traps',
	'TRAPEZIUS MIDDLE FIBERS': 'traps',
	'TRAPEZIUS LOWER FIBERS': 'traps',
	'LEVATOR SCAPULAE': 'traps',
	'ERECTOR SPINAE': 'erector spinae',

	// Core
	'RECTUS ABDOMINIS': 'abdominals',
	'TRANSVERSUS ABDOMINIS': 'abdominals',
	'OBLIQUES': 'obliques',

	// Hips & Glutes
	'GLUTEUS MAXIMUS': 'glutes',
	'GLUTEUS MEDIUS': 'glutes',
	'GLUTEUS MINIMUS': 'glutes',
	'ILIOPSOAS': 'hip flexors',
	'DEEP HIP EXTERNAL ROTATORS': 'glutes',
	'TENSOR FASCIAE LATAE': 'hip flexors',

	// Upper Legs
	'QUADRICEPS': 'quadriceps',
	'HAMSTRINGS': 'hamstrings',
	'ADDUCTOR LONGUS': 'hip flexors',
	'ADDUCTOR BREVIS': 'hip flexors',
	'ADDUCTOR MAGNUS': 'hamstrings',
	'PECTINEUS': 'hip flexors',
	'GRACILIS': 'hip flexors',
	'SARTORIUS': 'quadriceps',

	// Lower Legs
	'GASTROCNEMIUS': 'calves',
	'SOLEUS': 'calves',
	'TIBIALIS ANTERIOR': 'calves',

	// Neck
	'STERNOCLEIDOMASTOID': 'neck',
	'SPLENIUS': 'neck',
};

/** ExerciseDB body part → simplified body part used in exercises.ts */
const BODY_PART_MAP: Record<string, string> = {
	'BACK': 'back',
	'BICEPS': 'arms',
	'CALVES': 'legs',
	'CHEST': 'chest',
	'FOREARMS': 'arms',
	'FULL BODY': 'cardio',
	'HAMSTRINGS': 'legs',
	'HIPS': 'legs',
	'NECK': 'shoulders',
	'QUADRICEPS': 'legs',
	'SHOULDERS': 'shoulders',
	'THIGHS': 'legs',
	'TRICEPS': 'arms',
	'UPPER ARMS': 'arms',
	'WAIST': 'core',
};

/** ExerciseDB equipment → simplified equipment name */
const EQUIPMENT_MAP: Record<string, string> = {
	'BARBELL': 'barbell',
	'BODY WEIGHT': 'body weight',
	'CABLE': 'cable',
	'DUMBBELL': 'dumbbell',
	'LEVERAGE MACHINE': 'machine',
	'ROPE': 'other',
};

/** Convert ExerciseDB anatomical muscle name to simplified group */
export function edbMuscleToSimple(name: string): string {
	return MUSCLE_NAME_MAP[name] ?? name.toLowerCase();
}

/** Convert ExerciseDB body part to simplified name */
export function edbBodyPartToSimple(name: string): string {
	return BODY_PART_MAP[name] ?? name.toLowerCase();
}

/** Convert ExerciseDB equipment to simplified name */
export function edbEquipmentToSimple(name: string): string {
	return EQUIPMENT_MAP[name] ?? name.toLowerCase();
}

/** Ordered muscle groups for consistent display (anatomical top→bottom, front→back) */
export const MUSCLE_GROUPS = [
	'neck',
	'traps',
	'anterior deltoids',
	'lateral deltoids',
	'rear deltoids',
	'rotator cuff',
	'pectorals',
	'biceps',
	'brachioradialis',
	'triceps',
	'forearms',
	'lats',
	'erector spinae',
	'abdominals',
	'obliques',
	'hip flexors',
	'glutes',
	'quadriceps',
	'hamstrings',
	'calves',
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];

/** German translations for muscle group display names */
export const MUSCLE_GROUP_DE: Record<string, string> = {
	'neck': 'Nacken',
	'traps': 'Trapezmuskel',
	'anterior deltoids': 'Vordere Deltamuskeln',
	'lateral deltoids': 'Seitliche Deltamuskeln',
	'rear deltoids': 'Hintere Deltamuskeln',
	'rotator cuff': 'Rotatorenmanschette',
	'pectorals': 'Brustmuskel',
	'biceps': 'Bizeps',
	'brachioradialis': 'Oberarmspeichenmuskel',
	'triceps': 'Trizeps',
	'forearms': 'Unterarme',
	'lats': 'Latissimus',
	'erector spinae': 'Rückenstrecker',
	'abdominals': 'Bauchmuskeln',
	'obliques': 'Schräge Bauchmuskeln',
	'hip flexors': 'Hüftbeuger',
	'glutes': 'Gesäss',
	'quadriceps': 'Quadrizeps',
	'hamstrings': 'Beinbeuger',
	'calves': 'Waden',
};

/** Deduplicate muscle groups from an array of anatomical muscle names */
export function edbMusclesToGroups(muscles: string[]): string[] {
	const groups = new Set<string>();
	for (const m of muscles) {
		groups.add(edbMuscleToSimple(m));
	}
	return [...groups];
}
