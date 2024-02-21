<script lang="ts">
	import Check from '$lib/assets/icons/Check.svelte';
	import Cross from '$lib/assets/icons/Cross.svelte';
	import SeasonSelect from '$lib/components/SeasonSelect.svelte';
	import '$lib/css/action_button.css'
	import '$lib/css/nordtheme.css'
	import { redirect } from '@sveltejs/kit';
	import EditRecipeNote from '$lib/components/EditRecipeNote.svelte';

    	export let data: PageData;
	let preamble = data.recipe.preamble
	let addendum = data.recipe.addendum
	let image_preview_url="https://bocken.org/static/rezepte/thumb/" + data.recipe.short_name + ".webp?v=" + data.recipe.dateModified;
	let note = data.recipe.note

	import { season } from '$lib/js/season_store';
	import { portions } from '$lib/js/portions_store';

	portions.update(() => data.recipe.portions)
	let portions_local
	portions.subscribe((p) => {
		portions_local = p
		});

	season.update(() => data.recipe.season)
	let season_local
	season.subscribe((s) => {
		season_local = s
	});


	import { img } from '$lib/js/img_store';
	let img_local
	img.update(() => "")
	img.subscribe((i) => {
		img_local = i});

	let old_short_name = data.recipe.short_name

	export let card_data ={
		icon: data.recipe.icon,
		category: data.recipe.category,
		name: data.recipe.name,
		description: data.recipe.description,
		tags: data.recipe.tags,
	}
	export let add_info ={
		preparation: data.recipe.preparation,
		fermentation: {
			bulk: data.recipe.fermentation.bulk,
			final: data.recipe.fermentation.final,
		},
		baking: {
			length: data.recipe.baking.length,
			temperature: data.recipe.baking.temperature,
			mode: data.recipe.baking.mode,
		},
		total_time: data.recipe.total_time,
		cooking: data.recipe.cooking,
	}

	let images = data.recipe.images

	let short_name = data.recipe.short_name
	let datecreated = data.recipe.datecreated
	let datemodified = new Date()

    	import type { PageData } from './$types';
	import CardAdd from '$lib/components/CardAdd.svelte';

	import CreateIngredientList from '$lib/components/CreateIngredientList.svelte';
	export let ingredients = data.recipe.ingredients

	import CreateStepList from '$lib/components/CreateStepList.svelte';
	export let instructions = data.recipe.instructions


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

	async function doDelete(){
		const response = confirm("Bist du dir sicher, dass du das Rezept löschen willst?")
		if(!response){
			return
		}
		const res_img = await fetch('/api/rezepte/img/delete', {
			method: 'POST',
			body: JSON.stringify({
				name: old_short_name,
				}),
			headers : {
       				'content-type': 'application/json',
				credentials: 'include',
				}
			})
		if(!res_img.ok){
			const item = await res_img.json();
			//alert(item.message)
			return
		}
		return
		const res = await fetch('/api/rezepte/delete', {
			method: 'POST',
			body: JSON.stringify({
				old_short_name,
			headers: {
       				'content-type': 'application/json',
     				}
			})

		})
		if(res.ok){
			const url = location.href.split('/')
			url.splice(url.length -2, 2);
			location.assign(url.join('/'))
		}
		else{
			const item = await res.json();
			// alert(item.message)
		}
	}
	async function doEdit() {
		// two cases:
		//new image uploaded (not implemented yet)
		// new short_name -> move images as well

		// if new image
		console.log("img_local", img_local)
		if(img_local != ""){
			async function delete_img(){
				const res = await fetch('/api/rezepte/img/delete', {
					method: 'POST',
					body: JSON.stringify({
						name: old_short_name,
						}),
					headers : {
       						'content-type': 'application/json',
						credentials: 'include',
						}
				})
				if(!res.ok){
					const item = await res.json();
					// alert(item.message)
				}
			}
			async function upload_img(){
        			const data = {
					image: img_local,
					name: short_name,
				}
        			const res = await fetch(`/api/rezepte/img/add`, {
        			    method: 'POST',
        			    headers: {
        			        'Content-Type': 'application/json',
        			        Accept: 'application/json',
				    	credentials: 'include',
        			    },
        			    body: JSON.stringify(data)
        			});
				if(!res.ok){
					const item = await res.json();
					// alert(item.message)
				}
			}
			delete_img()
			upload_img()
		}
		// case new short_name:
		else if(short_name != old_short_name){
			console.log("MOVING")
			const res_img = await fetch('/api/rezepte/img/mv', {
				method: 'POST',
				headers: {
        			        'Content-Type': 'application/json',
        			        Accept: 'application/json',
					credentials: 'include',
        			    },
				body: JSON.stringify({
					old_name: old_short_name,
					new_name: short_name,
				})
			})
			if(!res_img.ok){
				const item = await res_img.json();
				//alert(item.message)
				return
			}
		}
		const res = await fetch('/api/rezepte/edit', {
			method: 'POST',
			body: JSON.stringify({
				recipe: {
					...card_data,
					...add_info,
					images, // TODO
					season: season_local,
					short_name,
					datecreated,
					portions: portions_local,
					datemodified,
					instructions,
					ingredients,
					addendum,
					preamble,
					note,
				},
				old_short_name,
			headers: {
       				'content-type': 'application/json',
				credentials: 'include',
     				}
			})
		})
		if(res.ok){
			const url = location.href.split('/');
			url.splice(url.length -2, 2);
			url.push(short_name);
			location.assign(url.join('/'))
		}
		else{
			const item = await res.json()
			//alert(item.message)
		}
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
@media (prefers-color-scheme: dark){
	.title{
		background-color: var(--nord6-dark);
	}
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
button.action_button{
	animation: unset !important;
	font-size: 1.3rem;
	color: white;
}
.submit_buttons{
	display: flex;
	margin-inline: auto;
	max-width: 1000px;
	margin-block: 1rem;
	justify-content: center;
	align-items: center;
	gap: 2rem;
}
.submit_buttons p{
	padding: 0;
	padding-right: 0.5em;
	margin: 0;
}
@media (prefers-color-scheme: dark){
	:global(body){
		background-color: var(--background-dark);
	}
}
</style>
<h1>Rezept editieren</h1>
<CardAdd {card_data} {image_preview_url} ></CardAdd>

<h3>Kurzname (für URL):</h3>
<input bind:value={short_name} placeholder="Kurzname"/>

<div class=title_container>
<div class=title>
<h4>Eine etwas längere Beschreibung:</h4>
<p bind:innerText={preamble} contenteditable></p>
<div class=tags>
<h4>Saison:</h4>
<SeasonSelect></SeasonSelect>
<EditRecipeNote><p contenteditable bind:innerText={note}></p></EditRecipeNote>
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

<div class=submit_buttons>
<button class=action_button on:click={doDelete}><p>Löschen</p><Cross fill=white width=2rem height=2rem></Cross></button>
<button class=action_button on:click={doEdit}><p>Speichern</p><Check fill=white width=2rem height=2rem></Check></button>
</div>
