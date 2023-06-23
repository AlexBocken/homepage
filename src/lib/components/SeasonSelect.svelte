<script lang=ts>
import "$lib/components/nordtheme.css"
import {onMount} from "svelte";
let months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]

export let season : Number[]

export function set_season(){
	let temp = []
	const el = document.getElementById("labels");
	for(var i = 0; i < el.children.length; i++){
		if(el.children[i].children[0].children[0].checked){
			temp.push(i+1)
		}
	}
	season = temp
}

function write_season(season){
	const el = document.getElementById("labels");
	for(var i = 0; i < season.length; i++){
		el.children[i].children[0].children[0].checked = true
	}
}

onMount(() => {
	write_season(season)
});

</script>
<style>
label{
	background-color: var(--nord0);
	color: white;
	padding: 0.25em 1em;
	border-radius: 1000px;
	cursor: pointer;
	position: relative;
	transition: 100ms;
}

.checkbox_container{
	transition: 100ms;
}
.checkbox_container:hover{
	transform: scale(1.1,1.1);
}
label:hover{
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
}

#labels{
	display: flex;
	flex-wrap: wrap;
	flex-direction: row;
	justify-content: center;
	gap: min(1rem, 1dvh);
}
</style>

<div id=labels>
{#each months as month}
	<div class=checkbox_container>
		<label><input type="checkbox" name="checkbox" value="value" on:click={set_season}>{month}</label>
	</div>
{/each}
</div>


<button on:click={() => console.log("season", season)}> PRINT SEASON FROM SEASON_SELECT</button>
