/**
 * 1:1 mapping from ExerciseDB v2 exercise IDs to internal kebab-case slugs.
 *
 * - Entries that match an existing exercise in exercises.ts reuse that ID.
 * - All other entries get a new slug derived from the ExerciseDB name.
 *
 * Regenerate with: scripts/scrape-exercises.ts (source data)
 */

export const exerciseDbMap: Record<string, string> = {
	// ── Matched to existing internal exercises ────────────────────────
	'exr_41n2hxnFMotsXTj3': 'bench-press-barbell',                  // Bench Press (BARBELL)
	'exr_41n2hpLLs1uU5atr': 'bulgarian-split-squat-dumbbell',       // Bulgarian Split Squat
	'exr_41n2hSGs9Q3NVGhs': 'calf-raise-standing',                  // Bodyweight Standing Calf Raise
	'exr_41n2hkK8hGAcSnW7': 'chest-dip',                            // Chest Dip
	'exr_41n2hXszY7TgwKy4': 'chin-up',                              // Chin-Up
	'exr_41n2hskeb9dXgBoC': 'crunch',                               // Crunch Floor
	'exr_41n2hY9EdwkdGz9a': 'dumbbell-row',                         // Dumbbell One Arm Bent-over Row
	'exr_41n2howQHvcrcrW6': 'front-raise-dumbbell',                  // Front Raise (DUMBBELL)
	'exr_41n2hQDiSwTZXM4F': 'goblet-squat-dumbbell',                // Goblet Squat (DUMBBELL)
	'exr_41n2hxxePSdr5oN1': 'hip-thrust-barbell',                   // Hip Thrusts
	'exr_41n2hfYD2sH4TRCH': 'hyperextension',                       // Hyperextension
	'exr_41n2hN468sP27Sac': 'jump-rope',                            // Jump Rope (ROPE)
	'exr_41n2hjuGpcex14w7': 'lateral-raise-dumbbell',               // Lateral Raise (DUMBBELL)
	'exr_41n2hYXWwoxiUk57': 'lunge-dumbbell',                       // Lunge
	'exr_41n2hs6camM22yBG': 'overhead-press-dumbbell',              // Seated Shoulder Press (DUMBBELL)
	'exr_41n2hXQw5yAbbXL8': 'plank',                                // Front Plank
	'exr_41n2hsBtDXapcADg': 'pull-up',                              // Pull-up
	'exr_41n2hNXJadYcfjnd': 'push-up',                              // Push-up
	'exr_41n2hyNf5GebszTf': 'reverse-fly-dumbbell',                 // Dumbbell Rear Delt Fly
	'exr_41n2hn8rpbYihzEW': 'romanian-deadlift-dumbbell',           // Romanian Deadlift (DUMBBELL)
	'exr_41n2hWVVEwU54UtF': 'russian-twist',                        // Russian Twist
	'exr_41n2hdHtZrMPkcqY': 'skullcrusher-dumbbell',                // Dumbbell Lying Floor Skull Crusher
	'exr_41n2hadQgEEX8wDN': 'tricep-dip',                           // Triceps Dip

	// ── New slugs (no existing internal match) ───────────────────────
	'exr_41n2hRH4aTB379Tp': '45-degree-hyperextension',             // 45 degree hyperextension
	'exr_41n2hqfZb8UHBvB9': 'alternate-lying-floor-leg-raise',      // Alternate Lying Floor Leg Raise
	'exr_41n2hezAZ6CdkAcM': 'alternate-punching',                   // Alternate Punching
	'exr_41n2hNifNwh2tbR2': 'ankle-dorsal-flexion-articulations',   // Ankle - Dorsal Flexion - Articulations
	'exr_41n2he2doZNpmXkX': 'ankle-plantar-flexion-articulations',  // Ankle - Plantar Flexion - Articulations
	'exr_41n2hMRXm49mM62z': 'arnold-press',                         // Arnold Press (DUMBBELL)
	'exr_41n2hmhb4jD7H8Qk': 'assault-bike-run',                    // Assault Bike Run (MACHINE)
	'exr_41n2hQeNyCnt3uFh': 'back-pec-stretch',                    // Back Pec Stretch
	'exr_41n2hwoc6PkW1UJJ': 'barbell-standing-calf-raise',         // Barbell Standing Calf Raise
	'exr_41n2hoFGGwZDNFT1': 'bench-dip-on-floor',                  // Bench dip on floor
	'exr_41n2hxqpSU5p6DZv': 'biceps-leg-concentration-curl',       // Biceps Leg Concentration Curl
	'exr_41n2hTkfLWpc57BQ': 'body-up',                              // Body-Up
	'exr_41n2hNjcmNgtPJ1H': 'bodyweight-rear-lunge',               // Bodyweight Rear Lunge
	'exr_41n2hrHSqBnVWRRB': 'bodyweight-single-leg-deadlift',      // Bodyweight Single Leg Deadlift
	'exr_41n2ha5iPFpN3hEJ': 'bridge-mountain-climber',             // Bridge - Mountain Climber
	'exr_41n2hmbfYcYtedgz': 'bridge-pose-setu-bandhasana',         // Bridge Pose Setu Bandhasana
	'exr_41n2hqYdxG87hXz1': 'burpee',                               // Burpee
	'exr_41n2hZqwsLkCVnzr': 'butt-kicks',                          // Butt Kicks
	'exr_41n2hnougzKKhhqu': 'butterfly-yoga-pose',                  // Butterfly Yoga Pose
	'exr_41n2hn2kPMag9WCf': 'cable-seated-neck-extension',         // Cable Seated Neck Extension (CABLE)
	'exr_41n2hUDuvCas2EB3': 'cable-seated-neck-flexion',           // Cable Seated Neck Flexion (CABLE)
	'exr_41n2hcm5HH6H684G': 'calf-raise-from-deficit-chair',      // Calf Raise from Deficit with Chair Supported
	'exr_41n2hHCXQpZYhxhc': 'calf-stretch-wall',                   // Calf Stretch With Hands Against Wall
	'exr_41n2hSkc2tRLxVVS': 'calf-stretch-rope',                   // Calf Stretch with Rope
	'exr_41n2hG9pRT55cGVk': 'calves-stretch',                      // Calves stretch
	'exr_41n2hGD4omjWVnbS': 'calves-stretch-standing',             // Calves Stretch (variant)
	'exr_41n2hd6SThQhAdnZ': 'chin-ups-neutral',                    // Chin-ups (variant)
	'exr_41n2hWQVZanCB1d7': 'circles-arm',                          // Circles Arm
	'exr_41n2hk3YSCjnZ9um': 'circles-knee-stretch',                // Circles Knee Stretch
	'exr_41n2hrSQZRD4yG7P': 'circles-knee-stretch-alt',            // Circles Knee Stretch (variant)
	'exr_41n2hkmMrSwcHkZ8': 'clap-push-up',                        // Clap Push Up
	'exr_41n2hPgRbN1KtJuD': 'close-grip-push-up',                  // Close-grip Push-up
	'exr_41n2hHLE8aJXaxKR': 'cobra-push-up',                       // Cobra Push-up
	'exr_41n2hVCJfpAvJcdU': 'commando-pull-up',                    // Commando Pull-up
	'exr_41n2hNCTCWtWAqzH': 'cow-stretch',                          // Cow Stretch
	'exr_41n2hgCHNgtVLHna': 'cross-body-hammer-curl',              // Cross Body Hammer Curl (DUMBBELL)
	'exr_41n2hGUso7JFmuYR': 'decline-push-up',                     // Decline Push-Up
	'exr_41n2hdCBvmbCPaVE': 'diamond-press',                        // Diamond Press
	'exr_41n2hnbt5GwwY7gr': 'diamond-push-up',                     // Diamond Push up
	'exr_41n2hRZ6fgsLyd77': 'diamond-push-up-alt',                 // Diamond Push-up (variant)
	'exr_41n2hUKc7JPrtJQj': 'dip-on-floor-with-chair',             // Dip on Floor with Chair
	'exr_41n2hWbP5uF6PQpU': 'donkey-calf-raise',                   // Donkey Calf Raise
	'exr_41n2hW9gDXAJJMmH': 'downward-facing-dog',                 // Downward Facing Dog
	'exr_41n2hTaeNKWhMQHH': 'dumbbell-burpee',                     // Dumbbell burpee
	'exr_41n2hXfpvSshoXWG': 'dumbbell-clean-and-press',            // Dumbbell Clean and Press
	'exr_41n2hZ7uoN5JnUJY': 'dumbbell-decline-one-arm-hammer-press', // Dumbbell Decline One Arm Hammer Press
	'exr_41n2haNJ3NA8yCE2': 'dumbbell-incline-one-arm-hammer-press', // Dumbbell Incline One Arm Hammer Press
	'exr_41n2huf7mAC2rhfC': 'dumbbell-jumping-squat',              // Dumbbell Jumping Squat
	'exr_41n2hbLX4XH8xgN7': 'dumbbell-single-leg-calf-raise',     // Dumbbell Single Leg Calf Raise
	'exr_41n2hQtaWxPLNFwX': 'dumbbell-standing-calf-raise',        // Dumbbell Standing Calf Raise
	'exr_41n2hTCBiQVsEfZ7': 'dumbbell-side-bend',                  // Dumbbell Side Bend
	'exr_41n2hcw2FN534HcA': 'dumbbell-stiff-leg-deadlift',         // Dumbbell Stiff Leg Deadlift
	'exr_41n2hQp1pR7heQq9': 'dumbbell-stiff-leg-deadlift-alt',     // Dumbbell Stiff Leg Deadlift (variant)
	'exr_41n2hek6i3exMARx': 'elbow-flexion-articulations',         // Elbow - Flexion - Articulations
	'exr_41n2hqw5LsDpeE2i': 'elbow-flexor-stretch',                // Elbow Flexor Stretch
	'exr_41n2hy8pKXtzuBh8': 'elbow-up-and-down-dynamic-plank',     // Elbow Up and Down Dynamic Plank
	'exr_41n2hKZmyYXB2UL4': 'elbows-back-stretch',                 // Elbows Back Stretch
	'exr_41n2hNfaYkEKLQHK': 'elevated-push-up',                    // Elevanted Push-Up
	'exr_41n2hfa11fPnk8y9': 'elliptical-machine-walk',             // Elliptical Machine Walk (MACHINE)
	'exr_41n2hpTMDhTxYkvi': 'elliptical-machine-walk-alt',         // Elliptical Machine Walk (variant)
	'exr_41n2hH6VGNz6cNtv': 'extension-inclination-neck-stretch',  // Extension And Inclination Neck Stretch
	'exr_41n2hLx2rvhz95GC': 'feet-ankles-rotation-stretch',        // Feet and Ankles Rotation Stretch
	'exr_41n2hzZBVbWFoLK3': 'feet-ankles-side-to-side-stretch',    // Feet and Ankles Side to Side Stretch
	'exr_41n2havo95Y2QpkW': 'feet-ankles-stretch',                 // Feet and Ankles Stretch
	'exr_41n2hnx1hnDdketU': 'feet-ankles-stretch-alt',             // Feet and Ankles Stretch (variant)
	'exr_41n2hPRWorCfCPov': 'flutter-kicks',                        // Flutter Kicks
	'exr_41n2hvg2FRT5XMyJ': 'forearm-supination-articulations',    // Forearm - Supination - Articulations
	'exr_41n2hJFwC7ocdiNm': 'forward-flexion-neck-stretch',        // Forward Flexion Neck Stretch
	'exr_41n2huQw1pHKH9cw': 'front-and-back-neck-stretch',         // Front and Back Neck Stretch
	'exr_41n2htzPyjcc3Mt2': 'front-plank-toe-tap',                 // Front Plank Toe Tap
	'exr_41n2hKoQnnSRPZrE': 'front-plank-with-leg-lift',           // Front Plank with Leg Lift
	'exr_41n2hkknYAEEE3tc': 'front-toe-touching',                  // Front Toe Touching
	'exr_41n2hGioS8HumEF7': 'hammer-curl-cable',                   // Hammer Curl (CABLE)
	'exr_41n2hushK9NGVfyK': 'handstand-push-up',                   // Handstand Push-Up
	'exr_41n2hMZCmZBvQApL': 'hanging-straight-leg-raise',          // Hanging Straight Leg Raise
	'exr_41n2hXXpvbykPY3q': 'incline-push-up',                     // Incline Push-up
	'exr_41n2hzAMXkkQQ5T2': 'inverted-chin-curl-bent-knee-chairs', // Inverted Chin Curl with Bent Knee between Chairs
	'exr_41n2hUVNhvcS73Dt': 'jump-split',                           // Jump Split
	'exr_41n2hbdZww1thMKz': 'jump-squat',                          // Jump Squat
	'exr_41n2hupxPcdnktBC': 'jumping-jack',                         // Jumping Jack
	'exr_41n2hGRSg9WCoTYT': 'jumping-pistol-squat',                // Jumping Pistol Squat
	'exr_41n2hpnZ6oASM662': 'kneeling-push-up-to-child-pose',     // Kneeling Push up to Child Pose
	'exr_41n2hSvEPVntpxSG': 'kneeling-rotational-push-up',         // Kneeling Rotational Push-up
	'exr_41n2hyWsNxNYWpk3': 'kneeling-toe-up-hamstring-stretch',   // Kneeling Toe Up Hamstring Stretch
	'exr_41n2hxg75dFGERdp': 'l-pull-up',                           // L-Pull-up
	'exr_41n2hU3XPwUFSpkC': 'l-sit-on-floor',                     // L-Sit on Floor
	'exr_41n2hS5UrMusVCEE': 'lateral-raise-towel',                 // Lateral Raise with Towel
	'exr_41n2hM8vgMA6MREd': 'left-hook-boxing',                    // Left hook. Boxing
	'exr_41n2hhiWL8njJDZe': 'lever-seated-calf-raise',             // Lever Seated Calf Raise (MACHINE)
	'exr_41n2hKiaWSZQTqgE': 'lever-stepper',                       // Lever stepper
	'exr_41n2hc2VrB8ofxrW': 'lying-double-legs-biceps-curl-towel', // Lying Double Legs Biceps Curl with Towel
	'exr_41n2hx9wyaRGNyvs': 'lying-double-legs-hammer-curl-towel', // Lying Double Legs Hammer Curl with Towel
	'exr_41n2hq3Wm6ANkgUz': 'lying-leg-raise-and-hold',           // Lying Leg Raise and Hold
	'exr_41n2hfnnXz9shkBi': 'lying-lower-back-stretch',            // Lying Lower Back Stretch
	'exr_41n2hpJxS5VQKtBL': 'lying-lower-back-stretch-alt',        // Lying Lower Back Stretch (variant)
	'exr_41n2hkB3FeGM3DEL': 'lying-scissor-kick',                  // Lying Scissor Kick
	'exr_41n2hhBHuvSdAeCJ': 'neck-circle-stretch',                 // Neck Circle Stretch
	'exr_41n2hGbCptD8Nosk': 'neck-side-stretch',                   // Neck Side Stretch
	'exr_41n2hvrsUaWWb9Mk': 'neck-side-stretch-alt',               // Neck Side Stretch (variant)
	'exr_41n2hHdjQpnyNdie': 'one-arm-bent-over-row',               // One Arm Bent-over Row (DUMBBELL)
	'exr_41n2hpeHAizgtrEw': 'one-arm-reverse-wrist-curl',          // One arm Revers Wrist Curl (DUMBBELL)
	'exr_41n2hGy6zE7fN6v2': 'one-arm-wrist-curl',                  // One arm Wrist Curl (DUMBBELL)
	'exr_41n2hhumxqyAFuTb': 'one-leg-floor-calf-raise',            // One Leg Floor Calf Raise
	'exr_41n2hsVHu7B1MTdr': 'palms-in-incline-bench-press',        // Palms In Incline Bench Press (DUMBBELL)
	'exr_41n2hbYPY4jLKxW3': 'peroneals-stretch',                   // Peroneals Stretch
	'exr_41n2hmvGdVRvvnNY': 'pike-push-up',                        // Pike Push up
	'exr_41n2hR12rPqdpWP8': 'pike-to-cobra-push-up',               // Pike-to-Cobra Push-up
	'exr_41n2hU4y6EaYXFhr': 'pull-up-alt',                         // Pull up (variant)
	'exr_41n2hQEqKxuAfV1D': 'pull-up-bent-knee-chairs',            // Pull-up with Bent Knee between Chairs
	'exr_41n2hmhxk35fbHbC': 'push-up-on-forearms',                 // Push-up on Forearms
	'exr_41n2hSMjcavNjk3c': 'quick-feet',                          // Quick Feet
	'exr_41n2hGNrmUnF58Yy': 'reverse-lunge',                       // Reverse Lunge
	'exr_41n2hdo2vCtq4F3E': 'right-cross-boxing',                  // Right Cross. Boxing
	'exr_41n2hwio5ECAfLuS': 'right-hook-boxing',                   // Right Hook. Boxing
	'exr_41n2htTnk4CuspZh': 'rotating-neck-stretch',               // Rotating Neck Stretch
	'exr_41n2hjkBReJMbDJk': 'run-on-treadmill',                    // Run on Treadmill (MACHINE)
	'exr_41n2hpDWoTxocW8G': 'scissors',                             // Scissors
	'exr_41n2hTs4q3ihihZs': 'seated-calf-raise-barbell',           // Seated Calf Raise (BARBELL)
	'exr_41n2hNRM1dGGhGYL': 'seated-flexion-extension-neck',       // Seated Flexion And Extension Neck
	'exr_41n2hcFJpBvAkXCP': 'seated-row-towel',                    // Seated Row with Towel
	'exr_41n2hJ5Harig7K7F': 'seated-shoulder-flexor-stretch',      // Seated Shoulder Flexor Depresor Retractor Stretch
	'exr_41n2hw4iksLYXESz': 'seated-shoulder-flexor-stretch-bent-knee', // Seated Shoulder Flexor ... Bent Knee
	'exr_41n2hPvwqp7Pwvks': 'seated-single-leg-hamstring-stretch', // Seated Single Leg Hamstring Stretch
	'exr_41n2hu5r8WMaLUkH': 'seated-straight-leg-calf-stretch',    // Seated Straight Leg Calf Stretch
	'exr_41n2hdsGcuzs4WrV': 'self-assisted-inverted-pullover',     // Self Assisted Inverted Pullover
	'exr_41n2hZqkvM55qJve': 'shoulder-stretch-behind-back',        // Shoulder Stretch Behind the Back
	'exr_41n2hnAGfMhp95LQ': 'shoulder-tap-push-up',                // Shoulder Tap Push-up
	'exr_41n2haAabPyN5t8y': 'side-lunge',                          // Side Lunge
	'exr_41n2hRaLxY7YfNbg': 'side-lunge-stretch',                  // Side Lunge Stretch
	'exr_41n2hrN2RCZBZU9h': 'side-neck-stretch',                   // Side Neck Stretch
	'exr_41n2hsZWJA1ujZUd': 'side-push-neck-stretch',              // Side Push Neck Stretch
	'exr_41n2hw1QspZ6uXoW': 'side-toe-touching',                   // Side Toe Touching
	'exr_41n2hMydkzFvswVX': 'side-two-front-toe-touching',         // Side Two Front Toe Touching
	'exr_41n2hPxDaq9kFjiL': 'side-wrist-pull-stretch',             // Side Wrist Pull Stretch
	'exr_41n2hLpyk6MsV85U': 'single-leg-deadlift-arm-extended',    // Single Leg Bodyweight Deadlift with Arm and Leg Extended
	'exr_41n2hd78zujKUEWK': 'single-leg-squat',                    // Single Leg Squat
	'exr_41n2hsSnmS946i2k': 'single-leg-squat-with-support',       // Single Leg Squat with Support
	'exr_41n2hw8nSYiaCXW1': 'sissy-squat',                         // Sissy Squat
	'exr_41n2hvjrFJ2KjzGm': 'sit',                                 // Sit
	'exr_41n2hnFD2bT6sruf': 'sliding-floor-bridge-curl-towel',     // Sliding Floor Bridge Curl on Towel
	'exr_41n2hadPLLFRGvFk': 'sliding-floor-pulldown-towel',        // Sliding Floor Pulldown on Towel
	'exr_41n2hSxsNAV8tGS6': 'split-squat',                         // Split Squat
	'exr_41n2hHRszDHarrxK': 'split-squats',                        // Split Squats (variant)
	'exr_41n2hmGR8WuVfe1U': 'squat',                               // Squat (bodyweight)
	'exr_41n2hRicz5MdZEns': 'squat-thrust',                        // Squat Thrust
	'exr_41n2homrPqqs8coG': 'stair-up',                            // Stair Up
	'exr_41n2hSq88Ni3KCny': 'standing-alternate-arms-circling',    // Standing Alternate Arms Circling
	'exr_41n2hUBVSgXaKhau': 'standing-arms-circling',              // Standing Arms Circling
	'exr_41n2hynD9srC1kY7': 'standing-arms-flinging',              // Standing Arms Flinging
	'exr_41n2hzfRXQDaLYJh': 'standing-calf-raise',                 // Standing Calf Raise (bodyweight)
	'exr_41n2hdWu3oaCGdWT': 'standing-calf-raise-dumbbell',        // Standing Calf Raise (DUMBBELL)
	'exr_41n2hvzxocyjoGgL': 'standing-leg-calf-raise-barbell',     // Standing Leg Calf Raise (BARBELL)
	'exr_41n2huXeEFSaqo4G': 'standing-one-arm-circling',           // Standing One Arm Circling
	'exr_41n2hXYRxFHnQAD4': 'stationary-bike-run',                 // Stationary Bike Run (MACHINE)
	'exr_41n2hXvPyEyMBgNR': 'step-up-on-chair',                   // Step-up on Chair
	'exr_41n2hYAP9oGEZk2P': 'sumo-squat',                         // Sumo Squat
	'exr_41n2hWxnJoGwbJpa': 'superman-row-towel',                  // Superman Row with Towel
	'exr_41n2hoifHqpb7WK9': 'supination-bar-suspension-stretch',   // Supination Bar Suspension Stretch
	'exr_41n2hdkBpqwoDmVq': 'suspended-row',                       // Suspended Row
	'exr_41n2hLUqpev5gSzJ': 'thoracic-bridge',                     // Thoracic Bridge
	'exr_41n2hndkoGHD1ogh': 'tricep-dip-alt',                      // Triceps Dip (variant)
	'exr_41n2hHH9bNfi98YU': 'triceps-dips-floor',                  // Triceps Dips Floor
	'exr_41n2hLA8xydD4dzE': 'triceps-press',                       // Triceps Press
	'exr_41n2hYWXejezzLjv': 'two-front-toe-touching',              // Two Front Toe Touching
	'exr_41n2hqjVS3nwBoyr': 'two-legs-hammer-curl-towel',          // Two Legs Hammer Curl with Towel
	'exr_41n2hx6oyEujP1B6': 'two-legs-reverse-biceps-curl-towel',  // Two Legs Reverse Biceps Curl with Towel
	'exr_41n2huc12BsuDNYQ': 'v-up',                                // V-up
	'exr_41n2hLZZAH2F2UkS': 'walk-elliptical-cross-trainer',      // Walk Elliptical Cross Trainer (MACHINE)
	'exr_41n2hmFcGGUCS289': 'walking-high-knees-lunge',            // Walking High Knees Lunge
	'exr_41n2hQHmRSoUkk9F': 'walking-lunge',                      // Walking Lunge
	'exr_41n2hkCHzg1AXdkV': 'walking-on-incline-treadmill',       // Walking on Incline Treadmill (MACHINE)
	'exr_41n2hoyHUrhBiEWg': 'walking-on-treadmill',                // Walking on Treadmill (MACHINE)
	'exr_41n2hftBVLiXgtRQ': 'wide-grip-pull-up',                   // Wide Grip Pull-Up
	'exr_41n2hWgAAtQeA3Lh': 'wide-hand-push-up',                  // Wide Hand Push up
	'exr_41n2hozyXuCmDTdZ': 'wrist-circles',                       // Wrist Circles
	'exr_41n2hSF5U97sFAr8': 'wrist-extension-articulations',       // Wrist - Extension - Articulations
	'exr_41n2hQcqPQ37Dmxj': 'wrist-flexion-articulations',         // Wrist - Flexion - Articulations
};

/** Reverse lookup: internal slug → ExerciseDB ID */
export const slugToExerciseDbId: Record<string, string> = Object.fromEntries(
	Object.entries(exerciseDbMap).map(([edbId, slug]) => [slug, edbId])
);
