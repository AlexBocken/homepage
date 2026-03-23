export type MetricField = 'weight' | 'reps' | 'rpe' | 'distance' | 'duration';

export const METRIC_LABELS: Record<MetricField, string> = {
	weight: 'KG',
	reps: 'REPS',
	rpe: 'RPE',
	distance: 'KM',
	duration: 'MIN'
};

export const METRIC_PRESETS = {
	strength: ['weight', 'reps', 'rpe'] as MetricField[],
	cardio: ['distance', 'duration', 'rpe'] as MetricField[],
	timed: ['duration', 'reps'] as MetricField[]
};

export interface Exercise {
	id: string;
	name: string;
	bodyPart: string;
	equipment: string;
	target: string;
	secondaryMuscles: string[];
	instructions: string[];
	metrics?: MetricField[];
	bilateral?: boolean; // true = weight entered is per hand, actual load is 2×
	imageUrl?: string;
	de?: { name: string; instructions: string[] };
}

/** German translations for category terms (bodyPart, equipment, target, muscles) */
const termsDe: Record<string, string> = {
	// bodyPart
	arms: 'Arme',
	back: 'Rücken',
	cardio: 'Ausdauer',
	chest: 'Brust',
	core: 'Rumpf',
	legs: 'Beine',
	shoulders: 'Schultern',
	// equipment
	barbell: 'Langhantel',
	'body weight': 'Körpergewicht',
	cable: 'Kabelzug',
	dumbbell: 'Kurzhantel',
	machine: 'Maschine',
	other: 'Sonstiges',
	// target + secondaryMuscles
	abdominals: 'Bauchmuskeln',
	'anterior deltoids': 'Vordere Deltamuskeln',
	biceps: 'Bizeps',
	brachioradialis: 'Oberarmspeichenmuskel',
	calves: 'Waden',
	'cardiovascular system': 'Herz-Kreislauf-System',
	'erector spinae': 'Rückenstrecker',
	forearms: 'Unterarme',
	glutes: 'Gesäss',
	grip: 'Griffkraft',
	hamstrings: 'Beinbeuger',
	'hip flexors': 'Hüftbeuger',
	'lateral deltoids': 'Seitliche Deltamuskeln',
	lats: 'Latissimus',
	obliques: 'Schräge Bauchmuskeln',
	pectorals: 'Brustmuskel',
	quadriceps: 'Quadrizeps',
	'rear deltoids': 'Hintere Deltamuskeln',
	rhomboids: 'Rautenmuskeln',
	'rotator cuff': 'Rotatorenmanschette',
	traps: 'Trapezmuskel',
	triceps: 'Trizeps',
};

export function translateTerm(term: string, lang: 'en' | 'de'): string {
	if (lang === 'en') return term;
	return termsDe[term] ?? term;
}

export interface LocalizedExercise extends Exercise {
	localName: string;
	localBodyPart: string;
	localEquipment: string;
	localTarget: string;
	localSecondaryMuscles: string[];
	localInstructions: string[];
}

export function localizeExercise(e: Exercise, lang: 'en' | 'de'): LocalizedExercise {
	return {
		...e,
		localName: lang === 'de' && e.de ? e.de.name : e.name,
		localBodyPart: translateTerm(e.bodyPart, lang),
		localEquipment: translateTerm(e.equipment, lang),
		localTarget: translateTerm(e.target, lang),
		localSecondaryMuscles: e.secondaryMuscles.map(m => translateTerm(m, lang)),
		localInstructions: lang === 'de' && e.de ? e.de.instructions : e.instructions,
	};
}

export function getExerciseMetrics(exercise: Exercise | undefined): MetricField[] {
	if (exercise?.metrics) return exercise.metrics;
	if (exercise?.bodyPart === 'cardio') return METRIC_PRESETS.cardio;
	return METRIC_PRESETS.strength;
}

export const exercises: Exercise[] = [
	// === CHEST ===
	{
		id: 'bench-press-barbell',
		name: 'Bench Press (Barbell)',
		bodyPart: 'chest',
		equipment: 'barbell',
		target: 'pectorals',
		secondaryMuscles: ['triceps', 'anterior deltoids'],
		instructions: [
			'Lie flat on the bench holding the barbell with a shoulder-width pronated grip.',
			'Retract scapula and have elbows between 45 to 90 degree angle.',
			'Lower the bar to mid-chest level.',
			'Press the bar back up to the starting position, fully extending the arms.'
		]
	,
		de: {
			name: 'Bankdrücken (Langhantel)',
			instructions: [
			'Flach auf die Bank legen und die Langhantel mit schulterbreitem Obergriff greifen.',
			'Schulterblätter zusammenziehen, Ellbogen in einem 45- bis 90-Grad-Winkel halten.',
			'Die Stange bis zur Brustmitte absenken.',
			'Die Stange zurück in die Ausgangsposition drücken und die Arme vollständig strecken.'
			]
		}},
	{
		id: 'incline-bench-press-barbell',
		name: 'Incline Bench Press (Barbell)',
		bodyPart: 'chest',
		equipment: 'barbell',
		target: 'pectorals',
		secondaryMuscles: ['triceps', 'anterior deltoids'],
		instructions: [
			'Set the bench to a 30-45 degree incline.',
			'Lie back and grip the barbell slightly wider than shoulder width.',
			'Lower the bar to the upper chest.',
			'Press back up to full extension.'
		]
	,
		de: {
			name: 'Schrägbankdrücken (Langhantel)',
			instructions: [
			'Die Bank auf 30-45 Grad Neigung einstellen.',
			'Zurücklehnen und die Langhantel etwas breiter als schulterbreit greifen.',
			'Die Stange zur oberen Brust absenken.',
			'Zurück in die volle Streckung drücken.'
			]
		}},
	{
		id: 'decline-bench-press-barbell',
		name: 'Decline Bench Press (Barbell)',
		bodyPart: 'chest',
		equipment: 'barbell',
		target: 'pectorals',
		secondaryMuscles: ['triceps', 'anterior deltoids'],
		instructions: [
			'Set the bench to a decline angle and secure your legs.',
			'Grip the barbell slightly wider than shoulder width.',
			'Lower the bar to the lower chest.',
			'Press back up to full extension.'
		]
	,
		de: {
			name: 'Negativ-Bankdrücken (Langhantel)',
			instructions: [
			'Die Bank in eine negative Neigung bringen und die Beine sichern.',
			'Die Langhantel etwas breiter als schulterbreit greifen.',
			'Die Stange zur unteren Brust absenken.',
			'Zurück in die volle Streckung drücken.'
			]
		}},
	{
		id: 'bench-press-close-grip-barbell',
		name: 'Bench Press - Close Grip (Barbell)',
		bodyPart: 'arms',
		equipment: 'barbell',
		target: 'triceps',
		secondaryMuscles: ['pectorals', 'anterior deltoids'],
		instructions: [
			'Lie flat on the bench and grip the barbell with hands shoulder-width apart or slightly narrower.',
			'Lower the bar to the lower chest, keeping elbows close to the body.',
			'Press the bar back up to full extension.'
		]
	,
		de: {
			name: 'Enges Bankdrücken (Langhantel)',
			instructions: [
			'Flach auf die Bank legen und die Langhantel schulterbreit oder etwas enger greifen.',
			'Die Stange zur unteren Brust absenken, Ellbogen nah am Körper halten.',
			'Die Stange zurück in die volle Streckung drücken.'
			]
		}},
	{
		id: 'bench-press-dumbbell',
		name: 'Bench Press (Dumbbell)',
		bodyPart: 'chest',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'pectorals',
		secondaryMuscles: ['triceps', 'anterior deltoids'],
		instructions: [
			'Lie flat on the bench holding a dumbbell in each hand at chest level.',
			'Press the dumbbells up until arms are fully extended.',
			'Lower the dumbbells back to chest level with control.'
		]
	,
		de: {
			name: 'Bankdrücken (Kurzhantel)',
			instructions: [
			'Flach auf die Bank legen, je eine Kurzhantel auf Brusthöhe halten.',
			'Die Kurzhanteln nach oben drücken, bis die Arme vollständig gestreckt sind.',
			'Die Kurzhanteln kontrolliert zurück auf Brusthöhe senken.'
			]
		}},
	{
		id: 'incline-bench-press-dumbbell',
		name: 'Incline Bench Press (Dumbbell)',
		bodyPart: 'chest',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'pectorals',
		secondaryMuscles: ['triceps', 'anterior deltoids'],
		instructions: [
			'Set the bench to a 30-45 degree incline.',
			'Hold a dumbbell in each hand at chest level.',
			'Press the dumbbells up until arms are fully extended.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Schrägbankdrücken (Kurzhantel)',
			instructions: [
			'Die Bank auf 30-45 Grad Neigung einstellen.',
			'Je eine Kurzhantel auf Brusthöhe halten.',
			'Die Kurzhanteln nach oben drücken, bis die Arme vollständig gestreckt sind.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'chest-fly-dumbbell',
		name: 'Chest Fly (Dumbbell)',
		bodyPart: 'chest',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'pectorals',
		secondaryMuscles: ['anterior deltoids'],
		instructions: [
			'Lie flat on the bench holding dumbbells above your chest with arms slightly bent.',
			'Lower the dumbbells out to the sides in a wide arc.',
			'Bring the dumbbells back together above your chest.'
		]
	,
		de: {
			name: 'Fliegende (Kurzhantel)',
			instructions: [
			'Flach auf die Bank legen und Kurzhanteln mit leicht gebeugten Armen über der Brust halten.',
			'Die Kurzhanteln in einem weiten Bogen zur Seite absenken.',
			'Die Kurzhanteln wieder über der Brust zusammenführen.'
			]
		}},
	{
		id: 'chest-dip',
		name: 'Chest Dip',
		bodyPart: 'chest',
		equipment: 'body weight',
		target: 'pectorals',
		secondaryMuscles: ['triceps', 'anterior deltoids'],
		instructions: [
			'Grip the parallel bars and lift yourself up.',
			'Lean forward slightly and lower your body by bending the elbows.',
			'Lower until you feel a stretch in the chest.',
			'Push back up to the starting position.'
		]
	,
		de: {
			name: 'Dips (Brust)',
			instructions: [
			'Die Parallelbarren greifen und sich hochdrücken.',
			'Leicht nach vorne lehnen und den Körper durch Beugen der Ellbogen absenken.',
			'Absenken, bis eine Dehnung in der Brust spürbar ist.',
			'Zurück in die Ausgangsposition drücken.'
			]
		}},
	{
		id: 'push-up',
		name: 'Push Up',
		bodyPart: 'chest',
		equipment: 'body weight',
		target: 'pectorals',
		secondaryMuscles: ['triceps', 'anterior deltoids', 'core'],
		instructions: [
			'Start in a plank position with hands slightly wider than shoulder width.',
			'Lower your body until your chest nearly touches the floor.',
			'Push back up to the starting position.'
		]
	,
		de: {
			name: 'Liegestütz',
			instructions: [
			'In einer Plank-Position starten, Hände etwas breiter als schulterbreit.',
			'Den Körper absenken, bis die Brust fast den Boden berührt.',
			'Zurück in die Ausgangsposition drücken.'
			]
		}},
	{
		id: 'cable-crossover',
		name: 'Cable Crossover',
		bodyPart: 'chest',
		equipment: 'cable',
		target: 'pectorals',
		secondaryMuscles: ['anterior deltoids'],
		instructions: [
			'Set both pulleys to the highest position and grip the handles.',
			'Step forward and bring the handles together in front of your chest in a hugging motion.',
			'Slowly return to the starting position.'
		]
	,
		de: {
			name: 'Kabelzug-Crossover',
			instructions: [
			'Beide Kabelzüge auf die höchste Position einstellen und die Griffe fassen.',
			'Einen Schritt nach vorne machen und die Griffe in einer Umarmungsbewegung vor der Brust zusammenführen.',
			'Langsam in die Ausgangsposition zurückkehren.'
			]
		}},

	// === BACK ===
	{
		id: 'bent-over-row-barbell',
		name: 'Bent Over Row (Barbell)',
		bodyPart: 'back',
		equipment: 'barbell',
		target: 'lats',
		secondaryMuscles: ['rhomboids', 'biceps', 'rear deltoids'],
		instructions: [
			'Stand with feet shoulder-width apart, bend at the hips with a slight knee bend.',
			'Grip the barbell with an overhand grip, hands slightly wider than shoulder width.',
			'Pull the bar towards your lower chest/upper abdomen.',
			'Lower the bar back down with control.'
		]
	,
		de: {
			name: 'Vorgebeugtes Rudern (Langhantel)',
			instructions: [
			'Schulterbreit stehen, in der Hüfte beugen mit leichter Kniebeugung.',
			'Die Langhantel im Obergriff etwas breiter als schulterbreit greifen.',
			'Die Stange zum unteren Brustkorb/oberen Bauch ziehen.',
			'Die Stange kontrolliert absenken.'
			]
		}},
	{
		id: 'deadlift-barbell',
		name: 'Deadlift (Barbell)',
		bodyPart: 'back',
		equipment: 'barbell',
		target: 'erector spinae',
		secondaryMuscles: ['glutes', 'hamstrings', 'lats', 'traps'],
		instructions: [
			'Stand with feet hip-width apart, barbell over mid-foot.',
			'Bend at hips and knees, grip the bar just outside your knees.',
			'Keep your back flat, chest up, and drive through your heels to stand up.',
			'Lower the bar back to the floor with control.'
		]
	,
		de: {
			name: 'Kreuzheben (Langhantel)',
			instructions: [
			'Hüftbreit stehen, Langhantel über der Fussmitte.',
			'In Hüfte und Knien beugen, die Stange knapp ausserhalb der Knie greifen.',
			'Rücken gerade halten, Brust raus, durch die Fersen nach oben drücken.',
			'Die Stange kontrolliert zurück zum Boden senken.'
			]
		}},
	{
		id: 'pull-up',
		name: 'Pull Up',
		bodyPart: 'back',
		equipment: 'body weight',
		target: 'lats',
		secondaryMuscles: ['biceps', 'rhomboids', 'rear deltoids'],
		instructions: [
			'Hang from a pull-up bar with an overhand grip, hands slightly wider than shoulder width.',
			'Pull yourself up until your chin is above the bar.',
			'Lower yourself back down with control.'
		]
	,
		de: {
			name: 'Klimmzug',
			instructions: [
			'An einer Klimmzugstange mit Obergriff hängen, Hände etwas breiter als schulterbreit.',
			'Sich hochziehen, bis das Kinn über der Stange ist.',
			'Kontrolliert wieder absenken.'
			]
		}},
	{
		id: 'chin-up',
		name: 'Chin Up',
		bodyPart: 'back',
		equipment: 'body weight',
		target: 'lats',
		secondaryMuscles: ['biceps', 'rhomboids'],
		instructions: [
			'Hang from a pull-up bar with an underhand (supinated) grip, hands shoulder-width apart.',
			'Pull yourself up until your chin is above the bar.',
			'Lower yourself back down with control.'
		]
	,
		de: {
			name: 'Klimmzug (Untergriff)',
			instructions: [
			'An einer Klimmzugstange im Untergriff hängen, Hände schulterbreit.',
			'Sich hochziehen, bis das Kinn über der Stange ist.',
			'Kontrolliert wieder absenken.'
			]
		}},
	{
		id: 'lat-pulldown-cable',
		name: 'Lat Pulldown (Cable)',
		bodyPart: 'back',
		equipment: 'cable',
		target: 'lats',
		secondaryMuscles: ['biceps', 'rhomboids', 'rear deltoids'],
		instructions: [
			'Sit at the lat pulldown machine and grip the bar wider than shoulder width.',
			'Pull the bar down to your upper chest.',
			'Slowly return the bar to the starting position.'
		]
	,
		de: {
			name: 'Latzug (Kabelzug)',
			instructions: [
			'An der Latzugmaschine sitzen und die Stange breiter als schulterbreit greifen.',
			'Die Stange zur oberen Brust ziehen.',
			'Die Stange langsam zurück in die Ausgangsposition führen.'
			]
		}},
	{
		id: 'seated-row-cable',
		name: 'Seated Row (Cable)',
		bodyPart: 'back',
		equipment: 'cable',
		target: 'lats',
		secondaryMuscles: ['rhomboids', 'biceps', 'rear deltoids'],
		instructions: [
			'Sit at the cable row machine with feet on the platform.',
			'Grip the handle and pull it towards your abdomen.',
			'Squeeze your shoulder blades together at the end of the movement.',
			'Slowly return to the starting position.'
		]
	,
		de: {
			name: 'Sitzendes Rudern (Kabelzug)',
			instructions: [
			'An der Kabelruder-Maschine sitzen, Füsse auf der Plattform.',
			'Den Griff fassen und zum Bauch ziehen.',
			'Die Schulterblätter am Ende der Bewegung zusammendrücken.',
			'Langsam in die Ausgangsposition zurückkehren.'
			]
		}},
	{
		id: 'dumbbell-row',
		name: 'Dumbbell Row',
		bodyPart: 'back',
		equipment: 'dumbbell',
		target: 'lats',
		secondaryMuscles: ['rhomboids', 'biceps', 'rear deltoids'],
		instructions: [
			'Place one knee and hand on a bench, holding a dumbbell in the other hand.',
			'Pull the dumbbell up to your hip, keeping the elbow close to your body.',
			'Lower the dumbbell back down with control.'
		]
	,
		de: {
			name: 'Kurzhantel-Rudern',
			instructions: [
			'Ein Knie und eine Hand auf eine Bank stützen, in der anderen Hand eine Kurzhantel halten.',
			'Die Kurzhantel zur Hüfte ziehen, Ellbogen nah am Körper.',
			'Die Kurzhantel kontrolliert absenken.'
			]
		}},
	{
		id: 't-bar-row',
		name: 'T-Bar Row',
		bodyPart: 'back',
		equipment: 'barbell',
		target: 'lats',
		secondaryMuscles: ['rhomboids', 'biceps', 'rear deltoids', 'traps'],
		instructions: [
			'Straddle the T-bar row machine or landmine attachment.',
			'Bend at the hips and grip the handle.',
			'Pull the weight towards your chest.',
			'Lower with control.'
		]
	,
		de: {
			name: 'T-Bar-Rudern',
			instructions: [
			'Über der T-Bar-Rudermaschine oder Landmine stehen.',
			'In der Hüfte beugen und den Griff fassen.',
			'Das Gewicht zur Brust ziehen.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'incline-row-dumbbell',
		name: 'Incline Row (Dumbbell)',
		bodyPart: 'back',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'lats',
		secondaryMuscles: ['rhomboids', 'biceps', 'rear deltoids'],
		instructions: [
			'Lie face down on an incline bench set to about 30-45 degrees.',
			'Hold a dumbbell in each hand with arms hanging straight down.',
			'Row the dumbbells up to your sides, squeezing your shoulder blades together.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Schrägbank-Rudern (Kurzhantel)',
			instructions: [
			'Bäuchlings auf eine 30-45 Grad geneigte Schrägbank legen.',
			'Je eine Kurzhantel mit herabhängenden Armen halten.',
			'Die Kurzhanteln zu den Seiten rudern und die Schulterblätter zusammendrücken.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'face-pull-cable',
		name: 'Face Pull (Cable)',
		bodyPart: 'back',
		equipment: 'cable',
		target: 'rear deltoids',
		secondaryMuscles: ['rhomboids', 'traps', 'rotator cuff'],
		instructions: [
			'Set the cable to upper chest height with a rope attachment.',
			'Pull the rope towards your face, separating the ends.',
			'Squeeze your shoulder blades and externally rotate at the end.',
			'Slowly return to the starting position.'
		]
	,
		de: {
			name: 'Face Pull (Kabelzug)',
			instructions: [
			'Den Kabelzug auf obere Brusthöhe mit einem Seilaufsatz einstellen.',
			'Das Seil zum Gesicht ziehen und die Enden auseinanderführen.',
			'Die Schulterblätter zusammendrücken und am Ende aussenrotieren.',
			'Langsam in die Ausgangsposition zurückkehren.'
			]
		}},

	// === SHOULDERS ===
	{
		id: 'overhead-press-barbell',
		name: 'Overhead Press (Barbell)',
		bodyPart: 'shoulders',
		equipment: 'barbell',
		target: 'anterior deltoids',
		secondaryMuscles: ['triceps', 'lateral deltoids', 'traps'],
		instructions: [
			'Stand with feet shoulder-width apart, barbell at shoulder height.',
			'Press the bar overhead until arms are fully extended.',
			'Lower the bar back to shoulder height with control.'
		]
	,
		de: {
			name: 'Schulterdrücken (Langhantel)',
			instructions: [
			'Schulterbreit stehen, Langhantel auf Schulterhöhe.',
			'Die Stange über den Kopf drücken, bis die Arme vollständig gestreckt sind.',
			'Die Stange kontrolliert auf Schulterhöhe absenken.'
			]
		}},
	{
		id: 'overhead-press-dumbbell',
		name: 'Overhead Press (Dumbbell)',
		bodyPart: 'shoulders',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'anterior deltoids',
		secondaryMuscles: ['triceps', 'lateral deltoids', 'traps'],
		instructions: [
			'Sit or stand holding dumbbells at shoulder height.',
			'Press the dumbbells overhead until arms are fully extended.',
			'Lower the dumbbells back to shoulder height with control.'
		]
	,
		de: {
			name: 'Schulterdrücken (Kurzhantel)',
			instructions: [
			'Sitzend oder stehend Kurzhanteln auf Schulterhöhe halten.',
			'Die Kurzhanteln über den Kopf drücken, bis die Arme vollständig gestreckt sind.',
			'Die Kurzhanteln kontrolliert auf Schulterhöhe absenken.'
			]
		}},
	{
		id: 'lateral-raise-dumbbell',
		name: 'Lateral Raise (Dumbbell)',
		bodyPart: 'shoulders',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'lateral deltoids',
		secondaryMuscles: ['traps'],
		instructions: [
			'Stand with dumbbells at your sides.',
			'Raise the dumbbells out to the sides until arms are parallel to the floor.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Seitheben (Kurzhantel)',
			instructions: [
			'Mit Kurzhanteln an den Seiten stehen.',
			'Die Kurzhanteln seitlich anheben, bis die Arme parallel zum Boden sind.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'lateral-raise-cable',
		name: 'Lateral Raise (Cable)',
		bodyPart: 'shoulders',
		equipment: 'cable',
		target: 'lateral deltoids',
		secondaryMuscles: ['traps'],
		instructions: [
			'Stand sideways to a low cable pulley, gripping the handle with the far hand.',
			'Raise your arm out to the side until parallel to the floor.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Seitheben (Kabelzug)',
			instructions: [
			'Seitlich zu einem tiefen Kabelzug stehen, den Griff mit der entfernten Hand fassen.',
			'Den Arm seitlich anheben, bis er parallel zum Boden ist.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'front-raise-dumbbell',
		name: 'Front Raise (Dumbbell)',
		bodyPart: 'shoulders',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'anterior deltoids',
		secondaryMuscles: ['lateral deltoids'],
		instructions: [
			'Stand with dumbbells in front of your thighs.',
			'Raise one or both dumbbells to the front until arms are parallel to the floor.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Frontheben (Kurzhantel)',
			instructions: [
			'Mit Kurzhanteln vor den Oberschenkeln stehen.',
			'Eine oder beide Kurzhanteln nach vorne anheben, bis die Arme parallel zum Boden sind.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'reverse-fly-dumbbell',
		name: 'Reverse Fly (Dumbbell)',
		bodyPart: 'shoulders',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'rear deltoids',
		secondaryMuscles: ['rhomboids', 'traps'],
		instructions: [
			'Bend forward at the hips holding dumbbells.',
			'Raise the dumbbells out to the sides, squeezing shoulder blades together.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Reverse Flys (Kurzhantel)',
			instructions: [
			'In der Hüfte nach vorne beugen und Kurzhanteln halten.',
			'Die Kurzhanteln seitlich anheben und die Schulterblätter zusammendrücken.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'upright-row-barbell',
		name: 'Upright Row (Barbell)',
		bodyPart: 'shoulders',
		equipment: 'barbell',
		target: 'lateral deltoids',
		secondaryMuscles: ['traps', 'biceps'],
		instructions: [
			'Stand holding a barbell with a narrow grip in front of your thighs.',
			'Pull the bar up along your body to chin height, leading with the elbows.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Aufrechtes Rudern (Langhantel)',
			instructions: [
			'Mit engem Griff eine Langhantel vor den Oberschenkeln halten.',
			'Die Stange am Körper entlang bis zum Kinn hochziehen, Ellbogen führen.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'shrug-barbell',
		name: 'Shrug (Barbell)',
		bodyPart: 'shoulders',
		equipment: 'barbell',
		target: 'traps',
		secondaryMuscles: [],
		instructions: [
			'Stand holding a barbell with arms extended.',
			'Shrug your shoulders straight up towards your ears.',
			'Hold briefly at the top, then lower with control.'
		]
	,
		de: {
			name: 'Schulterheben (Langhantel)',
			instructions: [
			'Stehend eine Langhantel mit gestreckten Armen halten.',
			'Die Schultern gerade nach oben zu den Ohren ziehen.',
			'Kurz oben halten, dann kontrolliert absenken.'
			]
		}},
	{
		id: 'shrug-dumbbell',
		name: 'Shrug (Dumbbell)',
		bodyPart: 'shoulders',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'traps',
		secondaryMuscles: [],
		instructions: [
			'Stand holding dumbbells at your sides.',
			'Shrug your shoulders straight up towards your ears.',
			'Hold briefly at the top, then lower with control.'
		]
	,
		de: {
			name: 'Schulterheben (Kurzhantel)',
			instructions: [
			'Stehend Kurzhanteln an den Seiten halten.',
			'Die Schultern gerade nach oben zu den Ohren ziehen.',
			'Kurz oben halten, dann kontrolliert absenken.'
			]
		}},

	// === ARMS — BICEPS ===
	{
		id: 'bicep-curl-barbell',
		name: 'Bicep Curl (Barbell)',
		bodyPart: 'arms',
		equipment: 'barbell',
		target: 'biceps',
		secondaryMuscles: ['forearms'],
		instructions: [
			'Stand holding a barbell with an underhand grip, arms extended.',
			'Curl the bar up towards your shoulders.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Bizepscurl (Langhantel)',
			instructions: [
			'Stehend eine Langhantel im Untergriff mit gestreckten Armen halten.',
			'Die Stange zu den Schultern curlen.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'bicep-curl-dumbbell',
		name: 'Bicep Curl (Dumbbell)',
		bodyPart: 'arms',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'biceps',
		secondaryMuscles: ['forearms'],
		instructions: [
			'Stand holding dumbbells at your sides with palms facing forward.',
			'Curl the dumbbells up towards your shoulders.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Bizepscurl (Kurzhantel)',
			instructions: [
			'Stehend Kurzhanteln an den Seiten halten, Handflächen nach vorne.',
			'Die Kurzhanteln zu den Schultern curlen.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'hammer-curl-dumbbell',
		name: 'Hammer Curl (Dumbbell)',
		bodyPart: 'arms',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'biceps',
		secondaryMuscles: ['brachioradialis', 'forearms'],
		instructions: [
			'Stand holding dumbbells at your sides with palms facing each other (neutral grip).',
			'Curl the dumbbells up towards your shoulders.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Hammercurl (Kurzhantel)',
			instructions: [
			'Stehend Kurzhanteln an den Seiten halten, Handflächen zueinander (Neutralgriff).',
			'Die Kurzhanteln zu den Schultern curlen.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'preacher-curl-barbell',
		name: 'Preacher Curl (Barbell)',
		bodyPart: 'arms',
		equipment: 'barbell',
		target: 'biceps',
		secondaryMuscles: ['forearms'],
		instructions: [
			'Sit at a preacher bench with upper arms resting on the pad.',
			'Grip the barbell with an underhand grip.',
			'Curl the bar up, then lower with control.'
		]
	,
		de: {
			name: 'Preacher Curl (Langhantel)',
			instructions: [
			'An einer Preacher-Curl-Bank sitzen, Oberarme auf dem Polster.',
			'Die Langhantel im Untergriff greifen.',
			'Die Stange nach oben curlen, dann kontrolliert absenken.'
			]
		}},
	{
		id: 'concentration-curl-dumbbell',
		name: 'Concentration Curl (Dumbbell)',
		bodyPart: 'arms',
		equipment: 'dumbbell',
		target: 'biceps',
		secondaryMuscles: [],
		instructions: [
			'Sit on a bench, rest your elbow against the inside of your thigh.',
			'Curl the dumbbell up towards your shoulder.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Konzentrationscurl (Kurzhantel)',
			instructions: [
			'Auf einer Bank sitzen, den Ellbogen an die Innenseite des Oberschenkels stützen.',
			'Die Kurzhantel zur Schulter curlen.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'cable-curl',
		name: 'Cable Curl',
		bodyPart: 'arms',
		equipment: 'cable',
		target: 'biceps',
		secondaryMuscles: ['forearms'],
		instructions: [
			'Stand facing a low cable pulley with a straight or EZ-bar attachment.',
			'Curl the bar up towards your shoulders.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Kabelcurl',
			instructions: [
			'Vor einem tiefen Kabelzug mit Stangen- oder SZ-Stangen-Aufsatz stehen.',
			'Die Stange zu den Schultern curlen.',
			'Kontrolliert absenken.'
			]
		}},

	// === ARMS — TRICEPS ===
	{
		id: 'tricep-pushdown-cable',
		name: 'Tricep Pushdown (Cable)',
		bodyPart: 'arms',
		equipment: 'cable',
		target: 'triceps',
		secondaryMuscles: [],
		instructions: [
			'Stand facing a high cable pulley with a straight bar or rope attachment.',
			'Push the bar down until arms are fully extended.',
			'Slowly return to the starting position.'
		]
	,
		de: {
			name: 'Trizepsdrücken (Kabelzug)',
			instructions: [
			'Vor einem hohen Kabelzug mit Stangen- oder Seilaufsatz stehen.',
			'Die Stange nach unten drücken, bis die Arme vollständig gestreckt sind.',
			'Langsam in die Ausgangsposition zurückkehren.'
			]
		}},
	{
		id: 'skullcrusher-dumbbell',
		name: 'Skullcrusher (Dumbbell)',
		bodyPart: 'arms',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'triceps',
		secondaryMuscles: [],
		instructions: [
			'Lie flat on a bench holding dumbbells with arms extended above your chest.',
			'Lower the dumbbells towards your forehead by bending at the elbows.',
			'Extend the arms back to the starting position.'
		]
	,
		de: {
			name: 'Stirndrücken (Kurzhantel)',
			instructions: [
			'Flach auf einer Bank liegen, Kurzhanteln mit gestreckten Armen über der Brust halten.',
			'Die Kurzhanteln durch Beugen der Ellbogen zur Stirn absenken.',
			'Die Arme zurück in die Ausgangsposition strecken.'
			]
		}},
	{
		id: 'skullcrusher-barbell',
		name: 'Skullcrusher (Barbell)',
		bodyPart: 'arms',
		equipment: 'barbell',
		target: 'triceps',
		secondaryMuscles: [],
		instructions: [
			'Lie flat on a bench holding a barbell with arms extended above your chest.',
			'Lower the bar towards your forehead by bending at the elbows.',
			'Extend the arms back to the starting position.'
		]
	,
		de: {
			name: 'Stirndrücken (Langhantel)',
			instructions: [
			'Flach auf einer Bank liegen, Langhantel mit gestreckten Armen über der Brust halten.',
			'Die Stange durch Beugen der Ellbogen zur Stirn absenken.',
			'Die Arme zurück in die Ausgangsposition strecken.'
			]
		}},
	{
		id: 'overhead-tricep-extension-dumbbell',
		name: 'Overhead Tricep Extension (Dumbbell)',
		bodyPart: 'arms',
		equipment: 'dumbbell',
		target: 'triceps',
		secondaryMuscles: [],
		instructions: [
			'Hold a dumbbell overhead with both hands.',
			'Lower the dumbbell behind your head by bending at the elbows.',
			'Extend back to the starting position.'
		]
	,
		de: {
			name: 'Trizepsdrücken über Kopf (Kurzhantel)',
			instructions: [
			'Eine Kurzhantel mit beiden Händen über dem Kopf halten.',
			'Die Kurzhantel durch Beugen der Ellbogen hinter den Kopf absenken.',
			'Zurück in die Ausgangsposition strecken.'
			]
		}},
	{
		id: 'tricep-dip',
		name: 'Tricep Dip',
		bodyPart: 'arms',
		equipment: 'body weight',
		target: 'triceps',
		secondaryMuscles: ['pectorals', 'anterior deltoids'],
		instructions: [
			'Grip the parallel bars and lift yourself up, keeping torso upright.',
			'Lower your body by bending the elbows, keeping them close to your body.',
			'Push back up to the starting position.'
		]
	,
		de: {
			name: 'Dips (Trizeps)',
			instructions: [
			'Die Parallelbarren greifen und sich hochdrücken, Oberkörper aufrecht halten.',
			'Den Körper durch Beugen der Ellbogen absenken, Ellbogen nah am Körper.',
			'Zurück in die Ausgangsposition drücken.'
			]
		}},
	{
		id: 'kickback-dumbbell',
		name: 'Kickback (Dumbbell)',
		bodyPart: 'arms',
		equipment: 'dumbbell',
		target: 'triceps',
		secondaryMuscles: [],
		instructions: [
			'Bend forward at the hips, upper arm parallel to the floor.',
			'Extend the dumbbell backwards until the arm is straight.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Kickback (Kurzhantel)',
			instructions: [
			'In der Hüfte nach vorne beugen, Oberarm parallel zum Boden.',
			'Die Kurzhantel nach hinten strecken, bis der Arm gerade ist.',
			'Kontrolliert absenken.'
			]
		}},

	// === LEGS ===
	{
		id: 'squat-barbell',
		name: 'Squat (Barbell)',
		bodyPart: 'legs',
		equipment: 'barbell',
		target: 'quadriceps',
		secondaryMuscles: ['glutes', 'hamstrings', 'core'],
		instructions: [
			'Position the barbell on your upper back (high bar) or rear deltoids (low bar).',
			'Stand with feet shoulder-width apart.',
			'Squat down until thighs are at least parallel to the floor.',
			'Drive through your heels to stand back up.'
		],
		imageUrl: "/fitness/squat-barbell/0.svg"

	,
		de: {
			name: 'Kniebeuge (Langhantel)',
			instructions: [
			'Die Langhantel auf dem oberen Rücken (High Bar) oder hinteren Deltamuskel (Low Bar) positionieren.',
			'Schulterbreit stehen.',
			'In die Hocke gehen, bis die Oberschenkel mindestens parallel zum Boden sind.',
			'Durch die Fersen nach oben drücken.'
			]
		}},
	{
		id: 'front-squat-barbell',
		name: 'Front Squat (Barbell)',
		bodyPart: 'legs',
		equipment: 'barbell',
		target: 'quadriceps',
		secondaryMuscles: ['glutes', 'core'],
		instructions: [
			'Position the barbell across the front of your shoulders.',
			'Squat down, keeping the elbows high and torso upright.',
			'Drive through your heels to stand back up.'
		]
	,
		de: {
			name: 'Frontkniebeuge (Langhantel)',
			instructions: [
			'Die Langhantel vorne auf den Schultern positionieren.',
			'In die Hocke gehen, Ellbogen hoch und Oberkörper aufrecht halten.',
			'Durch die Fersen nach oben drücken.'
			]
		}},
	{
		id: 'leg-press-machine',
		name: 'Leg Press (Machine)',
		bodyPart: 'legs',
		equipment: 'machine',
		target: 'quadriceps',
		secondaryMuscles: ['glutes', 'hamstrings'],
		instructions: [
			'Sit in the leg press machine with feet shoulder-width apart on the platform.',
			'Lower the platform by bending your knees to about 90 degrees.',
			'Push the platform back up without locking your knees.'
		]
	,
		de: {
			name: 'Beinpresse (Maschine)',
			instructions: [
			'In der Beinpresse sitzen, Füsse schulterbreit auf der Plattform.',
			'Die Plattform absenken, indem die Knie auf etwa 90 Grad gebeugt werden.',
			'Die Plattform zurückdrücken, ohne die Knie durchzustrecken.'
			]
		}},
	{
		id: 'lunge-dumbbell',
		name: 'Lunge (Dumbbell)',
		bodyPart: 'legs',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'quadriceps',
		secondaryMuscles: ['glutes', 'hamstrings'],
		instructions: [
			'Stand holding dumbbells at your sides.',
			'Step forward and lower your body until both knees are at 90 degrees.',
			'Push back to the starting position.'
		]
	,
		de: {
			name: 'Ausfallschritt (Kurzhantel)',
			instructions: [
			'Stehend Kurzhanteln an den Seiten halten.',
			'Einen Schritt nach vorne machen und den Körper absenken, bis beide Knie 90 Grad gebeugt sind.',
			'Zurück in die Ausgangsposition drücken.'
			]
		}},
	{
		id: 'bulgarian-split-squat-dumbbell',
		name: 'Bulgarian Split Squat (Dumbbell)',
		bodyPart: 'legs',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'quadriceps',
		secondaryMuscles: ['glutes', 'hamstrings'],
		instructions: [
			'Stand with one foot on a bench behind you, holding dumbbells.',
			'Lower your body until the front thigh is parallel to the floor.',
			'Drive through the front heel to stand back up.'
		]
	,
		de: {
			name: 'Bulgarische Kniebeuge (Kurzhantel)',
			instructions: [
			'Mit einem Fuss auf einer Bank hinter sich stehen, Kurzhanteln halten.',
			'Den Körper absenken, bis der vordere Oberschenkel parallel zum Boden ist.',
			'Durch die vordere Ferse nach oben drücken.'
			]
		}},
	{
		id: 'leg-extension-machine',
		name: 'Leg Extension (Machine)',
		bodyPart: 'legs',
		equipment: 'machine',
		target: 'quadriceps',
		secondaryMuscles: [],
		instructions: [
			'Sit in the leg extension machine with the pad against your lower shins.',
			'Extend your legs until they are straight.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Beinstrecker (Maschine)',
			instructions: [
			'In der Beinstrecker-Maschine sitzen, Polster gegen die unteren Schienbeine.',
			'Die Beine strecken, bis sie gerade sind.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'leg-curl-machine',
		name: 'Leg Curl (Machine)',
		bodyPart: 'legs',
		equipment: 'machine',
		target: 'hamstrings',
		secondaryMuscles: ['calves'],
		instructions: [
			'Lie face down on the leg curl machine with the pad against the back of your ankles.',
			'Curl your legs up towards your glutes.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Beinbeuger (Maschine)',
			instructions: [
			'Bäuchlings auf die Beinbeuger-Maschine legen, Polster gegen die Rückseite der Knöchel.',
			'Die Beine zum Gesäss beugen.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'romanian-deadlift-barbell',
		name: 'Romanian Deadlift (Barbell)',
		bodyPart: 'legs',
		equipment: 'barbell',
		target: 'hamstrings',
		secondaryMuscles: ['glutes', 'erector spinae'],
		instructions: [
			'Stand holding a barbell with an overhand grip.',
			'Hinge at the hips, pushing them back while keeping legs nearly straight.',
			'Lower the bar along your legs until you feel a stretch in the hamstrings.',
			'Drive the hips forward to return to standing.'
		]
	,
		de: {
			name: 'Rumänisches Kreuzheben (Langhantel)',
			instructions: [
			'Stehend eine Langhantel im Obergriff halten.',
			'In der Hüfte beugen, das Gesäss nach hinten schieben, Beine fast gestreckt lassen.',
			'Die Stange an den Beinen entlang absenken, bis eine Dehnung in den Beinbeugern spürbar ist.',
			'Die Hüfte nach vorne drücken, um wieder aufzustehen.'
			]
		}},
	{
		id: 'romanian-deadlift-dumbbell',
		name: 'Romanian Deadlift (Dumbbell)',
		bodyPart: 'legs',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'hamstrings',
		secondaryMuscles: ['glutes', 'erector spinae'],
		instructions: [
			'Stand holding dumbbells in front of your thighs.',
			'Hinge at the hips, pushing them back while keeping legs nearly straight.',
			'Lower the dumbbells along your legs until you feel a stretch in the hamstrings.',
			'Drive the hips forward to return to standing.'
		]
	,
		de: {
			name: 'Rumänisches Kreuzheben (Kurzhantel)',
			instructions: [
			'Stehend Kurzhanteln vor den Oberschenkeln halten.',
			'In der Hüfte beugen, das Gesäss nach hinten schieben, Beine fast gestreckt lassen.',
			'Die Kurzhanteln an den Beinen entlang absenken, bis eine Dehnung in den Beinbeugern spürbar ist.',
			'Die Hüfte nach vorne drücken, um wieder aufzustehen.'
			]
		}},
	{
		id: 'hip-thrust-barbell',
		name: 'Hip Thrust (Barbell)',
		bodyPart: 'legs',
		equipment: 'barbell',
		target: 'glutes',
		secondaryMuscles: ['hamstrings'],
		instructions: [
			'Sit on the floor with your upper back against a bench, barbell over your hips.',
			'Drive through your heels to lift your hips until your body forms a straight line.',
			'Squeeze your glutes at the top.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Hip Thrust (Langhantel)',
			instructions: [
			'Auf dem Boden sitzen, oberer Rücken an einer Bank, Langhantel über der Hüfte.',
			'Durch die Fersen drücken und die Hüfte anheben, bis der Körper eine gerade Linie bildet.',
			'Den Gesässmuskel oben anspannen.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'calf-raise-machine',
		name: 'Calf Raise (Machine)',
		bodyPart: 'legs',
		equipment: 'machine',
		target: 'calves',
		secondaryMuscles: [],
		instructions: [
			'Stand on the machine platform with the balls of your feet on the edge.',
			'Lower your heels as far as comfortable.',
			'Push up onto your toes as high as possible.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Wadenheben (Maschine)',
			instructions: [
			'Auf der Maschinenplattform stehen, Fussballen auf der Kante.',
			'Die Fersen so weit wie möglich absenken.',
			'Auf die Zehenspitzen drücken, so hoch wie möglich.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'calf-raise-standing',
		name: 'Calf Raise (Standing)',
		bodyPart: 'legs',
		equipment: 'body weight',
		target: 'calves',
		secondaryMuscles: [],
		instructions: [
			'Stand on a step or platform with the balls of your feet on the edge.',
			'Lower your heels below the platform.',
			'Push up onto your toes as high as possible.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Wadenheben (Stehend)',
			instructions: [
			'Auf einer Stufe oder Plattform stehen, Fussballen auf der Kante.',
			'Die Fersen unter die Plattform absenken.',
			'Auf die Zehenspitzen drücken, so hoch wie möglich.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'nordic-hamstring-curl',
		name: 'Nordic Hamstring Curl',
		bodyPart: 'legs',
		equipment: 'body weight',
		target: 'hamstrings',
		secondaryMuscles: ['glutes', 'calves'],
		instructions: [
			'Kneel on a pad with your ankles secured under a sturdy object or by a partner.',
			'Keep your body straight from knees to head.',
			'Slowly lower yourself forward by extending at the knees, resisting with your hamstrings.',
			'Lower as far as you can control, then push off the ground lightly to return to the start.'
		]
	,
		de: {
			name: 'Nordic Hamstring Curl',
			instructions: [
			'Auf einem Polster knien, Knöchel unter einem festen Gegenstand oder von einem Partner gesichert.',
			'Den Körper von den Knien bis zum Kopf gerade halten.',
			'Sich langsam nach vorne absenken, indem die Knie gestreckt werden, mit den Beinbeugern abbremsen.',
			'So weit wie kontrollierbar absenken, dann leicht vom Boden abdrücken, um zurückzukehren.'
			]
		}},
	{
		id: 'goblet-squat-dumbbell',
		name: 'Goblet Squat (Dumbbell)',
		bodyPart: 'legs',
		equipment: 'dumbbell',
		target: 'quadriceps',
		secondaryMuscles: ['glutes', 'core'],
		instructions: [
			'Hold a dumbbell vertically at chest level.',
			'Squat down, keeping the torso upright.',
			'Drive through your heels to stand back up.'
		]
	,
		de: {
			name: 'Goblet Squat (Kurzhantel)',
			instructions: [
			'Eine Kurzhantel senkrecht auf Brusthöhe halten.',
			'In die Hocke gehen, Oberkörper aufrecht halten.',
			'Durch die Fersen nach oben drücken.'
			]
		}},
	{
		id: 'hack-squat-machine',
		name: 'Hack Squat (Machine)',
		bodyPart: 'legs',
		equipment: 'machine',
		target: 'quadriceps',
		secondaryMuscles: ['glutes', 'hamstrings'],
		instructions: [
			'Position yourself in the hack squat machine with shoulders against the pads.',
			'Lower the platform by bending your knees.',
			'Push back up without locking your knees.'
		]
	,
		de: {
			name: 'Hackenschmidt-Kniebeuge (Maschine)',
			instructions: [
			'In der Hackenschmidt-Maschine positionieren, Schultern gegen die Polster.',
			'Die Plattform durch Beugen der Knie absenken.',
			'Zurückdrücken, ohne die Knie durchzustrecken.'
			]
		}},

	// === CORE ===
	{
		id: 'plank',
		name: 'Plank',
		bodyPart: 'core',
		equipment: 'body weight',
		target: 'abdominals',
		metrics: ['duration'],
		secondaryMuscles: ['obliques', 'erector spinae'],
		instructions: [
			'Start in a forearm plank position with elbows under shoulders.',
			'Keep your body in a straight line from head to heels.',
			'Hold the position for the desired duration.'
		]
	,
		de: {
			name: 'Unterarmstütz',
			instructions: [
			'In einer Unterarmstütz-Position starten, Ellbogen unter den Schultern.',
			'Den Körper in einer geraden Linie von Kopf bis Ferse halten.',
			'Die Position für die gewünschte Dauer halten.'
			]
		}},
	{
		id: 'decline-crunch',
		name: 'Decline Crunch',
		bodyPart: 'core',
		equipment: 'body weight',
		target: 'abdominals',
		secondaryMuscles: ['hip flexors'],
		instructions: [
			'Lie on a decline bench with your feet secured under the pads.',
			'Place hands behind your head or across your chest.',
			'Curl your upper body up towards your knees.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Negativbank-Crunch',
			instructions: [
			'Auf einer Negativbank liegen, Füsse unter den Polstern gesichert.',
			'Hände hinter den Kopf oder vor die Brust legen.',
			'Den Oberkörper zu den Knien aufrollen.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'flat-leg-raise',
		name: 'Flat Leg Raise',
		bodyPart: 'core',
		equipment: 'body weight',
		target: 'abdominals',
		secondaryMuscles: ['hip flexors'],
		instructions: [
			'Lie flat on a bench or the floor with legs extended.',
			'Place hands at your sides or under your hips for support.',
			'Raise your legs until they are perpendicular to the floor.',
			'Lower with control without letting your feet touch the floor.'
		]
	,
		de: {
			name: 'Beinheben (Flach)',
			instructions: [
			'Flach auf einer Bank oder dem Boden liegen, Beine gestreckt.',
			'Hände seitlich oder unter die Hüften legen.',
			'Die Beine anheben, bis sie senkrecht zum Boden stehen.',
			'Kontrolliert absenken, ohne die Füsse den Boden berühren zu lassen.'
			]
		}},
	{
		id: 'crunch',
		name: 'Crunch',
		bodyPart: 'core',
		equipment: 'body weight',
		target: 'abdominals',
		secondaryMuscles: [],
		instructions: [
			'Lie on your back with knees bent and feet flat on the floor.',
			'Place hands behind your head or across your chest.',
			'Curl your upper body towards your knees.',
			'Lower with control.'
		]
	,
		de: {
			name: 'Crunch',
			instructions: [
			'Auf dem Rücken liegen, Knie gebeugt, Füsse flach auf dem Boden.',
			'Hände hinter den Kopf oder vor die Brust legen.',
			'Den Oberkörper zu den Knien aufrollen.',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'hanging-leg-raise',
		name: 'Hanging Leg Raise',
		bodyPart: 'core',
		equipment: 'body weight',
		target: 'abdominals',
		secondaryMuscles: ['hip flexors'],
		instructions: [
			'Hang from a pull-up bar with arms extended.',
			'Raise your legs until they are parallel to the floor (or higher).',
			'Lower with control.'
		]
	,
		de: {
			name: 'Hängendes Beinheben',
			instructions: [
			'An einer Klimmzugstange mit gestreckten Armen hängen.',
			'Die Beine anheben, bis sie parallel zum Boden sind (oder höher).',
			'Kontrolliert absenken.'
			]
		}},
	{
		id: 'cable-crunch',
		name: 'Cable Crunch',
		bodyPart: 'core',
		equipment: 'cable',
		target: 'abdominals',
		secondaryMuscles: [],
		instructions: [
			'Kneel in front of a high cable pulley with a rope attachment.',
			'Hold the rope behind your head.',
			'Crunch down, bringing your elbows towards your knees.',
			'Return to the starting position with control.'
		]
	,
		de: {
			name: 'Kabel-Crunch',
			instructions: [
			'Vor einem hohen Kabelzug mit Seilaufsatz knien.',
			'Das Seil hinter dem Kopf halten.',
			'Nach unten crunchen, Ellbogen Richtung Knie führen.',
			'Kontrolliert in die Ausgangsposition zurückkehren.'
			]
		}},
	{
		id: 'russian-twist',
		name: 'Russian Twist',
		bodyPart: 'core',
		equipment: 'body weight',
		target: 'obliques',
		secondaryMuscles: ['abdominals'],
		instructions: [
			'Sit on the floor with knees bent, lean back slightly.',
			'Rotate your torso from side to side.',
			'Optionally hold a weight for added resistance.'
		]
	,
		de: {
			name: 'Russian Twist',
			instructions: [
			'Auf dem Boden sitzen, Knie gebeugt, leicht nach hinten lehnen.',
			'Den Oberkörper von Seite zu Seite rotieren.',
			'Optional ein Gewicht für zusätzlichen Widerstand halten.'
			]
		}},
	{
		id: 'ab-wheel-rollout',
		name: 'Ab Wheel Rollout',
		bodyPart: 'core',
		equipment: 'other',
		target: 'abdominals',
		secondaryMuscles: ['erector spinae', 'lats'],
		instructions: [
			'Kneel on the floor holding an ab wheel.',
			'Roll the wheel forward, extending your body as far as possible.',
			'Use your core to pull back to the starting position.'
		]
	,
		de: {
			name: 'Ab-Wheel-Rollout',
			instructions: [
			'Auf dem Boden kniend ein Ab-Wheel halten.',
			'Das Rad nach vorne rollen und den Körper so weit wie möglich strecken.',
			'Mit der Rumpfmuskulatur zurück in die Ausgangsposition ziehen.'
			]
		}},

	// === CARDIO / FULL BODY ===
	{
		id: 'running',
		name: 'Running',
		bodyPart: 'cardio',
		equipment: 'body weight',
		target: 'cardiovascular system',
		secondaryMuscles: ['quadriceps', 'hamstrings', 'calves', 'glutes'],
		instructions: ['Run at a steady pace for the desired duration or distance.']
	,
		de: {
			name: 'Laufen',
			instructions: [
			'In einem gleichmässigen Tempo für die gewünschte Dauer oder Distanz laufen.'
			]
		}},
	{
		id: 'walking',
		name: 'Walking',
		bodyPart: 'cardio',
		equipment: 'body weight',
		target: 'cardiovascular system',
		secondaryMuscles: ['quadriceps', 'hamstrings', 'calves', 'glutes'],
		instructions: ['Walk at a brisk pace for the desired duration or distance.']
	,
		de: {
			name: 'Gehen',
			instructions: [
			'In zügigem Tempo für die gewünschte Dauer oder Distanz gehen.'
			]
		}},
	{
		id: 'cycling-indoor',
		name: 'Cycling (Indoor)',
		bodyPart: 'cardio',
		equipment: 'machine',
		target: 'cardiovascular system',
		secondaryMuscles: ['quadriceps', 'hamstrings', 'calves'],
		instructions: ['Cycle at a steady pace on a stationary bike for the desired duration.']
	,
		de: {
			name: 'Radfahren (Indoor)',
			instructions: [
			'In einem gleichmässigen Tempo auf dem Ergometer für die gewünschte Dauer fahren.'
			]
		}},
	{
		id: 'cycling-outdoor',
		name: 'Cycling (Outdoor)',
		bodyPart: 'cardio',
		equipment: 'body weight',
		target: 'cardiovascular system',
		secondaryMuscles: ['quadriceps', 'hamstrings', 'calves', 'glutes'],
		instructions: ['Cycle outdoors at a steady pace for the desired duration or distance.']
	,
		de: {
			name: 'Radfahren (Outdoor)',
			instructions: [
			'Im Freien in einem gleichmässigen Tempo für die gewünschte Dauer oder Distanz fahren.'
			]
		}},
	{
		id: 'swimming',
		name: 'Swimming',
		bodyPart: 'cardio',
		equipment: 'body weight',
		target: 'cardiovascular system',
		secondaryMuscles: ['lats', 'shoulders', 'core', 'quadriceps'],
		instructions: ['Swim laps at a steady pace using your preferred stroke.']
	,
		de: {
			name: 'Schwimmen',
			instructions: [
			'Bahnen in einem gleichmässigen Tempo im bevorzugten Schwimmstil schwimmen.'
			]
		}},
	{
		id: 'rowing-machine',
		name: 'Rowing Machine',
		bodyPart: 'cardio',
		equipment: 'machine',
		target: 'cardiovascular system',
		secondaryMuscles: ['lats', 'biceps', 'quadriceps', 'core'],
		instructions: [
			'Sit at the rowing machine and strap your feet in.',
			'Drive with your legs first, then pull the handle to your lower chest.',
			'Return to the starting position by extending arms, then bending knees.'
		]
	,
		de: {
			name: 'Rudergerät',
			instructions: [
			'Am Rudergerät sitzen und die Füsse befestigen.',
			'Zuerst mit den Beinen drücken, dann den Griff zur unteren Brust ziehen.',
			'In die Ausgangsposition zurückkehren: Arme strecken, dann Knie beugen.'
			]
		}},
	{
		id: 'rowing-outdoor',
		name: 'Rowing (Outdoor)',
		bodyPart: 'cardio',
		equipment: 'body weight',
		target: 'cardiovascular system',
		secondaryMuscles: ['lats', 'biceps', 'quadriceps', 'core', 'shoulders'],
		instructions: ['Row on water at a steady pace for the desired duration or distance.']
	,
		de: {
			name: 'Rudern (Outdoor)',
			instructions: [
			'Auf dem Wasser in einem gleichmässigen Tempo für die gewünschte Dauer oder Distanz rudern.'
			]
		}},
	{
		id: 'hiking',
		name: 'Hiking',
		bodyPart: 'cardio',
		equipment: 'body weight',
		target: 'cardiovascular system',
		secondaryMuscles: ['quadriceps', 'hamstrings', 'calves', 'glutes', 'core'],
		instructions: ['Hike at a steady pace on trails or uneven terrain.']
	,
		de: {
			name: 'Wandern',
			instructions: [
			'In einem gleichmässigen Tempo auf Wegen oder unebenem Gelände wandern.'
			]
		}},
	{
		id: 'elliptical',
		name: 'Elliptical',
		bodyPart: 'cardio',
		equipment: 'machine',
		target: 'cardiovascular system',
		secondaryMuscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'],
		instructions: ['Use the elliptical machine at a steady pace for the desired duration.']
	,
		de: {
			name: 'Crosstrainer',
			instructions: [
			'Den Crosstrainer in einem gleichmässigen Tempo für die gewünschte Dauer nutzen.'
			]
		}},
	{
		id: 'stair-climber',
		name: 'Stair Climber',
		bodyPart: 'cardio',
		equipment: 'machine',
		target: 'cardiovascular system',
		secondaryMuscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'],
		instructions: ['Climb at a steady pace on the stair climber for the desired duration.']
	,
		de: {
			name: 'Treppensteiger',
			instructions: [
			'In einem gleichmässigen Tempo auf dem Treppensteiger für die gewünschte Dauer steigen.'
			]
		}},
	{
		id: 'jump-rope',
		name: 'Jump Rope',
		bodyPart: 'cardio',
		equipment: 'body weight',
		metrics: ['duration', 'reps', 'rpe'],
		target: 'cardiovascular system',
		secondaryMuscles: ['calves', 'shoulders', 'forearms', 'core'],
		instructions: ['Jump rope at a steady pace, landing lightly on the balls of your feet.']
	,
		de: {
			name: 'Seilspringen',
			instructions: [
			'In einem gleichmässigen Tempo Seil springen, leicht auf den Fussballen landen.'
			]
		}},

	// === ADDITIONAL COMPOUND MOVEMENTS ===
	{
		id: 'clean-and-press-barbell',
		name: 'Clean and Press (Barbell)',
		bodyPart: 'shoulders',
		equipment: 'barbell',
		target: 'anterior deltoids',
		secondaryMuscles: ['traps', 'quadriceps', 'glutes', 'core'],
		instructions: [
			'Start with the barbell on the floor.',
			'Pull the bar explosively to your shoulders (clean).',
			'Press the bar overhead.',
			'Lower back to shoulders, then to the floor.'
		]
	,
		de: {
			name: 'Umsetzen und Drücken (Langhantel)',
			instructions: [
			'Mit der Langhantel auf dem Boden beginnen.',
			'Die Stange explosiv zu den Schultern ziehen (Umsetzen).',
			'Die Stange über den Kopf drücken.',
			'Zurück zu den Schultern senken, dann zum Boden.'
			]
		}},
	{
		id: 'farmers-walk',
		name: "Farmer's Walk",
		bodyPart: 'core',
		equipment: 'dumbbell',
		bilateral: true,
		target: 'forearms',
		secondaryMuscles: ['traps', 'core', 'grip'],
		instructions: [
			'Hold heavy dumbbells or farmer walk handles at your sides.',
			'Walk with controlled steps for the desired distance or duration.',
			'Keep your core tight and shoulders back.'
		]
	,
		de: {
			name: 'Farmer\'s Walk',
			instructions: [
			'Schwere Kurzhanteln oder Farmer-Walk-Griffe an den Seiten halten.',
			'Mit kontrollierten Schritten für die gewünschte Distanz oder Dauer gehen.',
			'Die Rumpfmuskulatur anspannen und die Schultern zurückziehen.'
			]
		}}
];

// Lookup map for O(1) access by ID
const exerciseMap = new Map<string, Exercise>(exercises.map((e) => [e.id, e]));

export function getExerciseById(id: string, lang?: 'en' | 'de'): LocalizedExercise | undefined {
	const e = exerciseMap.get(id);
	if (!e) return undefined;
	return localizeExercise(e, lang ?? 'en');
}

export function getFilterOptions(): {
	bodyParts: string[];
	equipment: string[];
	targets: string[];
} {
	const bodyParts = new Set<string>();
	const equipment = new Set<string>();
	const targets = new Set<string>();

	for (const e of exercises) {
		bodyParts.add(e.bodyPart);
		equipment.add(e.equipment);
		targets.add(e.target);
	}

	return {
		bodyParts: [...bodyParts].sort(),
		equipment: [...equipment].sort(),
		targets: [...targets].sort()
	};
}

import { fuzzyScore } from '$lib/js/fuzzy';

export function searchExercises(opts: {
	search?: string;
	bodyPart?: string;
	equipment?: string;
	target?: string;
	lang?: 'en' | 'de';
}): LocalizedExercise[] {
	const lang = opts.lang ?? 'en';
	let results: LocalizedExercise[] = exercises.map(e => localizeExercise(e, lang));

	if (opts.bodyPart) {
		results = results.filter((e) => e.bodyPart === opts.bodyPart);
	}
	if (opts.equipment) {
		results = results.filter((e) => e.equipment === opts.equipment);
	}
	if (opts.target) {
		results = results.filter((e) => e.target === opts.target);
	}
	if (opts.search) {
		const query = opts.search.toLowerCase();
		const scored: { exercise: LocalizedExercise; score: number }[] = [];
		for (const e of results) {
			const text = `${e.localName} ${e.name} ${e.localTarget} ${e.localBodyPart} ${e.localEquipment} ${e.localSecondaryMuscles.join(' ')}`.toLowerCase();
			const score = fuzzyScore(query, text);
			if (score > 0) scored.push({ exercise: e, score });
		}
		scored.sort((a, b) => b.score - a.score);
		results = scored.map((s) => s.exercise);
	}

	return results;
}
