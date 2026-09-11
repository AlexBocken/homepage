<script>
	import { resolve } from '$app/paths';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Cross from '@lucide/svelte/icons/cross';
	import Anchor from '@lucide/svelte/icons/anchor';
	import Heart from '@lucide/svelte/icons/heart';
	import Flame from '@lucide/svelte/icons/flame';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Scale from '@lucide/svelte/icons/scale';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { catechismSlug, m } from '$lib/js/faithI18n';

	/** @typedef {import('$lib/js/faithI18n').FaithLang} FaithLang */
	let { data } = $props();
	const lang = $derived(/** @type {FaithLang} */ (data.lang));
	const t = $derived(m[lang]);
	const isGerman = $derived(lang === 'de');

	// The Catechism is read in whichever language the reader is in; the course on
	// the commandments exists only in German.
	const catechism = $derived(catechismSlug(lang));
	const cccHref = $derived(resolve('/[faithLang=faithLang]/[katechese=katecheseLang]/[catechism=catechismLang]', { faithLang: data.faithLang, katechese: data.katechese, catechism }));
	const registerHref = $derived(resolve('/[faithLang=faithLang]/[katechese=katecheseLang]/[catechism=catechismLang]/register', { faithLang: data.faithLang, katechese: data.katechese, catechism }));
	const glossaryHref = $derived(resolve('/[faithLang=faithLang]/[katechese=katecheseLang]/[catechism=catechismLang]/glossar', { faithLang: data.faithLang, katechese: data.katechese, catechism }));
	const searchHref = $derived(resolve('/[faithLang=faithLang]/[katechese=katecheseLang]/[catechism=catechismLang]/suche', { faithLang: data.faithLang, katechese: data.katechese, catechism }));

	/** @param {MouseEvent} e @param {string} id */
	function jumpTo(e, id) {
		const el = document.getElementById(id);
		if (!el) return;
		e.preventDefault();
		el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		history.replaceState(null, '', `#${id}`);
	}

	const gebote = [
		{ nr: 1, roman: 'I', text: 'Du sollst keine anderen Götter neben mir haben.', tablet: 'god', active: true, anchor: 'vertiefungen' },
		{ nr: 2, roman: 'II', text: 'Du sollst den Namen Gottes nicht verunehren.', tablet: 'god', active: true, anchor: 'zweites' },
		{ nr: 3, roman: 'III', text: 'Du sollst den Sonntag heiligen.', tablet: 'god', active: false, anchor: '' },
		{ nr: 4, roman: 'IV', text: 'Du sollst Vater und Mutter ehren.', tablet: 'neighbor', active: false, anchor: '' },
		{ nr: 5, roman: 'V', text: 'Du sollst nicht töten.', tablet: 'neighbor', active: false, anchor: '' },
		{ nr: 6, roman: 'VI', text: 'Du sollst nicht Unkeuschheit treiben.', tablet: 'neighbor', active: false, anchor: '' },
		{ nr: 7, roman: 'VII', text: 'Du sollst nicht stehlen.', tablet: 'neighbor', active: false, anchor: '' },
		{ nr: 8, roman: 'VIII', text: 'Du sollst kein falsches Zeugnis geben.', tablet: 'neighbor', active: false, anchor: '' },
		{ nr: 9, roman: 'IX', text: 'Du sollst nicht Unkeusches begehren.', tablet: 'neighbor', active: false, anchor: '' },
		{ nr: 10, roman: 'X', text: 'Du sollst nicht begehren deines Nächsten Hab und Gut.', tablet: 'neighbor', active: false, anchor: '' }
	];
	const tafelGott = gebote.filter((g) => g.tablet === 'god');
	const tafelNaechster = gebote.filter((g) => g.tablet === 'neighbor');
</script>

<svelte:head>
	<title>Katechese - Bocken</title>
	<meta name="description" content="Katechese: der Katechismus der Katholischen Kirche zum Nachschlagen, und die Zehn Gebote Gottes nach dem Glaubenskurs von P. Martin Ramm FSSP" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: 'Die Zehn Gebote Gottes',
		description: 'Katechese zu den Zehn Geboten Gottes — Ursprung, biblischer Text und Vertiefungen. Aufbereitung des Glaubenskurses (3. Hauptteil) von P. Martin Ramm FSSP.',
		inLanguage: 'de',
		url: 'https://bocken.org/glaube/katechese',
		mainEntityOfPage: 'https://bocken.org/glaube/katechese',
		isAccessibleForFree: true,
		articleSection: 'Katechese',
		about: { '@type': 'Thing', name: 'Dekalog' },
		author: { '@type': 'Person', name: 'Alexander Bocken', url: 'https://bocken.org/' },
		publisher: { '@type': 'Person', name: 'Alexander Bocken', url: 'https://bocken.org/' },
		citation: [
			{ '@type': 'CreativeWork', name: 'Glaubenskurs, 3. Hauptteil', author: { '@type': 'Person', name: 'P. Martin Ramm FSSP' } }
		]
	})}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'Bocken', item: 'https://bocken.org/' },
			{ '@type': 'ListItem', position: 2, name: 'Glaube', item: 'https://bocken.org/glaube' },
			{ '@type': 'ListItem', position: 3, name: 'Katechese', item: 'https://bocken.org/glaube/katechese' }
		]
	})}</script>`}
</svelte:head>

<div class="page-wrapper katechese">
<div class="page">
	<header class="hero">
		<p class="eyebrow">{t.title} &middot; {t.catechesis}</p>
		<h1>{t.catechesis}</h1>
		<p class="subtitle">Der Katechismus der Kirche &mdash; und ein Glaubenskurs zu den Zehn Geboten.</p>
	</header>

	<!-- Der Katechismus selbst: das Buch, aus dem alles Übrige zitiert. -->
	<a class="ccc-card" href={cccHref}>
		<span class="ccc-abbr">{catechism.toUpperCase()}</span>
		<span class="ccc-body">
			<span class="ccc-title">{t.ccc_title}</span>
			<span class="ccc-desc">{t.ccc_description}</span>
		</span>
		<ArrowRight class="ccc-go" size={20} />
	</a>
	<nav class="ccc-ways" aria-label={t.ccc_title}>
		<a href={searchHref}>{t.ccc_search_go}</a>
		<a href={registerHref}>{t.ccc_register}</a>
		<a href={glossaryHref}>{t.ccc_glossary}</a>
	</nav>

	{#if !isGerman}
		<p class="lang-notice">{t.only_german_pre}<a href={resolve('/glaube/katechese')}>{t.only_german_link}</a>{t.only_german_post}</p>
	{/if}

	<!-- Die zwei Tafeln -->
	<section id="tafeln">
		<p class="eyebrow">Glaubenskurs 3. Hauptteil &middot; P. Martin Ramm FSSP</p>
		<h2 class="big">Die Zehn Gebote Gottes</h2>
		<p class="intro-text">Die zehn Worte teilen sich auf zwei Tafeln: die Liebe zu Gott und die Liebe zum Nächsten. Wählen Sie ein Gebot, um es zu vertiefen.</p>

		<div class="tablets">
			<div class="tablet">
				<span class="tablet-label">Liebe zu Gott</span>
				<div class="cmd-list">
					{#each tafelGott as g (g.nr)}
						{#if g.active}
							<a class="cmd active" href={'#' + g.anchor} onclick={(e) => jumpTo(e, g.anchor)}>
								<span class="cmd-nr">{g.roman}</span>
								<span class="cmd-text">{g.text}</span>
								<ArrowDown class="cmd-arrow" size={16} />
							</a>
						{:else}
							<div class="cmd inactive">
								<span class="cmd-nr">{g.roman}</span>
								<span class="cmd-text">{g.text}</span>
								<span class="cmd-soon">bald</span>
							</div>
						{/if}
					{/each}
				</div>
			</div>

			<div class="tablet">
				<span class="tablet-label">Liebe zum Nächsten</span>
				<div class="cmd-list">
					{#each tafelNaechster as g (g.nr)}
						<div class="cmd inactive">
							<span class="cmd-nr">{g.roman}</span>
							<span class="cmd-text">{g.text}</span>
							<span class="cmd-soon">bald</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- Einführung — auf eigener Seite -->
	<section id="einfuehrung">
		<h2>Einführung in den Dekalog</h2>
		<p class="intro-text">Woher die Zehn Gebote kommen, warum Gott sie gegeben hat und wie ihr biblischer Wortlaut lautet.</p>
		<div class="path">
			<a class="path-step solo" href={resolve('/[faithLang=faithLang]/[katechese=katecheseLang]/einfuehrung', { faithLang: data.faithLang, katechese: data.katechese })}>
				<span class="step-icon"><BookOpen size={26} strokeWidth={1.7} /></span>
				<span class="step-body">
					<span class="step-title">Ursprung und Sinn</span>
					<span class="step-desc">Der Sinai, die Befreiung aus der Knechtschaft und der Text von Ex 20.</span>
				</span>
				<ArrowRight class="step-go" size={18} />
			</a>
		</div>
	</section>
	<!-- Vertiefungen zum ersten Gebot -->
	<section id="vertiefungen">
		<div class="vert-head">
			<span class="vert-nr">I</span>
			<div>
				<h2>Das erste Gebot</h2>
				<p class="vert-sub">In drei Schritten — von der Einführung über die göttlichen Tugenden bis zu Gelübde &amp; Sünden.</p>
			</div>
		</div>

		<div class="path">
			<a class="path-step" href={resolve('/[faithLang=faithLang]/[katechese=katecheseLang]/erstes-gebot', { faithLang: data.faithLang, katechese: data.katechese })}>
				<span class="step-badge">1</span>
				<span class="step-icon"><BookOpen size={26} strokeWidth={1.7} /></span>
				<span class="step-body">
					<span class="step-title">Einführung</span>
					<span class="step-desc">Anerkennung Gottes und die Tugend der Religion — glauben, hoffen, lieben.</span>
				</span>
				<ArrowRight class="step-go" size={18} />
			</a>

			<a class="path-step" href={resolve('/[faithLang=faithLang]/[katechese=katecheseLang]/goettliche-tugenden', { faithLang: data.faithLang, katechese: data.katechese })}>
				<span class="step-badge">2</span>
				<span class="step-icon trio">
					<Cross size={18} strokeWidth={2} color="var(--blue)" /><Anchor size={18} strokeWidth={2} color="var(--green)" /><Heart size={18} strokeWidth={2} color="var(--red)" />
				</span>
				<span class="step-body">
					<span class="step-title">Göttliche Tugenden</span>
					<span class="step-desc">Glaube, Hoffnung und Liebe — Gegenstand, Wirkungen und Verstösse.</span>
				</span>
				<ArrowRight class="step-go" size={18} />
			</a>

			<a class="path-step" href={resolve('/[faithLang=faithLang]/[katechese=katecheseLang]/geluebde-und-suenden', { faithLang: data.faithLang, katechese: data.katechese })}>
				<span class="step-badge">3</span>
				<span class="step-icon flame-heart">
					<span class="fh-base"><Heart size={28} strokeWidth={1.7} /></span>
					<span class="fh-fire"><Flame size={14} strokeWidth={2.2} /></span>
				</span>
				<span class="step-body">
					<span class="step-title">Gelübde &amp; Sünden</span>
					<span class="step-desc">Das Gelübde und die Sünden gegen das erste Gebot.</span>
				</span>
				<ArrowRight class="step-go" size={18} />
			</a>
		</div>
	</section>

	<!-- Vertiefung zum zweiten Gebot -->
	<section id="zweites">
		<div class="vert-head">
			<span class="vert-nr">II</span>
			<div>
				<h2>Das zweite Gebot</h2>
				<p class="vert-sub">In drei Schritten &mdash; vom heiligen Namen über die Verstösse bis zum Eid.</p>
			</div>
		</div>

		<div class="path">
			<a class="path-step c-purple" href={resolve('/[faithLang=faithLang]/[katechese=katecheseLang]/zweites-gebot', { faithLang: data.faithLang, katechese: data.katechese })}>
				<span class="step-badge">1</span>
				<span class="step-icon"><Sparkles size={26} strokeWidth={1.7} /></span>
				<span class="step-body">
					<span class="step-title">Der Name Gottes</span>
					<span class="step-desc">Das Tetragramm, die Ehre Gottes und die Bestimmung des Menschen.</span>
				</span>
				<ArrowRight class="step-go" size={18} />
			</a>

			<a class="path-step c-red" href={resolve('/[faithLang=faithLang]/[katechese=katecheseLang]/verstoesse-gegen-den-namen', { faithLang: data.faithLang, katechese: data.katechese })}>
				<span class="step-badge">2</span>
				<span class="step-icon"><TriangleAlert size={26} strokeWidth={1.7} /></span>
				<span class="step-body">
					<span class="step-title">Verstösse gegen den Namen</span>
					<span class="step-desc">Unbedachtes Aussprechen, Fluchen, Blasphemie und Sakrileg.</span>
				</span>
				<ArrowRight class="step-go" size={18} />
			</a>

			<a class="path-step c-green" href={resolve('/[faithLang=faithLang]/[katechese=katecheseLang]/eid-und-schwur', { faithLang: data.faithLang, katechese: data.katechese })}>
				<span class="step-badge">3</span>
				<span class="step-icon"><Scale size={26} strokeWidth={1.7} /></span>
				<span class="step-body">
					<span class="step-title">Der Eid</span>
					<span class="step-desc">Wesen und Bedingungen des Schwurs &mdash; und der Meineid.</span>
				</span>
				<ArrowRight class="step-go" size={18} />
			</a>
		</div>
	</section>

	<p class="disclaimer">Diese Seiten stellen eine freie Aufbereitung der erhaltenen Unterlagen dar und sind kein offizielles Angebot von P. Martin Ramm oder der FSSP. Etwaige Fehler oder Missverständnisse sind dem Verfasser dieser Seiten anzulasten.</p>
</div>
</div>

<style>

	.intro-text {
		color: var(--color-text-secondary);
	}

	/* ---- the Catechism, at the head of the section ---- */
	.ccc-card {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 1.1rem;
		margin-top: 1rem;
		padding: 1.25rem 1.4rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-left: 4px solid var(--color-primary);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		color: inherit;
		text-decoration: none;
		transition: scale var(--transition-fast), box-shadow var(--transition-fast);
	}
	.ccc-card:hover,
	.ccc-card:focus-visible {
		scale: 1.01;
		box-shadow: var(--shadow-hover);
	}
	.ccc-abbr {
		font-family: serif;
		font-size: 1.9rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		line-height: 1;
		color: var(--color-primary);
	}
	.ccc-body {
		display: grid;
		gap: 0.25rem;
		min-width: 0;
	}
	.ccc-title {
		font-size: 1.15rem;
		font-weight: 600;
		line-height: 1.25;
	}
	.ccc-desc {
		font-size: 0.85rem;
		line-height: 1.4;
		color: var(--color-text-secondary);
	}
	:global(.ccc-go) {
		color: var(--color-primary);
	}
	.ccc-ways {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0.6rem 0 0;
	}
	.ccc-ways a {
		padding: 0.3em 0.9em;
		font-size: 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		text-decoration: none;
		transition: scale var(--transition-fast), color var(--transition-fast);
	}
	.ccc-ways a:hover,
	.ccc-ways a:focus-visible {
		scale: 1.05;
		color: var(--color-primary);
	}

	/* The commandments are what this section is chiefly about, so they are set
	   large enough to read as the page's centre rather than as a list. */
	.big {
		font-size: 2rem;
		line-height: 1.15;
		margin-bottom: 0.5rem;
	}
	#tafeln .eyebrow {
		margin-bottom: 0.35em;
	}

	/* Two tablets */
	.tablets {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		align-items: stretch;
		margin-top: 1.25rem;
	}
	.tablet {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 110px 110px var(--radius-md) var(--radius-md);
		padding: 2.5rem 1.2rem 1.5rem;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
	}
	.tablet-label {
		display: block;
		text-align: center;
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		margin-bottom: 0.75rem;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
	}
	.cmd-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.cmd {
		display: grid;
		grid-template-columns: 1.8em 1fr auto;
		align-items: center;
		gap: 0.6em;
		padding: 0.65em 0.7em;
		border-radius: var(--radius-sm);
		border-left: 3px solid transparent;
		text-decoration: none;
		color: var(--color-text-primary);
	}
	.cmd-nr {
		font-family: serif;
		font-weight: 700;
		font-size: 1.2em;
		text-align: center;
		color: var(--color-text-tertiary);
	}
	.cmd-text {
		font-size: 1rem;
		line-height: 1.3;
	}
	.cmd.active {
		border-left-color: var(--color-primary);
		background: color-mix(in oklab, var(--color-primary) 12%, var(--color-surface));
		font-weight: 600;
		cursor: pointer;
		transition: var(--transition-normal);
	}
	.cmd.active .cmd-nr {
		color: var(--color-primary);
	}
	.cmd.active:hover {
		background: color-mix(in oklab, var(--color-primary) 20%, var(--color-surface));
	}
	:global(.cmd-arrow) {
		color: var(--color-primary);
	}
	.cmd.inactive {
		opacity: 0.5;
	}
	.cmd-soon {
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		padding: 0.1em 0.5em;
	}

	/* Vertiefungen — the first commandment path */
	.vert-head {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}
	.vert-nr {
		font-size: 3em;
		font-weight: 700;
		font-family: serif;
		line-height: 1;
		color: var(--color-primary);
	}
	.vert-head h2 {
		margin: 0;
	}
	.vert-sub {
		color: var(--color-text-secondary);
		font-size: 0.92rem;
		margin-top: 0.25em;
	}

	.path {
		display: flex;
		flex-direction: column;
		gap: 0;
		position: relative;
	}
	.path-step {
		display: grid;
		grid-template-columns: auto auto 1fr auto;
		align-items: center;
		gap: 0.9rem;
		padding: 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: var(--color-text-primary);
		transition: var(--transition-normal);
		position: relative;
		margin-bottom: 1.25rem;
	}
	/* connecting line between steps */
	.path-step:not(:last-child)::after {
		content: '';
		position: absolute;
		left: calc(1rem + 0.9em);
		bottom: -1.25rem;
		height: 1.25rem;
		width: 2px;
		background: var(--color-border);
	}
	.path-step.solo {
		grid-template-columns: auto 1fr auto;
	}
	.path-step:hover {
		border-color: var(--color-primary);
		scale: 1.01;
		box-shadow: var(--shadow-sm);
	}
	.step-badge {
		width: 1.8em;
		height: 1.8em;
		border-radius: 50%;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		display: grid;
		place-items: center;
		font-weight: 700;
		font-size: 0.9rem;
	}
	.step-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--vc);
		width: 2em;
	}
	.step-icon.trio {
		gap: 2px;
		width: auto;
	}
	.flame-heart {
		position: relative;
		width: 2em;
	}
	.fh-base {
		color: var(--red);
		display: flex;
	}
	.fh-fire {
		position: absolute;
		top: -7px;
		left: 50%;
		transform: translateX(-50%);
		color: var(--orange);
	}
	.step-body {
		display: flex;
		flex-direction: column;
		gap: 0.15em;
	}
	.step-title {
		font-weight: 700;
	}
	.step-desc {
		font-size: 0.82rem;
		color: var(--color-text-secondary);
		line-height: 1.35;
	}
	:global(.step-go) {
		color: var(--color-text-tertiary);
	}
	.path-step:hover :global(.step-go) {
		color: var(--color-primary);
	}

	/* Mobile */
	@media (max-width: 600px) {
		.tablets {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
		.tablet {
			border-radius: 80px 80px var(--radius-md) var(--radius-md);
		}
		.path-step {
			grid-template-columns: auto 1fr auto;
		}
		.step-icon {
			display: none;
		}
		.path-step:not(:last-child)::after {
			left: calc(1rem + 0.9em);
		}
		.vert-head {
			gap: 0.75rem;
		}
		}

</style>
