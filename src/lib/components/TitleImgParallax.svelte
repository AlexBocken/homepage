<script>
	export let src
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
.blocker{
	display:block;
	z-index: 10;
	background-color: white;
	width: 100%;
	height: 20vh;
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

.image-container img {
  display: block;
  position: absolute;
  top: 0;
  width: min(1000px, 100dvw);
  z-index: -1;
  height: max(60dvh,600px);
  object-fit: cover;
  /*object-position: top;*/
  object-position: 50% 20%;
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

</style>
<section class="section">
    <figure class="image-container"><img {src} alt=""/></figure>
    <div class=content><slot></slot></div>
</section>
