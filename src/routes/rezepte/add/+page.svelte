<script lang="ts">
	import Check from '$lib/assets/icons/Check.svelte';
	import SeasonSelect from '$lib/components/SeasonSelect.svelte';
	import '$lib/css/action_button.css'

    	export let data: PageData;
	let preamble = ""
	let addendum = ""

	import { season } from '$lib/js/season_store';
	import { portions } from '$lib/js/portions_store';
	import { img } from '$lib/js/img_store';
	season.update(() => [])
	let season_local
	season.subscribe((s) => {
		season_local = s
	});
	let portions_local
	portions.update(() => "")
	portions.subscribe((p) => {
		portions_local = p});
	let img_local
	img.update(() => "")
	img.subscribe((i) => {
		img_local = i});



	export let card_data ={
		icon: "",
		category: "",
		name: "",
		description: "",
		tags: [],
	}
	export let add_info ={
		preparation: "",
		fermentation: {
			bulk: "",
			final: "",
		},
		baking: {
			length: "",
			temperature: "",
			mode: "",
		},
		total_time: "",
		cooking: "",
	}

	let password = ""
	let images = []
	let short_name = ""
	let datecreated =  new Date()
	let datemodified = datecreated

    	import type { PageData } from './$types';
	import CardAdd from '$lib/components/CardAdd.svelte';

	import CreateIngredientList from '$lib/components/CreateIngredientList.svelte';
	export let ingredients = []

	import CreateStepList from '$lib/components/CreateStepList.svelte';
	export let instructions = []


	function get_season(){
		let season = []
		const el = document.getElementById("labels");
		for(var i = 0; i < el.children.length; i++){
			if(el.children[i].children[0].children[0].checked){
				season.push(i+1)
			}
		}
		return season
	}
	function write_season(season){
		const el = document.getElementById("labels");
		for(var i = 0; i < season.length; i++){
			el.children[i].children[0].children[0].checked = true
		}
	}

	async function upload_img(){
    		console.log("uploading...")
		console.log(img_local)
        	const data = {
			image: img_local,
			filename: short_name + '.webp',
			bearer: password,
		}
        	await fetch(`/api/img/add`, {
        	    method: 'POST',
        	    headers: {
        	        'Content-Type': 'application/json',
        	        Accept: 'application/json',
			bearer: password,
        	    },
        	    body: JSON.stringify(data)
        	});
		}

	async function doPost () {

		upload_img()
		console.log(add_info.total_time)
		const res = await fetch('/api/add', {
			method: 'POST',
			body: JSON.stringify({
				recipe: {
					...card_data,
					...add_info,
					images: {mediapath: short_name + '.webp', alt: "", caption: ""}, // TODO
					season: season_local,
					short_name,
					portions: portions_local,
					datecreated,
					datemodified,
					instructions,
					ingredients,
					preamble,
					addendum,
				},
			headers: {
       				'content-type': 'application/json',
				bearer: password,
     				}
			})
		})

	}

</script>

<style>
input{
	display: block;
	border: unset;
	margin: 1rem auto;
	padding: 0.5em 1em;
	border-radius: 1000px;
	background-color: var(--nord4);
	font-size: 1.1rem;
	transition: 100ms;

}
input:hover,
input:focus-visible
{
	scale: 1.05 1.05;
}
.list_wrapper{
	margin-inline: auto;
	display: flex;
	flex-direction: row;
	max-width: 1000px;
	gap: 2rem;
	justify-content: center;
}
@media screen and (max-width: 700px){
	.list_wrapper{
		flex-direction: column;
	}
}
input[type=password]{
	box-sizing: border-box;
	font-size: 1.5rem;
	padding-block: 0.5em;
	display: inline;
	width: 100%;
}
.submit_wrapper{
	position: relative;
	margin-inline: auto;
	width: max(300px, 50vw)
}
.submit_wrapper button{
	position: absolute;
	right:-1em;
	bottom: -0.5em;
}
.submit_wrapper h2{
	margin-bottom: 0;
}
h1{
	text-align: center;
	margin-bottom: 2rem;
}
.title_container{
	max-width: 1000px;
	display: flex;
	flex-direction: column;
	margin-inline: auto;
}
.title{
	position: relative;
	width: min(800px, 80vw);
	margin-block: 2rem;
	margin-inline: auto;
	background-color: var(--nord6);
	padding: 1rem 2rem;
}
.title p{
	border: 2px solid var(--nord1);
	border-radius: 10000px;
	padding: 0.5em 1em;
	font-size: 1.1rem;
	transition: 200ms;
}
.title p:hover,
.title p:focus-within{
	scale: 1.02 1.02;
}
.addendum{
	font-size: 1.1rem;
	max-width: 90%;
	margin-inline: auto;
	border: 2px solid var(--nord1);
	border-radius: 45px;
	padding: 1em 1em;
	transition: 100ms;
}
.addendum:hover,
.addendum:focus-within
{
	scale: 1.02 1.02;
}
.addendum_wrapper{
	max-width: 1000px;
	margin-inline: auto;
}
h3{
	text-align: center;
}
</style>
<h1>Rezept erstellen</h1>

<CardAdd {card_data}></CardAdd>

<h3>Kurzname (für URL):</h3>
<input bind:value={short_name} placeholder="Kurzname"/>

<div class=title_container>
<div class=title>
<h4>Eine etwas längere Beschreibung:</h4>
<p bind:innerText={preamble} contenteditable></p>
<div class=tags>
<h4>Saison:</h4>
<SeasonSelect></SeasonSelect>
</div>

</div>
</div>

<div class=list_wrapper>
<div>
<CreateIngredientList {ingredients}></CreateIngredientList>
</div>
<div>
<CreateStepList {instructions} {add_info}></CreateStepList>
</div>
</div>

<div class=addendum_wrapper>
<h3>Nachtrag:</h3>
<div class=addendum bind:innerText={addendum} contenteditable></div>
</div>

<div class=submit_wrapper>
<h2>Neues Rezept hinzufügen:</h2>
<input type="password" placeholder=Passwort bind:value={password}>
<button class=action_button on:click={doPost}><Check fill=white width=2rem height=2rem></Check></button>
</div>
