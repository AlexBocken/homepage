import mongoose from 'mongoose';

const RecipeSchema = new mongoose.Schema(
  {
    short_name: {type: String, required: true, unique: true},
    name : {type: String, required: true,},
    category : {type: String, required: true,},
    icon: {type: String, required: true},
    dateCreated: {type: Date, default: Date.now},
    dateModified: {type: Date, default: Date.now},
    images: [ {
	    mediapath: {type: String, required: true}, // filename with hash for cache busting: e.g., "maccaroni.a1b2c3d4.webp"
	    alt: String,
	    caption: String,
	    // Blurred stand-in shown until the image decodes: a tiny WebP inside an
	    // SVG that blurs it, as one data: URI (see $lib/server/lqip). Replaced
	    // the dominant-colour hex that used to sit here — a blur carries the
	    // shape of the photo, a flat colour only its average.
	    blur: String,
    }],
    description: {type: String, required: true},
    note: {type: String},
    tags : [String],
    seasonRanges: [{
      _id: false,
      start: {
        _id: false,
        kind: { type: String, enum: ['fixed', 'liturgical'], required: true },
        m: { type: Number },
        d: { type: Number },
        anchor: { type: String, enum: ['easter', 'ash-wednesday', 'palm-sunday', 'pentecost', 'advent-i'] },
        offsetDays: { type: Number, default: 0 },
      },
      end: {
        _id: false,
        kind: { type: String, enum: ['fixed', 'liturgical'], required: true },
        m: { type: Number },
        d: { type: Number },
        anchor: { type: String, enum: ['easter', 'ash-wednesday', 'palm-sunday', 'pentecost', 'advent-i'] },
        offsetDays: { type: Number, default: 0 },
      },
    }],
    baking: { temperature: {type:String, default: ""},
	      length: {type:String, default: ""},
	      mode: {type:String, default: ""},
    },
    preparation : {type:String, default: ""},
    fermentation: { bulk: {type:String, default: ""},
	           final: {type:String, default: ""},

	},
    portions :{type:String, default: ""},
    defaultForm: {
      shape: { type: String, enum: ['round', 'rectangular', 'gugelhupf'] },
      diameter: { type: Number },
      width: { type: Number },
      length: { type: Number },
      innerDiameter: { type: Number },
    },
    cooking: {type:String, default: ""},
    total_time : {type:String, default: ""},
    ingredients: [{
      // Common fields
      name: { type: String, default: "" },
      type: { type: String, enum: ['section', 'reference'], default: 'section' },

      // For type='section' (existing structure)
      list: [{
        name: { type: String, default: "" },
        unit: String,
        amount: String,
      }],

      // For type='reference' (new base recipe references)
      baseRecipeRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' },
      includeIngredients: { type: Boolean, default: true },
      showLabel: { type: Boolean, default: true },
      labelOverride: { type: String, default: "" },
      baseMultiplier: { type: Number, default: 1 },
      itemsBefore: [{
        name: { type: String, default: "" },
        unit: String,
        amount: String,
      }],
      itemsAfter: [{
        name: { type: String, default: "" },
        unit: String,
        amount: String,
      }],
    }],
     instructions: [{
       // Common fields
       name: { type: String, default: "" },
       type: { type: String, enum: ['section', 'reference'], default: 'section' },

       // For type='section' (existing structure)
       steps: [String],

       // For type='reference' (new base recipe references)
       baseRecipeRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' },
       includeInstructions: { type: Boolean, default: true },
       showLabel: { type: Boolean, default: true },
       labelOverride: { type: String, default: "" },
       baseMultiplier: { type: Number, default: 1 },
       stepsBefore: [String],
       stepsAfter: [String],
     }],
     preamble : String,
     addendum : String,

     // Base recipe flag
     isBaseRecipe: {type: Boolean, default: false},

     // English translations
     translations: {
       en: {
         short_name: {type: String},  // English slug for URLs
         name: {type: String},
         description: {type: String},
         preamble: {type: String},
         addendum: {type: String},
         note: {type: String},
         category: {type: String},
         tags: [String],
         portions: {type: String},
         preparation: {type: String},
         cooking: {type: String},
         total_time: {type: String},
         baking: {
           temperature: {type: String},
           length: {type: String},
           mode: {type: String},
         },
         fermentation: {
           bulk: {type: String},
           final: {type: String},
         },
         ingredients: [{
           name: { type: String, default: "" },
           type: { type: String, enum: ['section', 'reference'], default: 'section' },
           list: [{
             name: { type: String, default: "" },
             unit: String,
             amount: String,
           }],
           baseRecipeRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' },
           includeIngredients: { type: Boolean, default: true },
           showLabel: { type: Boolean, default: true },
           labelOverride: { type: String, default: "" },
           baseMultiplier: { type: Number, default: 1 },
           itemsBefore: [{
             name: { type: String, default: "" },
             unit: String,
             amount: String,
           }],
           itemsAfter: [{
             name: { type: String, default: "" },
             unit: String,
             amount: String,
           }],
         }],
         instructions: [{
           name: { type: String, default: "" },
           type: { type: String, enum: ['section', 'reference'], default: 'section' },
           steps: [String],
           baseRecipeRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' },
           includeInstructions: { type: Boolean, default: true },
           showLabel: { type: Boolean, default: true },
           labelOverride: { type: String, default: "" },
           baseMultiplier: { type: Number, default: 1 },
           stepsBefore: [String],
           stepsAfter: [String],
         }],
         images: [{
           alt: String,
           caption: String,
         }],
         translationStatus: {
           type: String,
           enum: ['pending', 'approved', 'needs_update'],
           default: 'pending'
         },
         lastTranslated: {type: Date},
         changedFields: [String],
       }
     },

     // Nutrition calorie/macro mapping for each ingredient
     nutritionMappings: [{
       sectionIndex: { type: Number, required: true },
       ingredientIndex: { type: Number, required: true },
       ingredientName: { type: String },
       ingredientNameDe: { type: String },
       source: { type: String, enum: ['bls', 'usda', 'manual'] },
       fdcId: { type: Number },
       blsCode: { type: String },
       nutritionDbName: { type: String },
       matchConfidence: { type: Number },
       matchMethod: { type: String, enum: ['exact', 'embedding', 'manual', 'none'] },
       gramsPerUnit: { type: Number },
       defaultAmountUsed: { type: Boolean, default: false },
       defaultAmount: { type: Number },
       unitConversionSource: { type: String, enum: ['direct', 'density', 'usda_portion', 'estimate', 'manual', 'none'] },
       manuallyEdited: { type: Boolean, default: false },
       // A person checked this row and accepted it, silencing the unsure warning.
       confirmed: { type: Boolean, default: false },
       excluded: { type: Boolean, default: false },
       recipeRef: { type: String },
       recipeRefMultiplier: { type: Number, default: 1 },
     }],

     // What the finished dish weighs, when the ingredient sum is the wrong answer
     // (baking loss, reduction, draining). Denominator only — see $lib/js/finalWeight.
     finalWeight: {
       mode: { type: String, enum: ['auto', 'relative', 'absolute'], default: 'auto' },
       percent: { type: Number },
       grams: { type: Number },
     },

     // Cached nutrition per 100g (for round-off suggestions & listing)
     cachedPer100g: { type: mongoose.Schema.Types.Mixed },
     cachedTotalGrams: { type: Number },

     // Translation metadata for tracking changes
     translationMetadata: {
       lastModifiedGerman: {type: Date},
       fieldsModifiedSinceTranslation: [String],
     },
     }, {timestamps: true}
);

// Indexes for efficient querying
RecipeSchema.index({ short_name: 1 });
RecipeSchema.index({ 'seasonRanges.start.anchor': 1 });
RecipeSchema.index({ "translations.en.short_name": 1 });
RecipeSchema.index({ "translations.en.translationStatus": 1 });

import type { RecipeModelType } from '$types/types';

// Delete cached model on HMR so schema changes (e.g. new fields) are picked up
delete mongoose.models.Recipe;
export const Recipe = mongoose.model<RecipeModelType>("Recipe", RecipeSchema);
