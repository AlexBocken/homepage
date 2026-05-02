<script lang="ts">
	type Alternate = { hreflang: string; href: string };

	interface Props {
		title: string;
		description?: string;
		canonical?: string;
		ogImage?: string;
		ogImageAlt?: string;
		ogType?: 'website' | 'article';
		siteName?: string;
		lang?: 'de' | 'en' | 'la';
		alternates?: Alternate[];
		twitterCard?: 'summary' | 'summary_large_image';
	}

	const {
		title,
		description,
		canonical,
		ogImage,
		ogImageAlt,
		ogType = 'website',
		siteName = 'Bocken',
		lang,
		alternates = [],
		twitterCard = 'summary_large_image',
	}: Props = $props();

	const localeMap = { de: 'de_DE', en: 'en_US', la: 'la' } as const;
</script>

<svelte:head>
	<title>{title}</title>
	{#if description}<meta name="description" content={description} />{/if}
	{#if canonical}<link rel="canonical" href={canonical} />{/if}

	<meta property="og:title" content={title} />
	{#if description}<meta property="og:description" content={description} />{/if}
	<meta property="og:type" content={ogType} />
	<meta property="og:site_name" content={siteName} />
	{#if canonical}<meta property="og:url" content={canonical} />{/if}
	{#if lang}<meta property="og:locale" content={localeMap[lang]} />{/if}
	{#if ogImage}
		<meta property="og:image" content={ogImage} />
		{#if ogImageAlt}<meta property="og:image:alt" content={ogImageAlt} />{/if}
	{/if}

	<meta name="twitter:card" content={twitterCard} />
	<meta name="twitter:title" content={title} />
	{#if description}<meta name="twitter:description" content={description} />{/if}
	{#if ogImage}<meta name="twitter:image" content={ogImage} />{/if}

	{#each alternates as a (a.hreflang)}
		<link rel="alternate" hreflang={a.hreflang} href={a.href} />
	{/each}
</svelte:head>
