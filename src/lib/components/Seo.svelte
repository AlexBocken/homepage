<script lang="ts">
	type Alternate = { hreflang: string; href: string };

	interface Props {
		title: string;
		description?: string;
		canonical?: string;
		/** Absolute or site-relative; a relative path is prefixed with the site
		 * origin, since Open Graph and Twitter need absolute URLs. */
		ogImage?: string;
		ogImageAlt?: string;
		ogImageWidth?: number;
		ogImageHeight?: number;
		ogType?: 'website' | 'article';
		siteName?: string;
		lang?: 'de' | 'en' | 'la';
		/** Overrides the locale derived from `lang` (e.g. `de_CH`, `en_GB`). */
		locale?: string;
		alternates?: Alternate[];
		twitterCard?: 'summary' | 'summary_large_image';
	}

	const {
		title,
		description,
		canonical,
		ogImage,
		ogImageAlt,
		ogImageWidth,
		ogImageHeight,
		ogType = 'website',
		siteName = 'Bocken',
		lang,
		locale,
		alternates = [],
		twitterCard = 'summary_large_image',
	}: Props = $props();

	const SITE = 'https://bocken.org';
	const localeMap = { de: 'de_DE', en: 'en_US', la: 'la' } as const;
	const imageUrl = $derived(
		ogImage ? (/^https?:\/\//.test(ogImage) ? ogImage : `${SITE}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`) : undefined
	);
	const ogLocale = $derived(locale ?? (lang ? localeMap[lang] : undefined));
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
	{#if ogLocale}<meta property="og:locale" content={ogLocale} />{/if}
	{#if imageUrl}
		<meta property="og:image" content={imageUrl} />
		{#if ogImageAlt}<meta property="og:image:alt" content={ogImageAlt} />{/if}
		{#if ogImageWidth}<meta property="og:image:width" content={String(ogImageWidth)} />{/if}
		{#if ogImageHeight}<meta property="og:image:height" content={String(ogImageHeight)} />{/if}
	{/if}

	<meta name="twitter:card" content={twitterCard} />
	<meta name="twitter:title" content={title} />
	{#if description}<meta name="twitter:description" content={description} />{/if}
	{#if imageUrl}<meta name="twitter:image" content={imageUrl} />{/if}

	{#each alternates as a (a.hreflang)}
		<link rel="alternate" hreflang={a.hreflang} href={a.href} />
	{/each}
</svelte:head>
