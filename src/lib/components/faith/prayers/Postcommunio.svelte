<script>
	import Prayer from './Prayer.svelte';
	import Paternoster from './Paternoster.svelte';
	import AveMaria from './AveMaria.svelte';
	import GloriaPatri from './GloriaPatri.svelte';
	import AnimaChristi from './AnimaChristi.svelte';
	import PrayerBeforeACrucifix from './PrayerBeforeACrucifix.svelte';

	let {onlyIntro = false } = $props();
</script>

<Prayer hasLatin={false}>
	{#snippet children(showLatin, urlLang)}
	<p class="intro">
		{#if urlLang === 'en'}A plenary indulgence is granted to the faithful who devoutly recite these prayers after Holy Communion. The usual conditions apply: sacramental confession, Eucharistic communion, prayer for the intentions of the Holy Father, and detachment from all sin, even venial.{/if}
		{#if urlLang === 'de'}Den Gläubigen, die diese Gebete nach der heiligen Kommunion andächtig verrichten, wird ein vollkommener Ablass gewährt. Die üblichen Bedingungen gelten: sakramentale Beichte, eucharistische Kommunion, Gebet in den Anliegen des Heiligen Vaters und Loslösung von jeder Sünde, auch von lässlichen.{/if}
	</p>
	{/snippet}
</Prayer>
{#if !onlyIntro}

	<Prayer>
		{#snippet children(showLatin, urlLang)}
		<h3> Ánima Christi </h3>
		<AnimaChristi />
		<h3>
			{#if urlLang=='en'}Plenary Indulgence{:else}Vollkommener Ablass{/if}
		</h3>
		<h3>
			{#if urlLang=='en'}Prayer Before a Crucifix{:else}Gebet vor einem Kruzifix{/if}
		</h3>
		<h4> Paternoster </h4>
			<Paternoster />
		<h4> Ave Maria </h4>
			<AveMaria />
		<h4> Gloria Patri </h4>
			<GloriaPatri />
			<PrayerBeforeACrucifix />
		{/snippet}
	</Prayer>
{/if}
