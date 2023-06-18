import { json } from '@sveltejs/kit';
import { Recipe } from '../../../models/Recipe';
import { dbConnect, dbDisconnect } from '../../../utils/db';

const test_json = [
  {  short_name: "rhabarberkonfi",
  name: "Rharbarberkonfi",
  category: "Aufstrich",
  icon: "☀️",
  datecreated: 20230610,
  datemodified: 20230611,
  images:
	  [ {
		mediapath: "rharbarberkonfi.webp",
		alt: "Ein Brot mit Marmelade darauf.",
  		caption: ""
	    }
	  ],
  description: "Saure Marmelade",
  tags:["marmelade", "schweiz", "sauer", "rhabarber", "zucker", "aufstrich", "marmelade" , "ein weteres langes tag", "und noch eins", "und ein weiteres", "und nochmal"],
  season: [4,5,6],
  baking: {
	  temperature: "160",
	  length: "4 Stunden",
	  mode: "Ober-/Unterhitze"
  },
  preparation: "20 Minuten",
  fermentation: {
	  bulk: "2.5 Stunden",
	  final: "2 Stunden"
  },
  portions: "4 Pizzen",
  total_time: "1 Tag",
  ingredients: [ {
	  name: "Teig",
	  list: [
  		{name: "Mehl",
			unit: "g",
			amount: 500
		}		,
		{
			name: "Salz",
			unit: "g",
			amount: 6
		}
  		]},
  	{
	 name: "Füllung",
   	 list: [
	   {
		   name: "Aprikose",
		   unit: "Stück",
		   amount: 10
	   },
	   {
		   name: "Zuckerwürfel",
		   unit: "Stück",
                   amount: 10
	   }
   ] }
  ],
  instructions: [
	  {name: "",
	   steps: [
		"Den Rhabarber schälen und in ca. 1 cm große Stücke schneiden",
		"Have fun"
	   ]
	  }
  ]
 },
   {  short_name: "osterfladen",
  name: "Osterfladen",
  category: "Aufstrich",
  icon: "🐇",
  datecreated: 20230610,
  datemodified: 20230611,
  images:
	  [ {
		mediapath: "osterfladen.webp",
		alt: "Ein Brot mit Marmelade darauf.",
  		caption: ""
	    }
	  ],
  description: "Saure Marmelade",
  tags:["marmelade", "schweiz", "sauer", "rhabarber", "zucker", "aufstrich", "marmelade"],
  season: [2,3,4],
  baking: {
	  temperature: "160",
	  length: "4 Stunden",
	  mode: "Ober-/Unterhitze"
  },
  preparation: "20 Minuten",
  fermentation: {
	  bulk: "2.5 Stunden",
	  final: "2 Stunden"
  },
  portions: "4 Pizzen",
  total_time: "1 Tag",
  ingredients: [ {
	  name: "Teig",
	  list: [
  		{name: "Mehl",
			unit: "g",
			amount: 500
		}		,
		{
			name: "Salz",
			unit: "g",
			amount: 6
		}
  		]},
  	{
	 name: "Füllung",
   	 list: [
	   {
		   name: "Aprikose",
		   unit: "Stück",
		   amount: 10
	   },
	   {
		   name: "Zuckerwürfel",
		   unit: "Stück",
                   amount: 10
	   }
   ] }
  ],
  instructions: [
	  {name: "",
	   steps: [
		"Den Rhabarber schälen und in ca. 1 cm große Stücke schneiden",
		"Have fun"
	   ]
	  }
  ]
 },
];

// seed data
export const GET = async () => {
  await dbConnect();
  await Recipe.deleteMany();
  await Recipe.insertMany(test_json);
  await dbDisconnect();
  return json({
    message: 'seeded',
  });
}
