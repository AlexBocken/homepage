export interface Exercise {
	id: string;
	name: string;
	bodyPart: string;
	equipment: string;
	target: string;
	secondaryMuscles: string[];
	instructions: string[];
	imageUrl?: string;
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
	},
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
	},
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
	},
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
	},
	{
		id: 'bench-press-dumbbell',
		name: 'Bench Press (Dumbbell)',
		bodyPart: 'chest',
		equipment: 'dumbbell',
		target: 'pectorals',
		secondaryMuscles: ['triceps', 'anterior deltoids'],
		instructions: [
			'Lie flat on the bench holding a dumbbell in each hand at chest level.',
			'Press the dumbbells up until arms are fully extended.',
			'Lower the dumbbells back to chest level with control.'
		]
	},
	{
		id: 'incline-bench-press-dumbbell',
		name: 'Incline Bench Press (Dumbbell)',
		bodyPart: 'chest',
		equipment: 'dumbbell',
		target: 'pectorals',
		secondaryMuscles: ['triceps', 'anterior deltoids'],
		instructions: [
			'Set the bench to a 30-45 degree incline.',
			'Hold a dumbbell in each hand at chest level.',
			'Press the dumbbells up until arms are fully extended.',
			'Lower with control.'
		]
	},
	{
		id: 'chest-fly-dumbbell',
		name: 'Chest Fly (Dumbbell)',
		bodyPart: 'chest',
		equipment: 'dumbbell',
		target: 'pectorals',
		secondaryMuscles: ['anterior deltoids'],
		instructions: [
			'Lie flat on the bench holding dumbbells above your chest with arms slightly bent.',
			'Lower the dumbbells out to the sides in a wide arc.',
			'Bring the dumbbells back together above your chest.'
		]
	},
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
	},
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
	},
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
	},

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
	},
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
	},
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
	},
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
	},
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
	},
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
	},
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
	},
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
	},
	{
		id: 'incline-row-dumbbell',
		name: 'Incline Row (Dumbbell)',
		bodyPart: 'back',
		equipment: 'dumbbell',
		target: 'lats',
		secondaryMuscles: ['rhomboids', 'biceps', 'rear deltoids'],
		instructions: [
			'Lie face down on an incline bench set to about 30-45 degrees.',
			'Hold a dumbbell in each hand with arms hanging straight down.',
			'Row the dumbbells up to your sides, squeezing your shoulder blades together.',
			'Lower with control.'
		]
	},
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
	},

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
	},
	{
		id: 'overhead-press-dumbbell',
		name: 'Overhead Press (Dumbbell)',
		bodyPart: 'shoulders',
		equipment: 'dumbbell',
		target: 'anterior deltoids',
		secondaryMuscles: ['triceps', 'lateral deltoids', 'traps'],
		instructions: [
			'Sit or stand holding dumbbells at shoulder height.',
			'Press the dumbbells overhead until arms are fully extended.',
			'Lower the dumbbells back to shoulder height with control.'
		]
	},
	{
		id: 'lateral-raise-dumbbell',
		name: 'Lateral Raise (Dumbbell)',
		bodyPart: 'shoulders',
		equipment: 'dumbbell',
		target: 'lateral deltoids',
		secondaryMuscles: ['traps'],
		instructions: [
			'Stand with dumbbells at your sides.',
			'Raise the dumbbells out to the sides until arms are parallel to the floor.',
			'Lower with control.'
		]
	},
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
	},
	{
		id: 'front-raise-dumbbell',
		name: 'Front Raise (Dumbbell)',
		bodyPart: 'shoulders',
		equipment: 'dumbbell',
		target: 'anterior deltoids',
		secondaryMuscles: ['lateral deltoids'],
		instructions: [
			'Stand with dumbbells in front of your thighs.',
			'Raise one or both dumbbells to the front until arms are parallel to the floor.',
			'Lower with control.'
		]
	},
	{
		id: 'reverse-fly-dumbbell',
		name: 'Reverse Fly (Dumbbell)',
		bodyPart: 'shoulders',
		equipment: 'dumbbell',
		target: 'rear deltoids',
		secondaryMuscles: ['rhomboids', 'traps'],
		instructions: [
			'Bend forward at the hips holding dumbbells.',
			'Raise the dumbbells out to the sides, squeezing shoulder blades together.',
			'Lower with control.'
		]
	},
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
	},
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
	},
	{
		id: 'shrug-dumbbell',
		name: 'Shrug (Dumbbell)',
		bodyPart: 'shoulders',
		equipment: 'dumbbell',
		target: 'traps',
		secondaryMuscles: [],
		instructions: [
			'Stand holding dumbbells at your sides.',
			'Shrug your shoulders straight up towards your ears.',
			'Hold briefly at the top, then lower with control.'
		]
	},

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
	},
	{
		id: 'bicep-curl-dumbbell',
		name: 'Bicep Curl (Dumbbell)',
		bodyPart: 'arms',
		equipment: 'dumbbell',
		target: 'biceps',
		secondaryMuscles: ['forearms'],
		instructions: [
			'Stand holding dumbbells at your sides with palms facing forward.',
			'Curl the dumbbells up towards your shoulders.',
			'Lower with control.'
		]
	},
	{
		id: 'hammer-curl-dumbbell',
		name: 'Hammer Curl (Dumbbell)',
		bodyPart: 'arms',
		equipment: 'dumbbell',
		target: 'biceps',
		secondaryMuscles: ['brachioradialis', 'forearms'],
		instructions: [
			'Stand holding dumbbells at your sides with palms facing each other (neutral grip).',
			'Curl the dumbbells up towards your shoulders.',
			'Lower with control.'
		]
	},
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
	},
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
	},
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
	},

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
	},
	{
		id: 'skullcrusher-dumbbell',
		name: 'Skullcrusher (Dumbbell)',
		bodyPart: 'arms',
		equipment: 'dumbbell',
		target: 'triceps',
		secondaryMuscles: [],
		instructions: [
			'Lie flat on a bench holding dumbbells with arms extended above your chest.',
			'Lower the dumbbells towards your forehead by bending at the elbows.',
			'Extend the arms back to the starting position.'
		]
	},
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
	},
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
	},
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
	},
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
	},

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
		]
	},
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
	},
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
	},
	{
		id: 'lunge-dumbbell',
		name: 'Lunge (Dumbbell)',
		bodyPart: 'legs',
		equipment: 'dumbbell',
		target: 'quadriceps',
		secondaryMuscles: ['glutes', 'hamstrings'],
		instructions: [
			'Stand holding dumbbells at your sides.',
			'Step forward and lower your body until both knees are at 90 degrees.',
			'Push back to the starting position.'
		]
	},
	{
		id: 'bulgarian-split-squat-dumbbell',
		name: 'Bulgarian Split Squat (Dumbbell)',
		bodyPart: 'legs',
		equipment: 'dumbbell',
		target: 'quadriceps',
		secondaryMuscles: ['glutes', 'hamstrings'],
		instructions: [
			'Stand with one foot on a bench behind you, holding dumbbells.',
			'Lower your body until the front thigh is parallel to the floor.',
			'Drive through the front heel to stand back up.'
		]
	},
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
	},
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
	},
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
	},
	{
		id: 'romanian-deadlift-dumbbell',
		name: 'Romanian Deadlift (Dumbbell)',
		bodyPart: 'legs',
		equipment: 'dumbbell',
		target: 'hamstrings',
		secondaryMuscles: ['glutes', 'erector spinae'],
		instructions: [
			'Stand holding dumbbells in front of your thighs.',
			'Hinge at the hips, pushing them back while keeping legs nearly straight.',
			'Lower the dumbbells along your legs until you feel a stretch in the hamstrings.',
			'Drive the hips forward to return to standing.'
		]
	},
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
	},
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
	},
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
	},
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
	},
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
	},
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
	},

	// === CORE ===
	{
		id: 'plank',
		name: 'Plank',
		bodyPart: 'core',
		equipment: 'body weight',
		target: 'abdominals',
		secondaryMuscles: ['obliques', 'erector spinae'],
		instructions: [
			'Start in a forearm plank position with elbows under shoulders.',
			'Keep your body in a straight line from head to heels.',
			'Hold the position for the desired duration.'
		]
	},
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
	},
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
	},
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
	},
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
	},
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
	},
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
	},
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
	},

	// === CARDIO / FULL BODY ===
	{
		id: 'running',
		name: 'Running',
		bodyPart: 'cardio',
		equipment: 'body weight',
		target: 'cardiovascular system',
		secondaryMuscles: ['quadriceps', 'hamstrings', 'calves', 'glutes'],
		instructions: ['Run at a steady pace for the desired duration or distance.']
	},
	{
		id: 'cycling-indoor',
		name: 'Cycling (Indoor)',
		bodyPart: 'cardio',
		equipment: 'machine',
		target: 'cardiovascular system',
		secondaryMuscles: ['quadriceps', 'hamstrings', 'calves'],
		instructions: ['Cycle at a steady pace on a stationary bike for the desired duration.']
	},
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
	},

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
	},
	{
		id: 'farmers-walk',
		name: "Farmer's Walk",
		bodyPart: 'core',
		equipment: 'dumbbell',
		target: 'forearms',
		secondaryMuscles: ['traps', 'core', 'grip'],
		instructions: [
			'Hold heavy dumbbells or farmer walk handles at your sides.',
			'Walk with controlled steps for the desired distance or duration.',
			'Keep your core tight and shoulders back.'
		]
	}
];

// Lookup map for O(1) access by ID
const exerciseMap = new Map<string, Exercise>(exercises.map((e) => [e.id, e]));

export function getExerciseById(id: string): Exercise | undefined {
	return exerciseMap.get(id);
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

export function searchExercises(opts: {
	search?: string;
	bodyPart?: string;
	equipment?: string;
	target?: string;
}): Exercise[] {
	let results = exercises;

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
		results = results.filter(
			(e) =>
				e.name.toLowerCase().includes(query) ||
				e.target.toLowerCase().includes(query) ||
				e.bodyPart.toLowerCase().includes(query) ||
				e.equipment.toLowerCase().includes(query) ||
				e.secondaryMuscles.some((m) => m.toLowerCase().includes(query))
		);
	}

	return results;
}
