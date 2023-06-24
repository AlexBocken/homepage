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
     },
);

export const Recipe = mongoose.model("Recipe", RecipeSchema);
