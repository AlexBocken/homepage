<script lang="ts">
	import type { PageData } from './$types';
    	import AddButton from '$lib/components/AddButton.svelte';
	import Converter from './Converter.svelte';
	let { data } = $props<{ data: PageData }>();

	const isEnglish = $derived(data.lang === 'en');
	const labels = $derived({
		title: isEnglish ? 'Tips & Tricks' : 'Tipps & Tricks',
		siteTitle: isEnglish ? 'Bocken Recipes' : 'Bocken Rezepte',
		description: isEnglish
			? "A constantly growing collection of recipes from Bocken's kitchen."
			: 'Eine stetig wachsende Ansammlung an Rezepten aus der Bockenschen Küche.'
	});
</script>
<style>
h1{
	text-align: center;
	margin-bottom: 0;
	font-size: 4rem;
}
.content{
	max-width: 800px;
	margin: 0 auto;
	background-color: var(--nord0);
	padding: 1rem;
	margin-block: 1rem;
}
</style>
<svelte:head>
	<title>{labels.title} - {labels.siteTitle}</title>
	<meta name="description" content="{labels.description}" />
	<meta property="og:image" content="https://bocken.org/static/rezepte/thumb/ragu_aus_rindsrippen.webp" />
	<meta property="og:image:secure_url" content="https://bocken.org/static/rezepte/thumb/ragu_aus_rindsrippen.webp" />
	<meta property="og:image:type" content="image/webp" />
	<meta property="og:image:alt" content="Pasta al Ragu mit Linguine" />
</svelte:head>

<h1>{labels.title}</h1>

<div class=content>
<h2>Trockenhefe vs. Frischhefe</h2>
<Converter></Converter>
<p>
	Frischhefe ist mit Trockenhefe ersetzbar, jedoch muss man ein paar Kleinigkeiten beachten:
</p>

<ol>
	<li>Nur ein Drittel der Menge verwenden.</li>
	<li>Falls ein kalter Teig zubereitet wird, die Trockenhefe umbedingt zuerst zur Gärprobe in warmer Flüssigkeit (je nach Rezept z.B. Milch oder Wasser) mit einem TL Zucker für ~10 Minuten <q>aufwachen</q> lassen.</li>
	<li>Generell ist die Meinung das Trockenhefe etwas <q>energischer</q> ist am Anfang der Gärung und etwas langsamer am Ende der Gare. Dementsprechend eventuell die Stock- und Stückgare verkürzen bzw. verlängern.</li>
</ol>
</div>

<div class=content>
<h2>Fensterprobe</h2>

<p>
	Die Fensterprobe ist eine Methode um den optimalen Knetzustand eines Teiges zu bestimmen.
	Dazu wird ein kleines, ca. Walnussgrosses Stück Teig zwischen den Fingern auseinandergezogen. Ist der Teig elastisch und reisst nicht bis der Teig so dünn ist, dass man leicht licht durchsehen kann, so ist der Teig optimal verknetet.
</p>
<p>
	Teig lässt sich leichter verkneten wenn er noch trockener ist. Daher lohnt es sich zunächst etwa 10% der Flüssigkeit zurückzuhalten und erst nach und nach zuzugeben nachdem der Teig bereits für einige Minuten geknetet wurde.
</p>
</div>

<AddButton href="/rezepte/add"></AddButton>
