<script>
	import "$lib/css/nordtheme.css";
	export let data;
</script>
<style>

.grid_section a:nth-child(4n),
.grid_section a:nth-child(4n) svg{
	background-color: var(--nord4);
	fill: var(--nord11);
}
.grid_section a:nth-child(4n+1),
.grid_section a:nth-child(4n+1) svg{
	background-color: var(--nord6);
	fill: var(--nord10);
}
.grid_section a:nth-child(4n+2){
	background-color: var(--nord5);
}
.grid_section a:nth-child(4n+3){
	background-color: var(--nord5);
}

a{
	text-decoration: unset;
	color: var(--nord0);
	transition: 200ms;
}
.grid_section a:hover{
	box-shadow: 1em 1em 2em 1em rgba(0,0,0, 0.3);
}
.grid_section a{
	box-shadow: 0.2em 0.2em 1em 1em rgba(0,0,0, 0.1);
}
.grid_section{
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: 2rem;
	max-width: 1000px;
	margin-inline: auto;
	padding: 2rem 1rem;
}
.grid_section a{
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-decoration: unset;
	color: var(--nord0);
	transition: 200ms;
	width: 100%;
	padding: 1rem;
}
.grid_section a:hover{
	scale: 1.02;
}
.grid_section a :is(svg, img){
	height: 120px;
	fill: var(--nord0);
}
.grid_section h3{
	font-size: 1.5rem;
}


.hero{
	display: flex;
	align-items: center;
	max-width: 1400px;
	margin-inline: auto;
	gap: 2rem;
}
.hero img{
	border-radius: 1000px;
	margin: 1rem;
	width: clamp(100px, 300px, 50vw);
	object-fit: cover;
	background-color: var(--nord4);
	box-shadow: 0.2em 0.2em 1em 1em rgba(0, 0, 0, 0.1);
}
.hero div{
	margin-inline: 1rem;
}

section h2{
	font-size: 2rem;
	text-align: center;
}
@media (prefers-color-scheme: dark){
	*{
		color: white;
	}
	.grid_section a:nth-child(4n),
	.grid_section a:nth-child(4n) svg{
		background-color: var(--nord6-dark);
		fill: var(--nord11);
	}
	.grid_section a:nth-child(4n+1),
	.grid_section a:nth-child(4n+1) svg{
		background-color: var(--accent-dark);
		fill: var(--nord9);
	}
	.grid_section a:nth-child(4n+2),
	.grid_section a:nth-child(4n+2) svg{
		background-color: var(--nord1);
		fill: var(--nord8);

	}
	.grid_section a:nth-child(4n+3),
	.grid_section a:nth-child(4n+3) svg{
		background-color: var(--background-dark);
		fill: var(--nord7);
	}
	.hero img{
		box-shadow: 0.1em 0.1em 2em 0.5em rgba(255, 255, 255, 0.1);
	}
}
@media (max-width: 600px){
	.hero{
		flex-direction: column;
		gap: 1rem;
	}
	.hero img{
		width: clamp(100px, 200px, 80vw);
	}
	.hero h1{
		text-align: center;
	}
}
</style>

{#if ! data.user}
<section class=hero>
<img src="https://bocken.org/static/user/full/Alexander.webp" alt="Smiling Alexander Bocken">
<div>
<h1><q>Willkommen auf bocken.org</q></h1>
<p>
	Hallo, ich bin Alexander Bocken. Auf dieser Seite findest du einige Softwareprojekte für Freunde, Familie und mich.
	Alles ist selbst gehostet bei mir daheim auf einem kleinen Mini-Server (Arch, btw).
</p>
<p>
	Zu empfeheln ist meine stetig wachsende Rezeptsammlung. Dort findest du viele leckere Rezepte, die ich selbst ausprobiert habe und ständig weiterfeilsche.
	Zudem kannst du gerne meine Suchmaschine oder auch Jitsi-instanz für Videokonferenzen nutzen.
	Einiges ist hinter einem Login versteckt, anderes ist öffentlich zugänglich.
	Wer sich ein bisschen mit Programmieren auskennt, kann auch gerne in meinen Git-Repositories stöbern.
</p>
</div>
</section>
{/if}

<section>
<h2>Seiten</h2>
<div class=grid_section>
	<a href="rezepte">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M240 144A96 96 0 1 0 48 144a96 96 0 1 0 192 0zm44.4 32C269.9 240.1 212.5 288 144 288C64.5 288 0 223.5 0 144S64.5 0 144 0c68.5 0 125.9 47.9 140.4 112h71.8c8.8-9.8 21.6-16 35.8-16H496c26.5 0 48 21.5 48 48s-21.5 48-48 48H392c-14.2 0-27-6.2-35.8-16H284.4zM144 80a64 64 0 1 1 0 128 64 64 0 1 1 0-128zM400 240c13.3 0 24 10.7 24 24v8h96c13.3 0 24 10.7 24 24s-10.7 24-24 24H280c-13.3 0-24-10.7-24-24s10.7-24 24-24h96v-8c0-13.3 10.7-24 24-24zM288 464V352H512V464c0 26.5-21.5 48-48 48H336c-26.5 0-48-21.5-48-48zM48 320h80 16 32c26.5 0 48 21.5 48 48s-21.5 48-48 48H160c0 17.7-14.3 32-32 32H64c-17.7 0-32-14.3-32-32V336c0-8.8 7.2-16 16-16zm128 64c8.8 0 16-7.2 16-16s-7.2-16-16-16H160v32h16zM24 464H200c13.3 0 24 10.7 24 24s-10.7 24-24 24H24c-13.3 0-24-10.7-24-24s10.7-24 24-24z"/></svg>
		<h3>Rezepte</h3>
	</a>
	<a href=git>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M392.8 1.2c-17-4.9-34.7 5-39.6 22l-128 448c-4.9 17 5 34.7 22 39.6s34.7-5 39.6-22l128-448c4.9-17-5-34.7-22-39.6zm80.6 120.1c-12.5 12.5-12.5 32.8 0 45.3L562.7 256l-89.4 89.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l112-112c12.5-12.5 12.5-32.8 0-45.3l-112-112c-12.5-12.5-32.8-12.5-45.3 0zm-306.7 0c-12.5-12.5-32.8-12.5-45.3 0l-112 112c-12.5 12.5-12.5 32.8 0 45.3l112 112c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256l89.4-89.4c12.5-12.5 12.5-32.8 0-45.3z"/></svg>
		<h3>Git</h3>
	</a>

	<a href="https://stream.bocken.org">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M448 32H361.9l-1 1-127 127h92.1l1-1L453.8 32.3c-1.9-.2-3.8-.3-5.8-.3zm64 128V96c0-15.1-5.3-29.1-14-40l-104 104H512zM294.1 32H201.9l-1 1L73.9 160h92.1l1-1 127-127zM64 32C28.7 32 0 60.7 0 96v64H6.1l1-1 127-127H64zM512 192H0V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V192z"/></svg>
		<h3>Streaming</h3>
	</a>

	<a href="/bilder">
		<svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zM323.8 202.5c-4.5-6.6-11.9-10.5-19.8-10.5s-15.4 3.9-19.8 10.5l-87 127.6L170.7 297c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6h96 32H424c8.9 0 17.1-4.9 21.2-12.8s3.6-17.4-1.4-24.7l-120-176zM112 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"/></svg>
		<h3>Familienbilder</h3>
	</a>

	<a href="https://cloud.bocken.org">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M0 336c0 79.5 64.5 144 144 144H512c70.7 0 128-57.3 128-128c0-61.9-44-113.6-102.4-125.4c4.1-10.7 6.4-22.4 6.4-34.6c0-53-43-96-96-96c-19.7 0-38.1 6-53.3 16.2C367 64.2 315.3 32 256 32C167.6 32 96 103.6 96 192c0 2.7 .1 5.4 .2 8.1C40.2 219.8 0 273.2 0 336z"/></svg>
		<h3>Cloud</h3>
	</a>

	<a href="https://meet.bocken.org">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M0 128C0 92.7 28.7 64 64 64H320c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128zM559.1 99.8c10.4 5.6 16.9 16.4 16.9 28.2V384c0 11.8-6.5 22.6-16.9 28.2s-23 5-32.9-1.6l-96-64L416 337.1V320 192 174.9l14.2-9.5 96-64c9.8-6.5 22.4-7.2 32.9-1.6z"/></svg>
		<h3>Videokonferenzen</h3>
	</a>

	<a href="/searx">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/></svg>
		<h3>Suchmaschine</h3>
	</a>

	<a href="https://cloud.bocken.org/apps/cospend/">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M0 24C0 10.7 10.7 0 24 0H69.5c22 0 41.5 12.8 50.6 32h411c26.3 0 45.5 25 38.6 50.4l-41 152.3c-8.5 31.4-37 53.3-69.5 53.3H170.7l5.4 28.5c2.2 11.3 12.1 19.5 23.6 19.5H488c13.3 0 24 10.7 24 24s-10.7 24-24 24H199.7c-34.6 0-64.3-24.6-70.7-58.5L77.4 54.5c-.7-3.8-4-6.5-7.9-6.5H24C10.7 48 0 37.3 0 24zM128 464a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm336-48a48 48 0 1 1 0 96 48 48 0 1 1 0-96z"/></svg>
		<h3>Einkauf</h3>
	</a>

	<a href="https://tree.bocken.org">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M335.5 4l288 160c15.4 8.6 21 28.1 12.4 43.5s-28.1 21-43.5 12.4L320 68.6 47.5 220c-15.4 8.6-34.9 3-43.5-12.4s-3-34.9 12.4-43.5L304.5 4c9.7-5.4 21.4-5.4 31.1 0zM320 160a40 40 0 1 1 0 80 40 40 0 1 1 0-80zM144 256a40 40 0 1 1 0 80 40 40 0 1 1 0-80zm312 40a40 40 0 1 1 80 0 40 40 0 1 1 -80 0zM226.9 491.4L200 441.5V480c0 17.7-14.3 32-32 32H120c-17.7 0-32-14.3-32-32V441.5L61.1 491.4c-6.3 11.7-20.8 16-32.5 9.8s-16-20.8-9.8-32.5l37.9-70.3c15.3-28.5 45.1-46.3 77.5-46.3h19.5c16.3 0 31.9 4.5 45.4 12.6l33.6-62.3c15.3-28.5 45.1-46.3 77.5-46.3h19.5c32.4 0 62.1 17.8 77.5 46.3l33.6 62.3c13.5-8.1 29.1-12.6 45.4-12.6h19.5c32.4 0 62.1 17.8 77.5 46.3l37.9 70.3c6.3 11.7 1.9 26.2-9.8 32.5s-26.2 1.9-32.5-9.8L552 441.5V480c0 17.7-14.3 32-32 32H472c-17.7 0-32-14.3-32-32V441.5l-26.9 49.9c-6.3 11.7-20.8 16-32.5 9.8s-16-20.8-9.8-32.5l36.3-67.5c-1.7-1.7-3.2-3.6-4.3-5.8L376 345.5V400c0 17.7-14.3 32-32 32H296c-17.7 0-32-14.3-32-32V345.5l-26.9 49.9c-1.2 2.2-2.6 4.1-4.3 5.8l36.3 67.5c6.3 11.7 1.9 26.2-9.8 32.5s-26.2 1.9-32.5-9.8z"/></svg>
		<h3>Stammbaum</h3>
	</a>
</div>
</section>
