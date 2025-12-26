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
	    mediapath: {type: String, required: true},
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
    ingredients : [ { name: {type: String, default: ""},
	    list: [{name: {type: String, default: ""},
		    unit: String,
		    amount: String,
	    }]
    }],
     instructions : [{name: {type: String, default: ""},
     		      steps: [String]}],
     preamble : String,
     addendum : String,

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
         ingredients: [{
           name: {type: String, default: ""},
           list: [{
             name: {type: String, default: ""},
             unit: String,
             amount: String,
           }]
         }],
         instructions: [{
           name: {type: String, default: ""},
           steps: [String]
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

export const Recipe = mongoose.model("Recipe", RecipeSchema);
