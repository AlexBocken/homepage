// Translation status enum
export type TranslationStatus = 'pending' | 'approved' | 'needs_update';

// Translation metadata for tracking changes
export type TranslationMetadata = {
  lastModifiedGerman?: Date;
  fieldsModifiedSinceTranslation?: string[];
};

// Ingredient discriminated union types
export type IngredientSection = {
  name?: string;
  type: 'section';
  list: [{
    name: string;
    unit: string;
    amount: string;
  }];
};

export type IngredientReference = {
  name?: string;
  type: 'reference';
  baseRecipeRef: string; // ObjectId as string
  includeIngredients: boolean;
  showLabel: boolean;
  labelOverride?: string;
  itemsBefore?: [{
    name: string;
    unit: string;
    amount: string;
  }];
  itemsAfter?: [{
    name: string;
    unit: string;
    amount: string;
  }];
  // Populated after server-side resolution
  resolvedRecipe?: {
    _id: string;
    name: string;
    short_name: string;
    ingredients?: IngredientSection[];
    translations?: any;
  };
};

export type IngredientItem = IngredientSection | IngredientReference;

// Instruction discriminated union types
export type InstructionSection = {
  name?: string;
  type: 'section';
  steps: [string];
};

export type InstructionReference = {
  name?: string;
  type: 'reference';
  baseRecipeRef: string; // ObjectId as string
  includeInstructions: boolean;
  showLabel: boolean;
  labelOverride?: string;
  stepsBefore?: [string];
  stepsAfter?: [string];
  // Populated after server-side resolution
  resolvedRecipe?: {
    _id: string;
    name: string;
    short_name: string;
    instructions?: InstructionSection[];
    translations?: any;
  };
};

export type InstructionItem = InstructionSection | InstructionReference;

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
  ingredients?: IngredientItem[];
  instructions?: InstructionItem[];
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
  ingredients?: IngredientItem[];
  instructions?: InstructionItem[];
  preamble?: String
  addendum?: string
  isBaseRecipe?: boolean;
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
