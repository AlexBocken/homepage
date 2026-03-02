<script lang=ts>
import { season } from '$lib/js/season_store.js'
import {onMount} from "svelte";
    import {do_on_key} from "./do_on_key";
let months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]



let season_local: number[] = [];

season.subscribe((s: number[]) => {
	season_local = s;
});

export function set_season(){
	let temp: number[] = [];
	const el = document.getElementById("labels");
	if (!el) return;
	for(var i = 0; i < el.children.length; i++){
		if((el.children[i].children[0].children[0] as HTMLInputElement).checked){
			temp.push(i+1)
		}
	}
	season.update(() => temp)
}

function write_season(season: number[]){
	const el = document.getElementById("labels");
	if (!el) return;
	for(var i = 0; i < season.length; i++){
		(el.children[season[i]-1].children[0].children[0] as HTMLInputElement).checked = true;
	}
}

function toggle_checkbox_on_key(event: Event){
	const target = event.target as HTMLElement;
	const checkbox = target.querySelector('input[type="checkbox"]') as HTMLInputElement;
	if (checkbox) checkbox.checked = !checkbox.checked;
}
onMount(() => {
	write_season(season_local)
});

</script>
<style>
label{
	background-color: var(--nord0);
	color: white;
	padding: 0.25em 1em;
	margin-inline: 0.1em;
	line-height: 2em;
	border-radius: var(--radius-pill);
	cursor: pointer;
	position: relative;
	transition: var(--transition-fast);
	user-select: none;
}

.checkbox_container{
	transition: var(--transition-fast);
}
.checkbox_container:hover,
.checkbox_container:focus-within
{
	transform: scale(1.1,1.1);
}
label:hover,
label:focus-visible
{
	background-color: var(--lightblue);
}

label:has(input:checked){
	background-color: var(--blue);
}
input[type=checkbox],
input[type=checkbox]::before,
input[type=checkbox]::after
{
	all: unset;
	user-select: none;
}

#labels{
	display: flex;
	flex-wrap: wrap;
	flex-direction: row;
	justify-content: center;
	margin-bottom: 1em;

}
</style>

<div id=labels>
{#each months as month}
	<div class=checkbox_container>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<label tabindex="0" onkeydown={(event) => do_on_key(event, 'Enter', false, () => {toggle_checkbox_on_key(event)}) } ><input tabindex=-1 type="checkbox" name="checkbox" value="value" onclick={set_season}>{month}</label>
	</div>
{/each}
</div>
