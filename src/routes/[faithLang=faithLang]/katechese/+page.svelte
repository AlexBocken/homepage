<script>
	import LinksGrid from '$lib/components/LinksGrid.svelte';
	let { data } = $props();
	const isEnglish = $derived(data.lang === 'en');
</script>

<svelte:head>
	<title>Katechese - Bocken</title>
	<meta name="description" content="Katechesen nach P. Martin Ramm FSSP" />
</svelte:head>

<style>
	h1 {
		text-align: center;
		font-size: var(--text-3xl);
	}
	p {
		max-width: 600px;
		margin: 0 auto;
		font-size: var(--text-lg);
	}
	.source {
		text-align: center;
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
		margin-top: var(--space-sm);
	}
	.disclaimer {
		text-align: center;
		color: var(--color-text-tertiary);
		font-size: var(--text-xs);
		font-style: italic;
		max-width: 500px;
	}
	.lang-notice {
		text-align: center;
		color: var(--nord10);
		font-style: italic;
		font-size: var(--text-sm);
		margin-bottom: var(--space-sm);
	}
</style>

<h1>Katechese</h1>
{#if isEnglish}
	<p class="lang-notice">This catechesis is only available in German.</p>
{/if}
<p>
	Aufgearbeitete Lehrinhalte aus dem Glaubenskurs von P. Martin Ramm FSSP.
</p>
<p class="source">Quelle: Glaubenskurs, 3. Hauptteil</p>
<p class="disclaimer">Diese Seiten stellen eine freie Aufbereitung der erhaltenen Unterlagen dar und sind kein offizielles Angebot von P. Martin Ramm oder der FSSP. Etwaige Fehler oder Missverständnisse sind dem Verfasser dieser Seiten anzulasten.</p>

<LinksGrid>
	<a href="/{data.faithLang}/katechese/zehn-gebote">
		<svg viewBox="2 14 96 68" xmlns="http://www.w3.org/2000/svg">
			<rect x="8" y="20" width="38" height="55" rx="12" ry="12" stroke="currentColor" stroke-width="3" fill="none"/>
			<rect x="54" y="20" width="38" height="55" rx="12" ry="12" stroke="currentColor" stroke-width="3" fill="none"/>
			<line x1="18" y1="31" x2="36" y2="31" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="18" y1="39" x2="36" y2="39" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="18" y1="47" x2="36" y2="47" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="18" y1="55" x2="36" y2="55" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="18" y1="63" x2="36" y2="63" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="64" y1="31" x2="82" y2="31" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="64" y1="39" x2="82" y2="39" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="64" y1="47" x2="82" y2="47" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="64" y1="55" x2="82" y2="55" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="64" y1="63" x2="82" y2="63" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
		</svg>
		<h3>Die 10 Gebote</h3>
	</a>
</LinksGrid>
