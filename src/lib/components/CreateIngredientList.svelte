<script lang='ts'>

import Pen from '$lib/assets/icons/Pen.svelte'
import Cross from '$lib/assets/icons/Cross.svelte'
import Plus from '$lib/assets/icons/Plus.svelte'
import Check from '$lib/assets/icons/Check.svelte'

let ingredients_lists = [
	{name: "",
	ingredients: [],
	}
]

let new_ingredient = {
	amount: "",
	unit: "",
	name: "",
	sublist: "",
}

let edit_ingredient = {
	amount: "",
	unit: "",
	name: "",
	list_index: "",
	ingredient_index: "",
}

let edit_heading = {
	name:"",
	list_index: "",
	}

function get_sublist_index(sublist_name, list){
	for(var i =0; i < list.length; i++){
		if(list[i].name == sublist_name){
			return i
		}
	}
	return -1
}
export function show_modal_edit_subheading_ingredient(list_index){
	edit_heading.name = ingredients_lists[list_index].name
	edit_heading.list_index = list_index
	const el = document.querySelector('#edit_subheading_ingredient_modal')
	el.showModal()
}
export function edit_subheading_and_close_modal(){
	ingredients_lists[edit_heading.list_index].name = edit_heading.name
	const el = document.querySelector('#edit_subheading_ingredient_modal')
	el.close()
}

export function add_new_ingredient(){
	let list_index = get_sublist_index(new_ingredient.sublist, ingredients_lists)
	if(list_index == -1){
		ingredients_lists.push({
			name: new_ingredient.sublist,
			ingredients: [],
		})
		list_index = ingredients_lists.length - 1
	}
	ingredients_lists[list_index].ingredients.push({ ...new_ingredient})
	ingredients_lists = ingredients_lists //tells svelte to update dom
}
export function remove_list(list_index){
	ingredients_lists.splice(list_index, 1);
	ingredients_lists = ingredients_lists //tells svelte to update dom
}
export function remove_ingredient(list_index, ingredient_index){
	ingredients_lists[list_index].ingredients.splice(ingredient_index, 1)
	ingredients_lists = ingredients_lists //tells svelte to update dom
}

export function show_modal_edit_ingredient(list_index, ingredient_index){
	edit_ingredient = {...ingredients_lists[list_index].ingredients[ingredient_index]}
	edit_ingredient.list_index = list_index
	edit_ingredient.ingredient_index = ingredient_index
	const modal_el = document.querySelector("#edit_ingredient_modal");
	modal_el.showModal();
}
export function edit_ingredient_and_close_modal(){
	ingredients_lists[edit_ingredient.list_index].ingredients[edit_ingredient.ingredient_index] = {
	amount: edit_ingredient.amount,
	unit: edit_ingredient.unit,
	name: edit_ingredient.name,
	}
	const modal_el = document.querySelector("#edit_ingredient_modal");
	modal_el.close();
}

</script>

<style>
</style>


{#each ingredients_lists as list, list_index}
	<h3>
	{#if list.name}
		{list.name}
	{:else}
		Leer
	{/if}
	<button class=edit on:click="{() => show_modal_edit_subheading_ingredient(list_index)}">
			<Pen></Pen>	</button>
		<button class=remove on:click="{() => remove_list(list_index)}">
				<Cross></Cross>
		</button>
	</h3>
	<ul>
	{#each list.ingredients as ingredient, ingredient_index}
		<li>{ingredient.amount} {ingredient.unit} {ingredient.name}
		<button class=edit on:click={() => show_modal_edit_ingredient(list_index, ingredient_index)}>
		<Pen></Pen>
		</button>
		<button class=remove on:click="{() => remove_ingredient(list_index, ingredient_index)}">
			<Cross></Cross>
		</button>
	</li>
	{/each}
	</ul>
{/each}

<input type="text" bind:value={new_ingredient.sublist} placeholder="Unterkategorie (optional)">
<div class=ingredient>
	<input type="text" id=amount placeholder="250..." bind:value={new_ingredient.amount}>
	<input type="text" id=unit placeholder="mL..." bind:value={new_ingredient.unit}>
	<input type="text" id=name placeholder="Milch..." bind:value={new_ingredient.name}>
	<button on:click={() => add_new_ingredient()}>
		<Plus></Plus>
	</button>

</div>

<dialog class=ingredient id=edit_ingredient_modal>
	<input type="text" id=amount placeholder="250..." bind:value={edit_ingredient.amount}>
	<input type="text" id=unit placeholder="mL..." bind:value={edit_ingredient.unit}>
	<input type="text" id=name placeholder="Milch..." bind:value={edit_ingredient.name}>
	<button on:click={edit_ingredient_and_close_modal}>
	<Check></Check>
		</button>

</dialog>

<dialog id=edit_subheading_ingredient_modal>
	<input type="text" bind:value={edit_heading.name}>
	<button on:click={edit_subheading_and_close_modal}>
	<Check></Check>
	</button>
</dialog>
