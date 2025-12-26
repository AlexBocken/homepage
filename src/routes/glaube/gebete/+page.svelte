<script>
	import { createLanguageContext } from "$lib/contexts/languageContext.js";
	import "$lib/css/christ.css";
	import "$lib/css/nordtheme.css";
	import Gebet from "./Gebet.svelte";
	import LanguageToggle from "$lib/components/LanguageToggle.svelte";
	import Kreuzzeichen from "$lib/components/prayers/Kreuzzeichen.svelte";
	import GloriaPatri from "$lib/components/prayers/GloriaPatri.svelte";
	import Paternoster from "$lib/components/prayers/Paternoster.svelte";
	import Credo from "$lib/components/prayers/Credo.svelte";
	import AveMaria from "$lib/components/prayers/AveMaria.svelte";
	import SalveRegina from "$lib/components/prayers/SalveRegina.svelte";
	import FatimaGebet from "$lib/components/prayers/FatimaGebet.svelte";
	import Gloria from "$lib/components/prayers/Gloria.svelte";
	import MichaelGebet from "$lib/components/prayers/MichaelGebet.svelte";
	import BruderKlausGebet from "$lib/components/prayers/BruderKlausGebet.svelte";
	import JosephGebet from "$lib/components/prayers/JosephGebet.svelte";

	// Create language context for prayer components
	createLanguageContext();
</script>
<style>
.ccontainer{
	margin: auto;
	overflow-x: visible;
	max-width: 1000px;
}
.container{
	column-count: 2;
	column-gap: 1em;
}
@media (max-width: 800px) {
	.container{
		column-count: 1;
		padding-left: calc((100% - 600px ) * 0.5); /* ugly*/
	}
}
:global(.container > *){
	break-inside: avoid-column; /* Prevent children from splitting across columns */
	margin-bottom: 1em;
}
h1{
	text-align: center;
	font-size: 3rem;
}
.toggle-controls {
	display: flex;
	justify-content: center;
	margin-bottom: 2rem;
}
</style>
<h1>Gebete</h1>

<div class="toggle-controls">
	<LanguageToggle />
</div>

<div class="ccontainer">
<div class=container>

<Gebet name={"Das heilige Kreuzzeichen"} is_bilingue={true}>
	<Kreuzzeichen />
</Gebet>

<Gebet name={"Glória Patri"} is_bilingue={true}>
	<GloriaPatri />
</Gebet>

<Gebet name={"Paternoster"} is_bilingue={true}>
	<Paternoster />
</Gebet>

<Gebet name={"Credo"} is_bilingue={true}>
	<Credo />
</Gebet>

<Gebet name={"Ave Maria"} is_bilingue={true}>
	<AveMaria />
</Gebet>

<Gebet name={"Salve Regina"} is_bilingue={true}>
	<SalveRegina />
</Gebet>

<Gebet name={"Das Fatimagebet"} is_bilingue={true}>
	<FatimaGebet />
</Gebet>

<Gebet name={"Glória"} is_bilingue={true}>
	<p slot="intro">Der uralte Gesang beginnt mit den Worten, mit denen die Engelscharen den neugeborenen Welterlöser feierten. Er preist zunächst Gott Vater, dann Gott Sohn; er schliesst mit einer Huldigung an die Heiligste Dreifaltigkeit, wobei man sich mit dem grossen Kreuze bezeichnet.</p>
	<Gloria />
</Gebet>

<Gebet name={"Gebet zum hl. Erzengel Michael"} is_bilingue={true}>
	<MichaelGebet />
</Gebet>

<Gebet name={"Bruder Klaus Gebet"} is_bilingue={false}>
	<BruderKlausGebet />
</Gebet>

<Gebet name={"Josephgebet des hl. Papst Pius X"} is_bilingue={false}>
	<p slot="intro">Wenn man mehr zum hl. Joseph als <q>Patrone Morientium</q> wissen möchte kann man <a href="predigten/20220319-hl._joseph">hier</a> die Predigt zum Festtag des hl. Joseph nachlesen.</p>
	<JosephGebet />
</Gebet>
</div>
</div>
