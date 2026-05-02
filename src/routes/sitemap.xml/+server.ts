import type { RequestHandler } from './$types';
import { ARGUMENTS, POS_ARGUMENTS } from '$lib/data/apologetik';
import { validPrayerSlugs } from '$lib/data/prayerSlugs';
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';

const SITE = 'https://bocken.org';
const BUILD_LASTMOD = new Date().toISOString().slice(0, 10);

type Url = { loc: string; lastmod?: string; changefreq?: string; priority?: number; alternates?: { hreflang: string; href: string }[] };

function xmlEscape(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function renderUrl(u: Url): string {
	const alt = (u.alternates ?? [])
		.map(a => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${xmlEscape(a.href)}" />`)
		.join('\n');
	const parts = [
		`  <url>`,
		`    <loc>${xmlEscape(u.loc)}</loc>`,
		u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : '',
		u.changefreq ? `    <changefreq>${u.changefreq}</changefreq>` : '',
		u.priority !== undefined ? `    <priority>${u.priority.toFixed(1)}</priority>` : '',
		alt,
		`  </url>`,
	].filter(Boolean);
	return parts.join('\n');
}

export const GET: RequestHandler = async ({ fetch, setHeaders }) => {
	const urls: Url[] = [];

	// Home
	urls.push({ loc: `${SITE}/`, lastmod: BUILD_LASTMOD, changefreq: 'monthly', priority: 1.0 });

	// Faith hubs (de/en) — Latin route exists but content sparse, skip.
	for (const [de, en] of [
		['/glaube', '/faith'],
		['/glaube/katechese', '/faith/katechese'],
		['/glaube/katechese/zehn-gebote', '/faith/katechese/zehn-gebote'],
		['/glaube/angelus', '/faith/angelus'],
	]) {
		urls.push({
			loc: `${SITE}${de}`,
			lastmod: BUILD_LASTMOD,
			changefreq: 'monthly',
			priority: 0.7,
			alternates: [
				{ hreflang: 'de', href: `${SITE}${de}` },
				{ hreflang: 'en', href: `${SITE}${en}` },
				{ hreflang: 'x-default', href: `${SITE}${de}` },
			],
		});
		urls.push({
			loc: `${SITE}${en}`,
			lastmod: BUILD_LASTMOD,
			changefreq: 'monthly',
			priority: 0.7,
			alternates: [
				{ hreflang: 'de', href: `${SITE}${de}` },
				{ hreflang: 'en', href: `${SITE}${en}` },
				{ hreflang: 'x-default', href: `${SITE}${de}` },
			],
		});
	}

	// Recipe hubs
	for (const [de, en] of [
		['/rezepte', '/recipes'],
		['/rezepte/tips-and-tricks', '/recipes/tips-and-tricks'],
	]) {
		urls.push({
			loc: `${SITE}${de}`,
			lastmod: BUILD_LASTMOD,
			changefreq: 'weekly',
			priority: 0.8,
			alternates: [
				{ hreflang: 'de', href: `${SITE}${de}` },
				{ hreflang: 'en', href: `${SITE}${en}` },
				{ hreflang: 'x-default', href: `${SITE}${de}` },
			],
		});
		urls.push({
			loc: `${SITE}${en}`,
			lastmod: BUILD_LASTMOD,
			changefreq: 'weekly',
			priority: 0.8,
			alternates: [
				{ hreflang: 'de', href: `${SITE}${de}` },
				{ hreflang: 'en', href: `${SITE}${en}` },
				{ hreflang: 'x-default', href: `${SITE}${de}` },
			],
		});
	}

	// Apologetik index
	for (const [de, en] of [['/glaube/apologetik', '/faith/apologetics']]) {
		urls.push({
			loc: `${SITE}${de}`,
			lastmod: BUILD_LASTMOD,
			changefreq: 'monthly',
			priority: 0.7,
			alternates: [
				{ hreflang: 'de', href: `${SITE}${de}` },
				{ hreflang: 'en', href: `${SITE}${en}` },
				{ hreflang: 'x-default', href: `${SITE}${en}` },
			],
		});
		urls.push({
			loc: `${SITE}${en}`,
			lastmod: BUILD_LASTMOD,
			changefreq: 'monthly',
			priority: 0.7,
			alternates: [
				{ hreflang: 'de', href: `${SITE}${de}` },
				{ hreflang: 'en', href: `${SITE}${en}` },
				{ hreflang: 'x-default', href: `${SITE}${en}` },
			],
		});
	}

	// Apologetik contra arguments
	for (const arg of ARGUMENTS) {
		const dePath = `/glaube/apologetik/contra/${arg.id}`;
		const enPath = `/faith/apologetics/contra/${arg.id}`;
		urls.push({
			loc: `${SITE}${dePath}`,
			lastmod: BUILD_LASTMOD,
			changefreq: 'yearly',
			priority: 0.6,
			alternates: [
				{ hreflang: 'de', href: `${SITE}${dePath}` },
				{ hreflang: 'en', href: `${SITE}${enPath}` },
				{ hreflang: 'x-default', href: `${SITE}${enPath}` },
			],
		});
		urls.push({
			loc: `${SITE}${enPath}`,
			lastmod: BUILD_LASTMOD,
			changefreq: 'yearly',
			priority: 0.6,
			alternates: [
				{ hreflang: 'de', href: `${SITE}${dePath}` },
				{ hreflang: 'en', href: `${SITE}${enPath}` },
				{ hreflang: 'x-default', href: `${SITE}${enPath}` },
			],
		});
	}

	// Apologetik pro arguments
	for (const arg of POS_ARGUMENTS) {
		const dePath = `/glaube/apologetik/pro/${arg.id}`;
		const enPath = `/faith/apologetics/pro/${arg.id}`;
		urls.push({
			loc: `${SITE}${dePath}`,
			lastmod: BUILD_LASTMOD,
			changefreq: 'yearly',
			priority: 0.6,
			alternates: [
				{ hreflang: 'de', href: `${SITE}${dePath}` },
				{ hreflang: 'en', href: `${SITE}${enPath}` },
				{ hreflang: 'x-default', href: `${SITE}${enPath}` },
			],
		});
		urls.push({
			loc: `${SITE}${enPath}`,
			lastmod: BUILD_LASTMOD,
			changefreq: 'yearly',
			priority: 0.6,
			alternates: [
				{ hreflang: 'de', href: `${SITE}${dePath}` },
				{ hreflang: 'en', href: `${SITE}${enPath}` },
				{ hreflang: 'x-default', href: `${SITE}${enPath}` },
			],
		});
	}

	// Prayers — slugs include both de+en variants in one set; emit each as its own URL.
	for (const slug of validPrayerSlugs) {
		urls.push({ loc: `${SITE}/glaube/gebete/${slug}`, lastmod: BUILD_LASTMOD, changefreq: 'yearly', priority: 0.5 });
		urls.push({ loc: `${SITE}/faith/prayers/${slug}`, lastmod: BUILD_LASTMOD, changefreq: 'yearly', priority: 0.5 });
	}

	// Recipes — direct DB read so we get dateModified for <lastmod>. Tolerate
	// failure so sitemap still ships the static URLs above.
	try {
		await dbConnect();
		const recipes = await Recipe.find(
			{},
			'short_name dateModified translations.en.short_name translations.en.translationStatus'
		).lean();
		for (const r of recipes) {
			const lastmod = r.dateModified ? new Date(r.dateModified).toISOString().slice(0, 10) : BUILD_LASTMOD;
			if (r.short_name) {
				urls.push({
					loc: `${SITE}/rezepte/${encodeURIComponent(r.short_name)}`,
					lastmod,
					changefreq: 'monthly',
					priority: 0.7,
				});
			}
			const enShort = r.translations?.en?.short_name;
			const approved = r.translations?.en?.translationStatus === 'approved';
			if (enShort && approved) {
				urls.push({
					loc: `${SITE}/recipes/${encodeURIComponent(enShort)}`,
					lastmod,
					changefreq: 'monthly',
					priority: 0.7,
				});
			}
		}
	} catch (e) {
		console.error('[sitemap] recipe DB query failed:', e);
	}

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(renderUrl).join('\n')}
</urlset>
`;

	setHeaders({
		'Content-Type': 'application/xml; charset=utf-8',
		'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
	});

	return new Response(body);
};
