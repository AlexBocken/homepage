/**
 * Curated list of common pantry/kitchen foods mapped to BLS codes.
 * Each entry is resolved at runtime against BLS_DB for per100g data.
 */

export interface PantryItem {
	blsCode: string;
	name: string;     // short display name
	nameEn: string;
	group: string;
}

export const PANTRY_FOODS: PantryItem[] = [
	// Grains & Pasta
	{ blsCode: 'C352000', name: 'Reis', nameEn: 'Rice', group: 'grains' },
	{ blsCode: 'E401000', name: 'Pasta', nameEn: 'Pasta', group: 'grains' },
	{ blsCode: 'E510000', name: 'Vollkornpasta', nameEn: 'Whole grain pasta', group: 'grains' },
	{ blsCode: 'C133000', name: 'Haferflocken', nameEn: 'Oat flakes', group: 'grains' },
	{ blsCode: 'C118000', name: 'Quinoa', nameEn: 'Quinoa', group: 'grains' },
	{ blsCode: 'C119200', name: 'Couscous', nameEn: 'Couscous', group: 'grains' },
	{ blsCode: 'C119100', name: 'Bulgur', nameEn: 'Bulgur', group: 'grains' },
	{ blsCode: 'B311000', name: 'Weißbrot', nameEn: 'White bread', group: 'grains' },
	{ blsCode: 'B121000', name: 'Vollkornbrot', nameEn: 'Whole grain bread', group: 'grains' },

	// Meat
	{ blsCode: 'V416100', name: 'Hähnchenbrust', nameEn: 'Chicken breast', group: 'meat' },
	{ blsCode: 'V413000', name: 'Hähnchenfleisch', nameEn: 'Chicken meat', group: 'meat' },
	{ blsCode: 'V486100', name: 'Putenbrust', nameEn: 'Turkey breast', group: 'meat' },
	{ blsCode: 'U201000', name: 'Rindfleisch', nameEn: 'Beef', group: 'meat' },
	{ blsCode: 'U287100', name: 'Rind Oberschale', nameEn: 'Beef top round', group: 'meat' },
	{ blsCode: 'U020100', name: 'Schweinehack', nameEn: 'Pork mince', group: 'meat' },
	{ blsCode: 'U611100', name: 'Schweinefilet', nameEn: 'Pork tenderloin', group: 'meat' },

	// Fish
	{ blsCode: 'T410100', name: 'Lachs', nameEn: 'Salmon', group: 'fish' },
	{ blsCode: 'T121100', name: 'Thunfisch', nameEn: 'Tuna', group: 'fish' },
	{ blsCode: 'T204100', name: 'Kabeljau', nameEn: 'Cod', group: 'fish' },
	{ blsCode: 'T422100', name: 'Forelle', nameEn: 'Trout', group: 'fish' },
	{ blsCode: 'T753100', name: 'Garnelen', nameEn: 'Shrimp', group: 'fish' },
	{ blsCode: 'T107100', name: 'Makrele', nameEn: 'Mackerel', group: 'fish' },

	// Dairy
	{ blsCode: 'M111300', name: 'Vollmilch', nameEn: 'Whole milk', group: 'dairy' },
	{ blsCode: 'M141300', name: 'Joghurt', nameEn: 'Yogurt', group: 'dairy' },
	{ blsCode: 'M713100', name: 'Magerquark', nameEn: 'Low-fat quark', group: 'dairy' },
	{ blsCode: 'M304600', name: 'Emmentaler', nameEn: 'Emmental', group: 'dairy' },
	{ blsCode: 'M402600', name: 'Gouda', nameEn: 'Gouda', group: 'dairy' },
	{ blsCode: 'M012200', name: 'Feta', nameEn: 'Feta', group: 'dairy' },
	{ blsCode: 'Q611000', name: 'Butter', nameEn: 'Butter', group: 'dairy' },
	{ blsCode: 'M173900', name: 'Sahne', nameEn: 'Heavy cream', group: 'dairy' },

	// Eggs
	{ blsCode: 'E111100', name: 'Ei', nameEn: 'Egg', group: 'eggs' },

	// Legumes
	{ blsCode: 'H725100', name: 'Linsen', nameEn: 'Lentils', group: 'legumes' },
	{ blsCode: 'H730000', name: 'Rote Linsen', nameEn: 'Red lentils', group: 'legumes' },
	{ blsCode: 'G770400', name: 'Kichererbsen', nameEn: 'Chickpeas', group: 'legumes' },
	{ blsCode: 'H742100', name: 'Kidneybohnen', nameEn: 'Kidney beans', group: 'legumes' },
	{ blsCode: 'H861000', name: 'Tofu', nameEn: 'Tofu', group: 'legumes' },

	// Vegetables
	{ blsCode: 'G312100', name: 'Brokkoli', nameEn: 'Broccoli', group: 'vegetables' },
	{ blsCode: 'G561100', name: 'Tomate', nameEn: 'Tomato', group: 'vegetables' },
	{ blsCode: 'G543100', name: 'Paprika rot', nameEn: 'Red bell pepper', group: 'vegetables' },
	{ blsCode: 'G211100', name: 'Spinat', nameEn: 'Spinach', group: 'vegetables' },
	{ blsCode: 'G582100', name: 'Zucchini', nameEn: 'Zucchini', group: 'vegetables' },
	{ blsCode: 'G620100', name: 'Karotte', nameEn: 'Carrot', group: 'vegetables' },
	{ blsCode: 'K110100', name: 'Kartoffel', nameEn: 'Potato', group: 'vegetables' },
	{ blsCode: 'K420100', name: 'Süßkartoffel', nameEn: 'Sweet potato', group: 'vegetables' },
	{ blsCode: 'F502100', name: 'Avocado', nameEn: 'Avocado', group: 'vegetables' },

	// Fruits
	{ blsCode: 'F110100', name: 'Apfel', nameEn: 'Apple', group: 'fruits' },
	{ blsCode: 'F503100', name: 'Banane', nameEn: 'Banana', group: 'fruits' },
	{ blsCode: 'F301100', name: 'Erdbeere', nameEn: 'Strawberry', group: 'fruits' },
	{ blsCode: 'F304100', name: 'Heidelbeere', nameEn: 'Blueberry', group: 'fruits' },
	{ blsCode: 'F603100', name: 'Orange', nameEn: 'Orange', group: 'fruits' },

	// Nuts & Seeds
	{ blsCode: 'H210100', name: 'Mandeln', nameEn: 'Almonds', group: 'nuts' },
	{ blsCode: 'H120100', name: 'Walnüsse', nameEn: 'Walnuts', group: 'nuts' },
	{ blsCode: 'H110600', name: 'Erdnüsse', nameEn: 'Peanuts', group: 'nuts' },
	{ blsCode: 'H170100', name: 'Cashews', nameEn: 'Cashews', group: 'nuts' },

	// Oils
	{ blsCode: 'Q120000', name: 'Olivenöl', nameEn: 'Olive oil', group: 'oils' },
];
