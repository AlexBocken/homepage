import { json } from '@sveltejs/kit';
import { Recipe } from '../../../models/Recipe';
import { dbConnect, dbDisconnect } from '../../../utils/db';

const test_json = [{
	short_name: "anisbroetli",
	name : "Anisbrötli",
	category: "Guetzli",
	icon: "🎄",
	datecreated: 20230619,
	datemodified: 20230619,
	images: [{
		mediapath: "anisbrot.webp",
		alt: "Ein ganzes Brot",
		caption: "",
	}],
	description: "Einfach und sehr lecker",
	tags: ["backen", "advent", "schweiz", "deutschland", "anis", "weihnachtenn", "kekse"],
	season: [ 12,1],
	baking: {
		temperature: "220",
		length: "40 Minuten",
		mode: "Ober-/Unterhitze",
	},
	  preparation: "20 Minuten",
  fermentation: {
	  bulk: "2.5 Stunden",
	  final: "2 Stunden"
  },
  portions: "4 Pizzen",
  total_time: "1 Tag",
  ingredients: [],
  instructions: []
},
{
	short_name: "alragu",
	name : "Pasta al Ragù",
	category: "Pasta",
	icon: "☀️",
	datecreated: 20230619,
	datemodified: 20230619,
	images: [{
		mediapath: "al_ragu.webp",
		alt: "Ein ganzes Brot",
		caption: "",
	}],
	description: "Einfach und sehr lecker",
	tags: ["pasta", "fleisch", "rind", "italienisch", "bolognese"],
	season: [ 6,7,8,9],
	baking: {
		temperature: "220",
		length: "40 Minuten",
		mode: "Ober-/Unterhitze",
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
  ]},
	{
	short_name: "sauerteigbrot",
	name : "Simples Sauerteigbrot",
	category: "Brot",
	icon: "🍂",
	datecreated: 20230619,
	datemodified: 20230619,
	images: [{
		mediapath: "sauerteigbrot.webp",
		alt: "Ein ganzes Brot",
		caption: "",
	}],
	description: "Einfach und sehr lecker",
	tags: ["brot", "backen", "sauerteig", "hefe"],
	season: [],
	baking: {
		temperature: "220",
		length: "40 Minuten",
		mode: "Ober-/Unterhitze",
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
  ]},
  {  short_name: "rhabarberkonfi",
  name: "Rhabarberkonfi",
  category: "Aufstrich",
  icon: "☀️",
  datecreated: 20230610,
  datemodified: 20230611,
  images:
	  [ {
		mediapath: "rhabarberkonfi.webp",
		alt: "Ein Brot mit Marmelade darauf.",
  		caption: ""
	    }
	  ],
  description: "Saure Marmelade",
  tags:["marmelade", "sauer", "sommer", "süß"],
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
   {  short_name: "osterkuchen",
  name: "Osterkuchen",
  category: "Kuchen",
  icon: "🐇",
  datecreated: 20230610,
  datemodified: 20230611,
  images:
	  [ {
		mediapath: "osterkuchen.webp",
		alt: "Ein Brot mit Marmelade darauf.",
  		caption: ""
	    }
	  ],
  description: "Saure Marmelade",
  tags:["schweiz", "ostern", "milchreis", "aprikosen", 'backen', 'süß', "marmelade"],
  season: [3,4],
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
