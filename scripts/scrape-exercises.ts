import { dbConnect } from '../src/utils/db';
import { Exercise } from '../src/models/Exercise';

// ExerciseDB API configuration
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'your-rapidapi-key-here';
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';
const BASE_URL = 'https://exercisedb.p.rapidapi.com';

interface ExerciseDBExercise {
  id: string;
  name: string;
  gifUrl: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
}

async function fetchFromExerciseDB(endpoint: string): Promise<any> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from ExerciseDB: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function scrapeAllExercises(): Promise<void> {
  console.log('🚀 Starting ExerciseDB scraping...');
  
  try {
    await dbConnect();
    console.log('✅ Connected to database');

    // Fetch all exercises
    console.log('📡 Fetching exercises from ExerciseDB...');
    const exercises: ExerciseDBExercise[] = await fetchFromExerciseDB('/exercises?limit=2000');
    
    console.log(`📊 Found ${exercises.length} exercises`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const exercise of exercises) {
      try {
        // Check if exercise already exists
        const existingExercise = await Exercise.findOne({ exerciseId: exercise.id });
        
        if (existingExercise) {
          skipped++;
          continue;
        }

        // Determine difficulty based on equipment and complexity
        let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate';
        
        if (exercise.equipment === 'body weight') {
          difficulty = 'beginner';
        } else if (exercise.equipment.includes('barbell') || exercise.equipment.includes('olympic')) {
          difficulty = 'advanced';
        } else if (exercise.equipment.includes('dumbbell') || exercise.equipment.includes('cable')) {
          difficulty = 'intermediate';
        }

        // Create new exercise
        const newExercise = new Exercise({
          exerciseId: exercise.id,
          name: exercise.name,
          gifUrl: exercise.gifUrl,
          bodyPart: exercise.bodyPart.toLowerCase(),
          equipment: exercise.equipment.toLowerCase(),
          target: exercise.target.toLowerCase(),
          secondaryMuscles: exercise.secondaryMuscles.map(m => m.toLowerCase()),
          instructions: exercise.instructions,
          difficulty,
          isActive: true
        });

        await newExercise.save();
        imported++;

        if (imported % 100 === 0) {
          console.log(`⏳ Imported ${imported} exercises...`);
        }

      } catch (error) {
        console.error(`❌ Error importing exercise ${exercise.name}:`, error);
        errors++;
      }
    }

    console.log('✅ Scraping completed!');
    console.log(`📈 Summary: ${imported} imported, ${skipped} skipped, ${errors} errors`);

  } catch (error) {
    console.error('💥 Scraping failed:', error);
    throw error;
  }
}

async function updateExistingExercises(): Promise<void> {
  console.log('🔄 Updating existing exercises...');
  
  try {
    await dbConnect();
    
    const exercises: ExerciseDBExercise[] = await fetchFromExerciseDB('/exercises?limit=2000');
    
    let updated = 0;
    
    for (const exercise of exercises) {
      try {
        const existingExercise = await Exercise.findOne({ exerciseId: exercise.id });
        
        if (existingExercise) {
          // Update with new data from API
          existingExercise.name = exercise.name;
          existingExercise.gifUrl = exercise.gifUrl;
          existingExercise.bodyPart = exercise.bodyPart.toLowerCase();
          existingExercise.equipment = exercise.equipment.toLowerCase();
          existingExercise.target = exercise.target.toLowerCase();
          existingExercise.secondaryMuscles = exercise.secondaryMuscles.map(m => m.toLowerCase());
          existingExercise.instructions = exercise.instructions;
          
          await existingExercise.save();
          updated++;
          
          if (updated % 100 === 0) {
            console.log(`⏳ Updated ${updated} exercises...`);
          }
        }
      } catch (error) {
        console.error(`❌ Error updating exercise ${exercise.name}:`, error);
      }
    }
    
    console.log(`✅ Updated ${updated} exercises`);
    
  } catch (error) {
    console.error('💥 Update failed:', error);
    throw error;
  }
}

async function getExerciseStats(): Promise<void> {
  try {
    await dbConnect();
    
    const totalExercises = await Exercise.countDocuments();
    const activeExercises = await Exercise.countDocuments({ isActive: true });
    
    const bodyParts = await Exercise.distinct('bodyPart');
    const equipment = await Exercise.distinct('equipment');
    const targets = await Exercise.distinct('target');
    
    console.log('📊 Exercise Database Stats:');
    console.log(`   Total exercises: ${totalExercises}`);
    console.log(`   Active exercises: ${activeExercises}`);
    console.log(`   Body parts: ${bodyParts.length} (${bodyParts.join(', ')})`);
    console.log(`   Equipment types: ${equipment.length}`);
    console.log(`   Target muscles: ${targets.length}`);
    
  } catch (error) {
    console.error('💥 Stats failed:', error);
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'scrape':
    scrapeAllExercises()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;
    
  case 'update':
    updateExistingExercises()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;
    
  case 'stats':
    getExerciseStats()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;
    
  default:
    console.log('Usage: tsx scripts/scrape-exercises.ts [command]');
    console.log('Commands:');
    console.log('  scrape  - Import all exercises from ExerciseDB');
    console.log('  update  - Update existing exercises with latest data');
    console.log('  stats   - Show database statistics');
    process.exit(0);
}