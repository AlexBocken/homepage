import mongoose from 'mongoose';

export interface IExercise {
  _id?: string;
  exerciseId: string; // Original ExerciseDB ID
  name: string;
  gifUrl: string; // URL to the exercise animation GIF
  bodyPart: string; // e.g., "chest", "back", "legs"
  equipment: string; // e.g., "barbell", "dumbbell", "bodyweight"
  target: string; // Primary target muscle
  secondaryMuscles: string[]; // Secondary muscles worked
  instructions: string[]; // Step-by-step instructions
  category?: string; // Custom categorization
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  isActive?: boolean; // Allow disabling exercises
  createdAt?: Date;
  updatedAt?: Date;
}

const ExerciseSchema = new mongoose.Schema(
  {
    exerciseId: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true // For fast searching
    },
    gifUrl: {
      type: String,
      required: true
    },
    bodyPart: {
      type: String,
      required: true,
      lowercase: true,
      index: true // For filtering by body part
    },
    equipment: {
      type: String,
      required: true,
      lowercase: true,
      index: true // For filtering by equipment
    },
    target: {
      type: String,
      required: true,
      lowercase: true,
      index: true // For filtering by target muscle
    },
    secondaryMuscles: {
      type: [String],
      default: []
    },
    instructions: {
      type: [String],
      required: true,
      validate: {
        validator: function(instructions: string[]) {
          return instructions.length > 0;
        },
        message: 'Exercise must have at least one instruction'
      }
    },
    category: {
      type: String,
      trim: true
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Text search index for exercise names and instructions
ExerciseSchema.index({
  name: 'text',
  instructions: 'text'
});

// Compound indexes for common queries
ExerciseSchema.index({ bodyPart: 1, equipment: 1 });
ExerciseSchema.index({ target: 1, isActive: 1 });

export const Exercise = mongoose.model<IExercise>("Exercise", ExerciseSchema);