<script lang="ts">

import Cross from '$lib/assets/icons/Cross.svelte'
import "$lib/css/shake.css"
import "$lib/css/icon.css"

// all data shared with rest of page in card_data
export let card_data
export let image_preview_url

import { img } from '$lib/js/img_store';

if(!card_data.tags){
	card_data.tags = []
}


//locals
let new_tag


export function show_local_image(){
	var file = this.files[0]
	    // allowed MIME types
    var mime_types = [ 'image/webp' ];

    // validate MIME
    if(mime_types.indexOf(file.type) == -1) {
        alert('Error : Incorrect file type');
        return;
    }
    image_preview_url = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = e => {
    	img.update(() => e.target.result.split(',')[1]);
	};
}

export function remove_selected_images(){
	image_preview_url = ""
}


export function add_to_tags(){
	if(new_tag){
		if(! card_data.tags.includes(new_tag)){
			card_data.tags.push(new_tag)
			card_data.tags = card_data.tags;
		}
	}
	new_tag = ""
}
export function remove_from_tags(tag){
	card_data.tags = card_data.tags.filter(item => item !== tag)
}
export function add_on_enter(event){
	if(event.key === 'Enter'){
		add_to_tags()
	}
}
export function remove_on_enter(event, tag){
	if(event.key === 'Enter'){
		card_data.tags = card_data.tags.filter(item => item !== tag)
	}
}
</script>
<style>
.card{
	position: relative;
	margin-inline: auto;
	--card-width: 300px;
	text-decoration: none;
	position: relative;
	box-sizing: border-box;
	font-family: sans-serif;
	width: var(--card-width);
	aspect-ratio: 4/7;
	border-radius: 20px;
	background-size: contain;
	display: flex;
	flex-direction: column;
	justify-content: end;
	transition: 200ms;
	background-color:  var(--blue);
	box-shadow: 0em 0em 2em 0.1em rgba(0, 0, 0, 0.3);
	z-index: 0;
}

.img_label{
	position :absolute;
	z-index: 1;
	top: 0;
	width: 100%;
	height: 100%;
	cursor: pointer;
	display: flex;
	justify-content: center;
	align-items: center;
	border-radius: 20px 20px 0 0 ;
	transition: 200ms;
}
.img_label_wrapper:hover{
	background-color: var(--red);
	box-shadow: 0 2em 1em 0.5em rgba(0,0,0,0.3);
	transform:scale(1.02, 1.02);
}
.img_label_wrapper{
	position: absolute;
	height: 50%;
	width: 100%;
	top:0;
	left: 0;
	border-radius: 20px 20px 0 0;
	transition: 200ms;
}
.img_label_wrapper:hover .delete{
	opacity: 100%;
}
.img_label svg{
	width: 100px;
	height: 100px;
	fill: white;
	transition: 200ms;
}
.delete{
	cursor: pointer;
	all: unset;
	position: absolute;
	top:2rem;
	left: 2rem;
	opacity: 0%;
	z-index: 4;
	transition:200ms;
}
.delete:hover{
	transform: scale(1.2, 1.2);
}
.upload{
	z-index: 1;
}
.img_label:hover .upload{
	transform: scale(1.2, 1.2);
	z-index: 10;
}

#img_picker{
	display: none;
	width: 300px;
	height: 300px;
	position:absolute;
}
input{
	all: unset;
}
input::placeholder{
	all:unset;
}
.card .icon{
	z-index: 3;
	box-sizing: border-box;
	text-decoration: unset;
	text-align:center;
	width: 2.6rem;
	aspect-ratio: 1/1;
	transition: 100ms;
	position: absolute;
	font-size: 1.5rem;
	top:-0.5em;
	right:-0.5em;
	padding: 0.25em;
	background-color: var(--nord6);
	border-radius:1000px;
	box-shadow: 0em 0em 2em 0.1em rgba(0, 0, 0, 0.6);
}
.card .icon:hover,
.card .icon:focus-visible
{
	box-shadow: 0em 0em 1em 0.2em rgba(0, 0, 0, 0.6);
	transform:scale(1.2, 1.2)
}
.card:hover,
.card:focus-within{
	transform: scale(1.02,1.02);
	box-shadow: 0.2em 0.2em 2em 1em rgba(0, 0, 0, 0.3);
}

.card img{
	height: 50%;
	object-fit: cover;
	border-top-left-radius: inherit;
	border-top-right-radius: inherit;
}
.card .title {
	position: relative;
	box-sizing: border-box;
	padding-top: 0.5em;
	height: 50%;
	width: 100% ;
	border-bottom-left-radius: inherit;
	border-bottom-right-radius: inherit;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	transition: 100ms;
}
.card .name{
	all: unset;
	width:100%;
	font-size: 2em;
	color: white;
	padding-inline: 0.5em;
	padding-block: 0.2em;
}
.card .name:hover{
	color:var(--nord0);
}
.card .description{
	box-sizing:border-box;
	border: 2px solid var(--nord5);
	border-radius: 30px;
	padding-inline: 1em;
	padding-block: 0.5em;
	margin-inline: 1em;
	margin-top: 0;
	color: var(--nord4);
	width: calc(300px - 2em); /*??*/
}
.card .description:hover{
	color: var(--nord0);
	border: 2px solid var(--nord0);
}
.card .tags{
	display: flex;
	flex-wrap: wrap-reverse;
	overflow: hidden;
	column-gap: 0.25em;
	padding-inline: 0.5em;
	padding-top: 0.25em;
	margin-bottom:0.5em;
	flex-grow: 0;
}
.card .tag{
	cursor: pointer;
	text-decoration: unset;
	background-color: var(--nord4);
	color: var(--nord0);
	border-radius: 100px;
	padding-inline: 1em;
	line-height: 1.5em;
	margin-bottom: 0.5em;
	transition: 100ms;
	box-shadow: 0.2em 0.2em 0.2em 0.05em rgba(0, 0, 0, 0.3);
}
.card .tag:hover,
.card .tag:focus-visible,
.card .tag:focus-within
{
	transform: scale(1.04, 1.04);
	background-color: var(--orange);
	box-shadow: 0.2em 0.2em 0.2em 0.1em rgba(0, 0, 0, 0.3);
}

.card .title .category{
	z-index: 2;
	position: absolute;
	box-shadow: 0em 0em 1em 0.1em rgba(0, 0, 0, 0.6);
	text-decoration: none;
	color: var(--nord6);
	font-size: 1.5rem;
	top: -0.8em;
	left: -0.5em;
	width: 10rem;
	background-color: var(--nord0);
	padding-inline: 1em;
	border-radius: 1000px;
	transition: 100ms;

}
.card .title .category:hover,
.card .title .category:focus-within
{
	box-shadow: -0.2em 0.2em 1em 0.1em rgba(0, 0, 0, 0.6);
	background-color: var(--nord3);
	transform: scale(1.05, 1.05)
}
.card:hover .icon,
.card:focus-visible .icon
{
	animation:  shake 0.6s
}

  @keyframes shake{
    0%{
      transform: rotate(0)
		scale(1,1);
    }
    25%{
    	box-shadow: 0em 0em 1em 0.2em rgba(0, 0, 0, 0.6);
      	transform: rotate(30deg)
      		scale(1.2,1.2)
      ;
    }
    50%{

    	box-shadow: 0em 0em 1em 0.2em rgba(0, 0, 0, 0.6);
      	transform: rotate(-30deg)
      		scale(1.2,1.2);
    }
    74%{

    	box-shadow: 0em 0em 1em 0.2em rgba(0, 0, 0, 0.6);
  	transform: rotate(30deg)
  		scale(1.2, 1.2);
	}
	100%{
      transform: rotate(0)
      	scale(1,1);
    }
  }

.input_wrapper{
	position: relative;
	padding-left: 3rem;
	padding-left: 40rem;
}
.input_wrapper > input{
	margin-left: 1ch;
}
.input{
	position:absolute;
	top: -.1ch;
	left: 0.6ch;
	font-size: 1.6rem;
}
.tag_input{
	width: 12ch;
}
</style>


<div class=card href="" >

	<input class=icon placeholder=🥫 bind:value={card_data.icon}/>
	{#if image_preview_url}
		<!-- svelte-ignore a11y-missing-attribute -->
		<img src={image_preview_url} class=img_preview width=300px height=300px />
	{/if}
	<div class=img_label_wrapper>
		{#if image_preview_url}
			<button class=delete on:click={remove_selected_images}>
			<Cross fill=white style="width:2rem;height:2rem;"></Cross>
</button>
		{/if}


		<label class=img_label for=img_picker>
		<svg class="upload over_img" xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512"><path d="M288 109.3V352c0 17.7-14.3 32-32 32s-32-14.3-32-32V109.3l-73.4 73.4c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l128-128c12.5-12.5 32.8-12.5 45.3 0l128 128c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L288 109.3zM64 352H192c0 35.3 28.7 64 64 64s64-28.7 64-64H448c35.3 0 64 28.7 64 64v32c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V416c0-35.3 28.7-64 64-64zM432 456a24 24 0 1 0 0-48 24 24 0 1 0 0 48z"/></svg>
		</label>
	</div>
	<input type="file" id=img_picker accept="image/webp image/jpeg" on:change={show_local_image}>
	<div class=title>
		<input class=category placeholder=Kategorie... bind:value={card_data.category}/>
		<div>
			<input class=name placeholder=Name... bind:value={card_data.name}/>
			<p contenteditable class=description placeholder=Kurzbeschreibung... bind:innerText={card_data.description}></p>
		</div>
		<div class=tags>
			{#each card_data.tags as tag}
				<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
				<div class="tag" tabindex="0" on:keydown={remove_on_enter(event ,tag)} on:click='{remove_from_tags(tag)}'>{tag}</div>
			{/each}
        	<div class="tag input_wrapper"><span class=input>+</span><input class="tag_input" type="text" on:keydown={add_on_enter} on:focusout={add_to_tags} size="1" bind:value={new_tag} placeholder=Stichwort...></div>
		</div>
	</div>

</div>
