<script>
	import { resolve } from '$app/paths';
	import RunDetailView from '$lib/components/fitness/RunDetailView.svelte';

	let { data } = $props();
	const session = $derived(data.session);
	const card = $derived(data.card);
	const cardImage = $derived(data.cardImage);
	const shareUrl = $derived(data.shareUrl);

	const description = $derived(
		[card.subtitle, ...card.stats.map((/** @type {{value:string,label:string}} */ s) => s.value)]
			.filter(Boolean)
			.join(' · ')
	);
	const imageAlt = $derived(`${card.title} — route map`);

	/** @param {string} value */
	function formatDateTime(value) {
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return '';
		return (
			d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) +
			' · ' +
			d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
		);
	}
</script>

<svelte:head>
	<title>{card.title} — Bocken</title>
	<meta name="description" content={description} />
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={card.title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={cardImage} />
	<meta property="og:image:secure_url" content={cardImage} />
	<meta property="og:image:type" content="image/webp" />
	<meta property="og:image:width" content="1080" />
	<meta property="og:image:height" content="1080" />
	<meta property="og:image:alt" content={imageAlt} />
	<meta property="og:url" content={shareUrl} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={card.title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={cardImage} />
	<meta name="twitter:image:alt" content={imageAlt} />
</svelte:head>

<main class="share">
	<header class="share-header">
		<h1>{session.name}</h1>
		<p class="date">{formatDateTime(session.startTime)}</p>
	</header>

	<RunDetailView {session} lang="en" showPrs={false} />

	<a class="brand" href={resolve('/')}>bocken.org</a>
</main>

<style>
	.share {
		max-width: 720px;
		margin-inline: auto;
		padding: 1.5rem 1rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-height: 100svh;
	}
	.share-header h1 {
		margin: 0;
		font-size: 1.4rem;
		color: var(--color-text-primary);
	}
	.date {
		margin: 0.2rem 0 0;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.brand {
		align-self: center;
		margin-top: 0.5rem;
		color: var(--color-text-secondary);
		text-decoration: none;
		font-weight: 600;
	}
	.brand:hover {
		color: var(--color-primary);
	}
</style>
