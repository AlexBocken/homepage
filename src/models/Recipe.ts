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
    }],
    description: {type: String, required: true},
    note: {type: String},
    tags : [String],
    season : [Number],
    baking: { temperature: {type:String, default: ""},
	      length: {type:String, default: ""},
	      mode: {type:String, default: ""},
    },
    preparation : {type:String, default: ""},
    fermentation: { bulk: {type:String, default: ""},
	           final: {type:String, default: ""},

	},
    portions :{type:String, default: ""},
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

     // Translation metadata for tracking changes
     translationMetadata: {
       lastModifiedGerman: {type: Date},
       fieldsModifiedSinceTranslation: [String],
     },
     }, {timestamps: true}
);

// Indexes for efficient querying
RecipeSchema.index({ "translations.en.short_name": 1 });
RecipeSchema.index({ "translations.en.translationStatus": 1 });

export const Recipe = mongoose.model("Recipe", RecipeSchema);
