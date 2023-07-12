<script>
	export let src
	export let placeholder_src
	let isloaded=false
	import { onMount } from "svelte";
	onMount(() => {
		const el = document.querySelector("img")
		if(el.complete){
			isloaded = true
		}
	})

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
  transition: 50ms;
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
</style>
<section class="section">
    <figure class="image-container">
    	<div>
		<div class=placeholder style="background-image:url({placeholder_src})" >
			<div class=placeholder_blur>
			<img class:unblur={isloaded} id=image {src} on:load={() => {isloaded=true}} alt=""/>
			</div>
		</div>
	</div>
	</figure>
    <div class=content><slot></slot></div>
</section>
