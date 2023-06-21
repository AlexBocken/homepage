import { json } from '@sveltejs/kit';
import { Recipe } from '../../../models/Recipe';
import { dbConnect, dbDisconnect } from '../../../utils/db';

const test_json = [
	{
	short_name: "aelplermagronen",
	name : "Älplermagronen",
	category: "Hauptspeise",
	icon: "🍂",
	datecreated: 20230619,
	datemodified: 20230619,
	images: [{
		mediapath: "aelplermagronen.webp",
		alt: "Älplermagronen serviert mit Apfelmuß",
		caption: "",
	}],
	description: "Alles was das Bauernherz erfreuen lässt in einer Mahlzeit.",
	tags: ["Schweiz", "Käse", "Speck", "Nudeln", "Apfelmuß", "Kartoffeln"],
	season: [6,7,8,9,10,11,12,1],
  	portions: "4 Hauptspeisen",
  	total_time: "30 Minuten",
  	ingredients: [ {
	  name: "",
	  list: [
  		{	name: "Speckwürfel",
			unit: "g",
			amount: "150"
		},
		{
			name: "mittelgroße Zwiebeln",
			unit: "",
			amount: "3",
		},
		{
			name: "Kartoffeln, festkochend",
			unit: "g",
			amount: "400",
		},
		{
			name: "Milch",
			unit: "L",
			amount: "1-2",
		},
  		{
			name: "Maccaroni",
			unit: "g",
			amount: "400",
		},
  		{
			name: "Appenzeller",
			unit: "g",
			amount: "150",
		},
  		{
			name: "<a href=apfelmuss>Apfelmuß</a>",
			unit: "",
			amount: "",
		},

  		]},
  ],
  instructions: [
	  {name: "",
	   steps: [
		"In einem großen Topf oder tiefer Pfanne Speckwürfel anbraten.",
		"Zwiebel in Halbringe schneiden und im gleichen Topf schwitzen lassen.",
		"Kartoffeln schälen und in ~1 cm<sup>3</sup> schneiden.",
		"Wenn Ziwebeln genügend gekocht sind die Kartoffeln hinzufügen und Milch hinzufügen, sodass alles bedeckt ist. Ca. 10 Minuten kochen lassen.",
		"Ca. 1 L Milch hinzugeben. Für den nächsten Schritt wollen wir die Maccaroni hinzufügen. Damit diese nicht zu breiig werden geben wir erst die Milch zu und lassen sie aufkochen.",
		"Wenn die der Topf wieder kocht jetzt die Maccaroni hinzugeben.",
		"Den Käse zerreiben oder in kleine Würfel schneiden.",
		"Ein bis zwei Minuten bevor die Nudeln durchgekocht sind den Käse hinzugeben und schmelzen lassen.",
		"Mit Salz und Muskat würzen.",
		"Den Topf ein bisschen zu früh vom Herd nehmen und ein bisschen auskühlen lassen.",
		"Mit <a href=apfelkompott>Apfelmuß oder Apfelkompott</a> servieren."
	   ]
	  }
  ],
   addendum: "<p>Man kann das Gericht noch dekanter machen indem man zu Teilen Rahm an Stelle von Milch verwendet. Zudem kann man das ganze auch noch in eine Auflaufform geben und im Ofen eine Kruste anbacken</p>",
},
{
	short_name: "baerlauchravioli",
	name : "Bärlauchravioli",
	category: "Pasta",
	icon: "🌷",
	datecreated: 20230619,
	datemodified: 20230619,
	images: [{
		mediapath: "baerlauchravioli.webp",
		alt: "3 Ravioli mit durchscheinender grüner Bärlauchfüllung auf einem Teller.",
		caption: "",
	}],
	description: "Unwiderstehliche Ravioli mit Bärlauchfüllung.",
	tags: ["Bärlauch", "Wald", "Frühling", "Ravioli", "Italien", "Käse"],
	season: [ 2,3,4],
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
	description: "Allemannische Weihnachstkekese bekannt durch seine harte Kruste und weiches Inneres.",
	tags: ["Backen", "Advent", "schweiz", "Deutschland", "Anis", "Weihnachten", "Kekse"],
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
	description: "Eine etwas gehobene Version der klassichen Bolognese.",
	tags: ["Pasta", "Fleisch", "Rind", "Italien", "Bolognese", "Linguine"],
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
	tags: ["Brot", "Backen", "Sauerteig"],
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
  description: "Die erste Marmelade des Jahres mit säuerlicher Note.",
  tags:["Marmelade", "sauer", "Sommer", "süß"],
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
  description: "Ein traditioneller Milchreiskuchen mit Aprikosenmarmelade und Rosinen.",
  tags:["Schweiz", "Ostern", "Milchreis", "Aprikosen", 'Backen', 'süß', "Marmelade"],
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
