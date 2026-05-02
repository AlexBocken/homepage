const SITE = 'https://bocken.org';

export type Crumb = { name: string; path: string };

export interface BreadcrumbListJsonLd {
	'@context': 'https://schema.org';
	'@type': 'BreadcrumbList';
	itemListElement: Array<{
		'@type': 'ListItem';
		position: number;
		name: string;
		item: string;
	}>;
}

/** Build a BreadcrumbList. Pass crumbs in order from root → current page.
 *  Last crumb's `item` is omitted per Google guidance (current page).
 *  Paths are relative ("/rezepte"); SITE is prepended. */
export function generateBreadcrumbJsonLd(crumbs: Crumb[]): BreadcrumbListJsonLd {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: crumbs.map((c, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: c.name,
			item: `${SITE}${c.path}`,
		})),
	};
}
