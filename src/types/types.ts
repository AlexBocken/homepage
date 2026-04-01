// Nutrition per-100g data shape (shared by BLS and USDA sources)
export type NutritionPer100g = {
  calories: number; protein: number; fat: number; saturatedFat: number;
  carbs: number; fiber: number; sugars: number;
  calcium: number; iron: number; magnesium: number; phosphorus: number;
  potassium: number; sodium: number; zinc: number;
  vitaminA: number; vitaminC: number; vitaminD: number; vitaminE: number;
  vitaminK: number; thiamin: number; riboflavin: number; niacin: number;
  vitaminB6: number; vitaminB12: number; folate: number; cholesterol: number;
  // Amino acids (g/100g) — available from BLS, partially from USDA
  isoleucine?: number; leucine?: number; lysine?: number; methionine?: number;
  phenylalanine?: number; threonine?: number; tryptophan?: number; valine?: number;
  histidine?: number; alanine?: number; arginine?: number; asparticAcid?: number;
  cysteine?: number; glutamicAcid?: number; glycine?: number; proline?: number;
  serine?: number; tyrosine?: number;
};

// Nutrition mapping for calorie/macro tracking per ingredient
export type NutritionMapping = {
  sectionIndex: number;
  ingredientIndex: number;
  ingredientName?: string;
  ingredientNameDe?: string;
  source?: 'bls' | 'usda' | 'manual';
  fdcId?: number;
  blsCode?: string;
  nutritionDbName?: string;
  matchConfidence?: number;
  matchMethod: 'exact' | 'embedding' | 'manual' | 'none';
  gramsPerUnit?: number;
  defaultAmountUsed?: boolean;
  unitConversionSource: 'direct' | 'density' | 'usda_portion' | 'estimate' | 'manual' | 'none';
  manuallyEdited: boolean;
  excluded: boolean;
  per100g?: NutritionPer100g;
};

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
  list: {
    name: string;
    unit: string;
    amount: string;
  }[];
};

export type IngredientReference = {
  name?: string;
  type: 'reference';
  baseRecipeRef: string; // ObjectId as string
  includeIngredients: boolean;
  showLabel: boolean;
  labelOverride?: string;
  baseMultiplier?: number;
  itemsBefore?: {
    name: string;
    unit: string;
    amount: string;
  }[];
  itemsAfter?: {
    name: string;
    unit: string;
    amount: string;
  }[];
  // Populated after server-side resolution
  resolvedRecipe?: {
    _id: string;
    name: string;
    short_name: string;
    ingredients?: IngredientSection[];
    translations?: {
      en?: {
        ingredients?: IngredientItem[];
      };
    };
  };
};

export type IngredientItem = IngredientSection | IngredientReference;

// Instruction discriminated union types
export type InstructionSection = {
  name?: string;
  type: 'section';
  steps: string[];
};

export type InstructionReference = {
  name?: string;
  type: 'reference';
  baseRecipeRef: string; // ObjectId as string
  includeInstructions: boolean;
  showLabel: boolean;
  labelOverride?: string;
  baseMultiplier?: number;
  stepsBefore?: string[];
  stepsAfter?: string[];
  // Populated after server-side resolution
  resolvedRecipe?: {
    _id: string;
    name: string;
    short_name: string;
    instructions?: InstructionSection[];
    translations?: {
      en?: {
        instructions?: InstructionItem[];
      };
    };
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
  portions?: string;
  preparation?: string;
  cooking?: string;
  total_time?: string;
  baking?: {
    temperature?: string;
    length?: string;
    mode?: string;
  };
  fermentation?: {
    bulk?: string;
    final?: string;
  };
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
	  caption?: string;
	  color?: string;
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
  defaultForm?: {
    shape: 'round' | 'rectangular' | 'gugelhupf';
    diameter?: number;
    width?: number;
    length?: number;
    innerDiameter?: number;
  };
  cooking?: string;
  total_time?: string;
  ingredients?: IngredientItem[];
  instructions?: InstructionItem[];
  preamble?: String
  addendum?: string
  note?: string;
  isBaseRecipe?: boolean;
  nutritionMappings?: NutritionMapping[];
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
		color?: string;
	}]
	description: string;
	tags: [string];
	season: [number];
}
