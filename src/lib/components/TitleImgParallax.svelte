<script>
	export let src
	export let placeholder_src
	let isloaded=false
	let isredirected=false
	import { onMount } from "svelte";
	onMount(() => {
		const el = document.querySelector("img")
		if(el.complete){
			isloaded = true
		}
		fetch(src, { method: 'HEAD' })
		  .then(response => {
			isredirected = response.redirected
		    })
	})

	function show_dialog_img(){
		if(isredirected){
			return
		}
		if(document.querySelector("img").complete){
			document.querySelector("#img_carousel").showModal();
		}
	}
	function close_dialog_img(){
		document.querySelector("#img_carousel").close();
	}
	import Cross from "$lib/assets/icons/Cross.svelte";
	import "$lib/css/action_button.css";
	import "$lib/css/shake.css";
	import { do_on_key } from "./do_on_key";
</script>
<style>
:root {
  --scale: 0.3;
  --space: 10vw;
  --font-primary: 'Lato', sans-serif;
  --font-heading: 'Playfair Display', serif;
}

@media (prefers-reduced-motion) {
  :root {
    --scale: 0;
  }
}

* {
  box-sizing: border-box;
}

.section {
  margin-bottom: -20vh;
  transform-origin: center top;
  transform:	translateY(-1rem)
  	scaleY(calc(1 - var(--scale)));
}

.section > * {
  transform-origin: center top;
  transform: scaleY(calc(1 / (1 - var(--scale))));
}

.content {
  position: relative;
  margin: 30vh auto 0;
}

.image-container {
  position: sticky;
  display: flex;
  align-items: center;
  justify-content: center;
  top: 0;
  height: max(50dvh, 500px);
  z-index: -10;
}


#image{
  display: block;
  position: absolute;
  top: 0;
  width: min(1000px, 100dvw);
  z-index: -1;
  opacity: 0;
  transition: 200ms;
  height: max(60dvh,600px);
  object-fit: cover;
  object-position: 50% 20%;
  backdrop-filter: blur(20px);
  filter: blur(20px);
  z-index: -10;
}

.image-container::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  height: 50%;
}
:global(h1){
	width: 100%;
}
.placeholder{
	background-repeat: no-repeat;
	background-size: cover;
	background-position: 50% 20%;
	position: absolute;
        width: min(1000px, 100dvw);
  	height: max(60dvh,600px);
	z-index: -2;
}
.placeholder_blur{
	width: inherit;
	height: inherit;
	backdrop-filter: blur(20px);
}
div:has(.placeholder){
	position: absolute;
	top: 0;
        width: min(1000px, 100dvw);
  	height: max(60dvh,600px);
	overflow: hidden;
}
.unblur#image{
	filter: blur(0px) !important;
	opacity: 1;
}

@supports (-moz-appearance:none) {
	.placeholder{
		translate: -50% -50%;
	}
}

/* DIALOG */
dialog{
	position: relative;
	background-color: unset;
	padding:0;
	max-height: 90vh;
	margin-inline: auto;
	overflow: visible;
	border: unset;
}
dialog img{
	max-width: calc(95vmin - 2rem);
	max-height: 95vmin; /* cannot use calc() for some reason */
}
dialog[open]::backdrop{
    animation: show 200ms ease forwards;
}
@keyframes show{
    from {
	backdrop-filter: blur(0px);
    }
    to {
	backdrop-filter: blur(10px);
    }
}
dialog button{
	position: absolute;
	top: -2rem;
	right: -2rem;
}
.zoom-in{
	cursor: zoom-in;
}

</style>
<section class="section">
    <figure class="image-container">
	<!-- svelte-ignore a11y-click-events-have-key-events -->
    	<div class:zoom-in={isloaded && !isredirected} on:click={show_dialog_img}>
		<div class=placeholder style="background-image:url({placeholder_src})" >
			<div class=placeholder_blur>
			<img class:unblur={isloaded} id=image {src} on:load={() => {isloaded=true}}  alt=""/>
			</div>
		</div>
		<noscript>
			<div class=placeholder style="background-image:url({placeholder_src})" >
				<img class="unblur" id=image {src} on:load={() => {isloaded=true}}  alt=""/>
			</div>
		</noscript>
	</div>
    </figure>
    <div class=content><slot></slot></div>
</section>

<dialog id=img_carousel>
	<div>
	<img class:unblur={isloaded} {src} alt="">
		<button class=action_button on:keydown={(event) => do_on_key(event, 'Enter', false, close_dialog_img)} on:click={close_dialog_img}>
	<Cross fill=white width=2rem height=2rem></Cross>
		</button>
	</div>
</dialog>
