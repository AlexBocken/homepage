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
	  final: string
	}
  portions?: string;
  total_time?: string;
  ingredients?: [{
	  name?: string;
	  list: [{
		  name: string;
		  unit: string;
		  amount: number;
	  }]
  }]
  instructions?: [{
	  name?: string;
	  steps: [string]
  }]
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
