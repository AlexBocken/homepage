// Translation status enum
export type TranslationStatus = 'pending' | 'approved' | 'needs_update';

// Translation metadata for tracking changes
export type TranslationMetadata = {
  lastModifiedGerman?: Date;
  fieldsModifiedSinceTranslation?: string[];
};

// Translated recipe type (English version)
export type TranslatedRecipeType = {
  short_name: string;
  name: string;
  description: string;
  preamble?: string;
  addendum?: string;
  note?: string;
  category: string;
  tags?: string[];
  ingredients?: [{
    name?: string;
    list: [{
      name: string;
      unit: string;
      amount: string;
    }]
  }];
  instructions?: [{
    name?: string;
    steps: string[];
  }];
  images?: [{
    alt: string;
    caption?: string;
  }];
  translationStatus: TranslationStatus;
  lastTranslated?: Date;
  changedFields?: string[];
};

// Full recipe model with translations
export type RecipeModelType = {
  _id: string;
  short_name: string;
  name: string;
  category: string;
  icon: string;
  dateCreated: Date;
  dateModified: Date;
  images?: [{
	  mediapath: string;
	  alt: string;
	  caption?: string
  }];
  description: string;
  tags: [string];
  season: [number];
  baking?: {
	  temperature: string;
	  length: string;
	  mode: string;
  }
  preparation?: string;
  fermentation?:{
	  bulk: string;
	  final: string;
	}
  portions?: string;
  cooking?: string;
  total_time?: string;
  ingredients?: [{
	  name?: string;
	  list: [{
		  name: string;
		  unit: string;
		  amount: string;
	  }]
  }]
  instructions?: [{
	  name?: string;
	  steps: [string]
  }]
  preamble?: String
  addendum?: string
  translations?: {
    en?: TranslatedRecipeType;
  };
  translationMetadata?: TranslationMetadata;
};

export type BriefRecipeType = {
	_id: string;
	short_name: string;
	name: string;
	category: string;
	icon: string;
	dateCreated: Date;
	dateModified: Date;
	images?: [{
		mediapath: string;
		alt: string;
		caption?: string;
	}]
	description: string;
	tags: [string];
	season: [number];
}
