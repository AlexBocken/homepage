<script>
	import LinksGrid from '$lib/components/LinksGrid.svelte';
	let { data } = $props();
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
</style>

<h1>Katechese</h1>
<p>
	Aufgearbeitete Lehrinhalte aus dem Glaubenskurs von P. Martin Ramm FSSP.
</p>
<p class="source">Quelle: Glaubenskurs, 3. Hauptteil</p>

<LinksGrid>
	<a href="/{data.faithLang}/katechese/zehn-gebote">
		<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
			<rect x="8" y="20" width="38" height="55" rx="12" ry="12" stroke="currentColor" stroke-width="3" fill="none"/>
			<rect x="54" y="20" width="38" height="55" rx="12" ry="12" stroke="currentColor" stroke-width="3" fill="none"/>
			<line x1="18" y1="35" x2="36" y2="35" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="18" y1="43" x2="36" y2="43" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="18" y1="51" x2="36" y2="51" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="64" y1="35" x2="82" y2="35" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="64" y1="43" x2="82" y2="43" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="64" y1="51" x2="82" y2="51" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			<line x1="64" y1="59" x2="82" y2="59" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
		</svg>
		<h3>Die 10 Gebote</h3>
	</a>
</LinksGrid>
