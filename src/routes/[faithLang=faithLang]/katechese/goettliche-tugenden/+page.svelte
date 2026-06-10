<script>
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Anchor from '@lucide/svelte/icons/anchor';
	import Cross from '@lucide/svelte/icons/cross';
	import Heart from '@lucide/svelte/icons/heart';
	import { page } from '$app/state';
	import ApologetikToc from '$lib/components/faith/ApologetikToc.svelte';
	import ErstesGebotSeries from '$lib/components/faith/ErstesGebotSeries.svelte';
	import { m, langFromFaithSlug } from '$lib/js/faithI18n';

	const lang = $derived(langFromFaithSlug(page.url.pathname.split('/')[1]));
	const t = $derived(m[lang]);
	const isGerman = $derived(lang === 'de');

	const tocItems = [
		{ id: 'arten', short: 'Natürlich & übernatürlich', href: '#arten' },
		{ id: 'drei', short: 'Die drei göttlichen Tugenden', href: '#drei' },
		{ id: 'glaube', short: 'Glaube · fides', href: '#glaube' },
		{ id: 'glaube-gegenstand', short: 'Gegenstand', href: '#glaube-gegenstand', group: 'Glaube' },
		{ id: 'glaube-wirkungen', short: 'Wirkungen', href: '#glaube-wirkungen', group: 'Glaube' },
		{ id: 'glaube-verstoesse', short: 'Verstöße', href: '#glaube-verstoesse', group: 'Glaube' },
		{ id: 'hoffnung', short: 'Hoffnung · spes', href: '#hoffnung' },
		{ id: 'hoffnung-gegenstand', short: 'Gegenstand', href: '#hoffnung-gegenstand', group: 'Hoffnung' },
		{ id: 'hoffnung-wirkungen', short: 'Wirkungen', href: '#hoffnung-wirkungen', group: 'Hoffnung' },
		{ id: 'hoffnung-verstoesse', short: 'Verstöße', href: '#hoffnung-verstoesse', group: 'Hoffnung' },
		{ id: 'liebe', short: 'Liebe · caritas', href: '#liebe' },
		{ id: 'liebe-gegenstand', short: 'Gegenstand', href: '#liebe-gegenstand', group: 'Liebe' },
		{ id: 'liebe-wirkungen', short: 'Wirkungen', href: '#liebe-wirkungen', group: 'Liebe' },
		{ id: 'liebe-verstoesse', short: 'Verstöße', href: '#liebe-verstoesse', group: 'Liebe' },
		{ id: 'dauer', short: 'Dauer der Tugenden', href: '#dauer' }
	];

	let activeId = $state('');

	onMount(() => {
		const els = tocItems
			.map((it) => document.getElementById(it.id))
			.filter((el) => el !== null);
		if (!els.length) return;
		const io = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				if (visible[0]) {
					activeId = visible[0].target.id;
				}
			},
			{ rootMargin: '-64px 0px -60% 0px', threshold: 0 }
		);
		els.forEach((el) => io.observe(el));
		return () => io.disconnect();
	});

	/** @param {MouseEvent} e @param {string} id */
	function jumpTo(e, id) {
		const el = document.getElementById(id);
		if (!el) return;
		e.preventDefault();
		el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		history.replaceState(null, '', `#${id}`);
	}

	// Was man nicht kennt …
	const kennen = ['lieben', 'leben', 'verteidigen', 'weitergeben'];

	// Wirkungen der Liebe
	const liebeWirkungen = [
		'oft und gerne an Gott denken und in seiner Gegenwart wandeln',
		'seine Gebote halten und nach Heiligkeit streben',
		'auch die Mitmenschen um Gottes willen lieben'
	];

	// Verstöße gegen die Liebe — absteigend
	const liebeAbstieg = [
		{ name: 'Gleichgültigkeit', stufe: 1 },
		{ name: 'Lauheit', stufe: 2 },
		{ name: 'Undankbarkeit', stufe: 3 },
		{ name: 'Gotteshass', stufe: 4 }
	];

	// Dauer der drei Tugenden
	const dauer = [
		{ name: 'Glaube', latin: 'fides', color: 'var(--blue)', bis: 'bis zur Gottesschau', ende: 'erlischt', anteil: 62 },
		{ name: 'Hoffnung', latin: 'spes', color: 'var(--green)', bis: 'bis zum unverlierbaren Besitz', ende: 'erlischt', anteil: 74 },
		{ name: 'Liebe', latin: 'caritas', color: 'var(--red)', bis: 'bleibt in Ewigkeit', ende: '∞', anteil: 100 }
	];
</script>

<svelte:head>
	<title>Die göttlichen Tugenden - Bocken</title>
	<meta name="description" content="Glaube, Hoffnung und Liebe — die drei göttlichen Tugenden. Katechese nach P. Martin Ramm FSSP" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: 'Die göttlichen Tugenden',
		description: 'Katechese zu den drei göttlichen Tugenden Glaube, Hoffnung und Liebe — Aufbereitung des Glaubenskurses (3. Hauptteil) von P. Martin Ramm FSSP.',
		inLanguage: 'de',
		url: 'https://bocken.org/glaube/katechese/goettliche-tugenden',
		mainEntityOfPage: 'https://bocken.org/glaube/katechese/goettliche-tugenden',
		isAccessibleForFree: true,
		articleSection: 'Katechese',
		about: { '@type': 'Thing', name: 'Göttliche Tugenden' },
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
			{ '@type': 'ListItem', position: 3, name: 'Katechese', item: 'https://bocken.org/glaube/katechese' },
			{ '@type': 'ListItem', position: 4, name: 'Die göttlichen Tugenden', item: 'https://bocken.org/glaube/katechese/goettliche-tugenden' }
		]
	})}</script>`}
</svelte:head>

<div class="page-wrapper">
<ApologetikToc title="Inhalt" items={tocItems} {activeId} onItemClick={jumpTo} />
<div class="page">
	<header class="hero">
		<p class="eyebrow">Die Zehn Gebote &middot; Das erste Gebot</p>
		<h1>Die göttlichen Tugenden</h1>
		<p class="subtitle">Glaubenskurs, 3. Hauptteil &mdash; P. Martin Ramm FSSP</p>
	</header>

	{#if !isGerman}
		<p class="lang-notice">{t.only_german_pre}<a href={resolve('/glaube/katechese/goettliche-tugenden')}>{t.only_german_link}</a>{t.only_german_post}</p>
	{/if}

	<!-- ===== Natürlich vs übernatürlich ===== -->
	<section id="arten">
		<p class="lead">Man unterscheidet <em>natürliche</em> (sittliche) und <em>übernatürliche</em> (göttliche) Tugenden.</p>
		<div class="kind-grid">
			<div class="kind-card">
				<span class="kind-tag">natürlich</span>
				<p>Werden durch <strong>Übung erworben</strong>. Sie ordnen das natürliche Leben.</p>
			</div>
			<div class="kind-card accent">
				<span class="kind-tag">übernatürlich</span>
				<p>Werden mit der heiligmachenden Gnade von Gott in die Seele <strong>eingegossen</strong>. Sie richten den Menschen auf Gott hin aus.</p>
			</div>
		</div>
	</section>

	<!-- ===== Die drei Tugenden ===== -->
	<section id="drei">
		<h2>Die drei göttlichen Tugenden</h2>
		<div class="trinity">
			<a class="virtue-pillar v-glaube" href="#glaube" onclick={(e) => jumpTo(e, 'glaube')}>
				<span class="pillar-icon"><Cross size={30} strokeWidth={1.7} /></span>
				<span class="pillar-de">Glaube</span>
				<span class="pillar-la">fides</span>
			</a>
			<a class="virtue-pillar v-hoffnung" href="#hoffnung" onclick={(e) => jumpTo(e, 'hoffnung')}>
				<span class="pillar-icon"><Anchor size={30} strokeWidth={1.7} /></span>
				<span class="pillar-de">Hoffnung</span>
				<span class="pillar-la">spes</span>
			</a>
			<a class="virtue-pillar v-liebe greatest" href="#liebe" onclick={(e) => jumpTo(e, 'liebe')}>
				<span class="crown">das Größte</span>
				<span class="pillar-icon"><Heart size={30} strokeWidth={1.7} /></span>
				<span class="pillar-de">Liebe</span>
				<span class="pillar-la">caritas</span>
			</a>
		</div>
		<blockquote class="quote-scripture">
			<p>Jetzt bleiben Glaube, Hoffnung, Liebe, diese drei: das Größte von ihnen ist die Liebe.</p>
			<cite>1 Kor 13, 13</cite>
		</blockquote>
	</section>

	<!-- ============ A — GLAUBE ============ -->
	<section class="virtue v-glaube" id="glaube">
		<div class="virtue-head">
			<span class="virtue-letter"><Cross size={26} strokeWidth={2} /></span>
			<div>
				<h2>Glaube</h2>
				<span class="virtue-latin">fides</span>
			</div>
		</div>

		<div class="part" id="glaube-gegenstand">
			<span class="part-tag">1 · Gegenstand</span>
			<p>Glauben bedeutet, „dem offenbarenden Gott … vollen Gehorsam des Verstandes und des Willens zu leisten" (1. Vat., <em>Dei Filius</em>; KKK 154).</p>
			<blockquote class="quote-latin">
				<p>Credere est actus intellectus assentientis veritati divinae ex imperio voluntatis a Deo motae per gratiam.</p>
				<cite>hl. Thomas von Aquin, S. th. 2-2, 2, 2</cite>
			</blockquote>
			<p>Der Glaubensakt entsteht im Zusammenwirken dreier Kräfte:</p>
			<div class="formula">
				<div class="formula-node">
					<span class="formula-step">Gnade</span>
					<span class="formula-sub">bewegt …</span>
				</div>
				<ArrowRight class="formula-arrow" size={20} />
				<div class="formula-node">
					<span class="formula-step">Wille</span>
					<span class="formula-sub">befiehlt …</span>
				</div>
				<ArrowRight class="formula-arrow" size={20} />
				<div class="formula-node">
					<span class="formula-step">Verstand</span>
					<span class="formula-sub">stimmt zu</span>
				</div>
			</div>
			<p class="formula-result">&rarr; Zustimmung zur göttlichen Offenbarung</p>
			<p>Lebendig ist der Glaube, wenn er von der Liebe durchformt ist (<em>fides formata</em>) — im Unterschied zum bloßen Fürwahrhalten (<em>fides informis</em>).</p>
		</div>

		<div class="part" id="glaube-wirkungen">
			<span class="part-tag">2 · Wirkungen</span>
			<p>Glauben setzt Erkenntnis voraus — der Mensch muss zunächst bereit sein zu <strong>hören</strong>.</p>
			<blockquote class="quote-scripture">
				<p>So kommt der Glaube aus dem Hören, das Hören aber durch das Wort Christi.</p>
				<cite>Röm 10, 17 — <em>fides ex auditu</em></cite>
			</blockquote>
			<p>Jeder Christ ist verpflichtet, die wesentlichen Inhalte seines Glaubens zu kennen und zu bekennen. Denn was man nicht kennt …</p>
			<div class="kennen-grid">
				{#each kennen as k (k)}
					<div class="kennen-card">… kann man nicht <strong>{k}</strong>.</div>
				{/each}
			</div>
			<div class="etymologie">
				<span class="latin">credere</span>
				<span class="equals">=</span>
				<span class="latin">cor-dare</span>
				<span class="equals">=</span>
				<span class="meaning">das Herz geben</span>
			</div>
			<blockquote class="quote-church">
				<p>Der Jünger Christi muss den Glauben bewahren und aus ihm leben, ihn bekennen, mutig bezeugen und weitergeben.</p>
				<cite>KKK 1816</cite>
			</blockquote>
		</div>

		<div class="part" id="glaube-verstoesse">
			<span class="part-tag">3 · Verstöße</span>
			<p>Gegen den Glauben steht jede Form von <strong>Un-</strong> und <strong>Aberglauben</strong>. Religiöse Unwissenheit lässt den Glauben verkümmern.</p>
			<p class="dauer-note">Die Tugend des Glaubens dauert, bis wir Gott schauen von Angesicht zu Angesicht.</p>
		</div>
	</section>

	<!-- ============ B — HOFFNUNG ============ -->
	<section class="virtue v-hoffnung" id="hoffnung">
		<div class="virtue-head">
			<span class="virtue-letter"><Anchor size={26} strokeWidth={2} /></span>
			<div>
				<h2>Hoffnung</h2>
				<span class="virtue-latin">spes</span>
			</div>
		</div>

		<div class="part" id="hoffnung-gegenstand">
			<span class="part-tag">1 · Gegenstand</span>
			<p>Hoffen bedeutet, auf Gott zu vertrauen und von ihm das ewige Leben und alle zum Heil notwendigen Gnaden zu erwarten (vgl. KKK 1817).</p>
			<blockquote class="quote-church">
				<p>Die Hoffnung ist die vertrauensvolle Erwartung des göttlichen Segens und der beseligenden Gottesschau.</p>
				<cite>KKK 2090</cite>
			</blockquote>
			<blockquote class="quote-scripture">
				<p>Freut euch und frohlockt, denn euer Lohn ist groß im Himmel.</p>
				<cite>Mt 5, 12</cite>
			</blockquote>
		</div>

		<div class="part" id="hoffnung-wirkungen">
			<span class="part-tag">2 · Wirkungen</span>
			<p>Wie der Glaube Licht gibt, so gibt die Hoffnung dem ganzen Leben eine feste <em>Ausrichtung</em> auf das im Glauben erkannte Ziel. Nach einem Wort des hl. Franz von Sales wirft der Christ den <strong>Anker seiner Hoffnung nach oben</strong>.</p>
			<div class="anchor-visual">
				<Anchor size={64} strokeWidth={1.6} />
				<p class="anchor-cite">„Wir halten sie fest als zuverlässigen und festen Anker der Seele." — Hebr 6, 19</p>
			</div>
		</div>

		<div class="part" id="hoffnung-verstoesse">
			<span class="part-tag">3 · Verstöße</span>
			<p>Die Hoffnung erwartet das Heil von Gott und sonst nirgends — gegen Esoterik und Gnosis. Gegen sie stehen <strong>zwei entgegengesetzte</strong> Fehlhaltungen:</p>
			<div class="balance">
				<div class="balance-side">
					<span class="balance-name">Verzweiflung</span>
					<span class="balance-la">desperatio</span>
					<span class="balance-desc">Kleinmut — der Mensch hört auf, das Heil von Gott zu erhoffen.</span>
				</div>
				<div class="balance-center">
					<span class="balance-virtue">Hoffnung</span>
				</div>
				<div class="balance-side">
					<span class="balance-name">Vermessenheit</span>
					<span class="balance-la">praesumptio</span>
					<span class="balance-desc">Übermut — der Mensch hofft, ohne Bekehrung und ohne Hilfe von oben selig zu werden.</span>
				</div>
			</div>
			<p class="dauer-note">Die Tugend der Hoffnung dauert, bis wir die verheißenen Güter unverlierbar besitzen.</p>
		</div>
	</section>

	<!-- ============ C — LIEBE ============ -->
	<section class="virtue v-liebe" id="liebe">
		<div class="virtue-head">
			<span class="virtue-letter"><Heart size={26} strokeWidth={2} /></span>
			<div>
				<h2>Liebe</h2>
				<span class="virtue-latin">caritas</span>
			</div>
		</div>

		<div class="part" id="liebe-gegenstand">
			<span class="part-tag">1 · Gegenstand</span>
			<p>Lieben bedeutet, mit aller Kraft des Willens nach Gott zu streben, den wir im Glauben als das höchste Gut erkannt haben, und seine Liebe zu uns aufrichtig zu erwidern (KKK 2093).</p>
			<blockquote class="quote-church">
				<p>Die Liebe ist jene göttliche Tugend, kraft derer wir Gott um seiner selbst willen über alles lieben und aus Liebe zu Gott unseren Nächsten lieben wie uns selbst.</p>
				<cite>KKK 1822</cite>
			</blockquote>
			<p>Gott verdient totale Liebe, denn „Gott ist die Liebe" (1 Joh 4, 8). Diese Liebe ruht auf zwei Gründen:</p>
			<div class="grund-grid">
				<div class="grund-card">
					<span class="grund-num">1</span>
					<p>Die Liebe folgt der <strong>Erkenntnis des Guten</strong> — Gott aber ist das höchste, unendliche Gut.</p>
				</div>
				<div class="grund-card">
					<span class="grund-num">2</span>
					<p>Die Liebe ist <strong>Antwort auf empfangene Gaben</strong> — Gott ist als Schöpfer die Quelle allen Seins, vollkommener noch im Werk der Erlösung.</p>
				</div>
			</div>
			<blockquote class="quote-scripture">
				<p>Wir lieben, weil er uns zuvor geliebt hat.</p>
				<cite>1 Joh 4, 19</cite>
			</blockquote>
		</div>

		<div class="part" id="liebe-wirkungen">
			<span class="part-tag">2 · Wirkungen</span>
			<p>Die Gottesliebe bewirkt, dass der Mensch …</p>
			<ul class="wirk-list">
				{#each liebeWirkungen as w (w)}
					<li>{w}</li>
				{/each}
			</ul>
			<p>Wer Gott gefunden hat, achtet alles andere gering. Auch macht die Liebe bereit zum Opfer.</p>
			<blockquote class="quote-scripture">
				<p>Das Himmelreich ist gleich einem im Acker verborgenen Schatz, den einer fand … Voll Freude geht er hin, verkauft alles, was er hat, und kauft jenen Acker.</p>
				<cite>Mt 13, 44</cite>
			</blockquote>
		</div>

		<div class="part" id="liebe-verstoesse">
			<span class="part-tag">3 · Verstöße</span>
			<p>Gegen die Liebe stehen Gleichgültigkeit, Lauheit, Undankbarkeit und vor allem der <strong>Gotteshass</strong> — eine Abwärtsbewegung weg von Gott:</p>
			<div class="descent">
				{#each liebeAbstieg as stufe (stufe.name)}
					<div class="descent-step" style="margin-left: {(stufe.stufe - 1) * 1.5}rem">
						<span class="descent-name">{stufe.name}</span>
					</div>
				{/each}
			</div>
			<blockquote class="quote-church">
				<p>Hass gegen Gott entspringt dem Stolz. Er widersetzt sich der Liebe Gottes, dessen Güte er leugnet …</p>
				<cite>KKK 2094</cite>
			</blockquote>
			<p class="dauer-note">Die Tugend der Liebe dauert ewig — die Liebe der Sehnsucht wird zur Liebe des Besitzes.</p>
		</div>
	</section>

	<!-- ===== Dauer der Tugenden ===== -->
	<section id="dauer">
		<h2>Dauer der Tugenden</h2>
		<p>Glaube und Hoffnung erlöschen, wenn das Geschaute besessen wird — die Liebe allein bleibt in Ewigkeit.</p>
		<div class="duration">
			{#each dauer as d (d.name)}
				<div class="dur-row">
					<span class="dur-label" style="color: {d.color}">{d.name} <em>· {d.latin}</em></span>
					<div class="dur-track">
						<div class="dur-fill" class:eternal={d.ende === '∞'} style="width: {d.anteil}%; background: {d.color}"></div>
						<span class="dur-end" style="color: {d.color}">{d.ende}</span>
					</div>
					<span class="dur-bis">{d.bis}</span>
				</div>
			{/each}
			<div class="dur-axis"><span>Jetzt</span><span>Gottesschau</span><span>Ewigkeit</span></div>
		</div>
		<blockquote class="quote-scripture">
			<p>Die Liebe hört niemals auf.</p>
			<cite>1 Kor 13, 8</cite>
		</blockquote>
	</section>

	<ErstesGebotSeries current={2} />

	<p class="disclaimer">Diese Seite stellt eine freie Aufbereitung der erhaltenen Unterlagen dar und ist kein offizielles Angebot von P. Martin Ramm oder der FSSP. Etwaige Fehler oder Missverständnisse sind dem Verfasser dieser Seite anzulasten.</p>
</div>
</div>

<style>
	.page-wrapper {
		position: relative;
		max-width: 700px;
		margin: 0 auto;
	}
	.lang-notice {
		text-align: center;
		color: var(--nord10);
		font-style: italic;
		font-size: 0.85rem;
		margin-bottom: 1rem;
	}
	.lang-notice a {
		color: var(--nord10);
		text-decoration: underline;
	}
	.disclaimer {
		text-align: center;
		color: var(--color-text-tertiary);
		font-size: 0.75rem;
		font-style: italic;
		margin-top: 3rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border);
	}
	.page {
		max-width: 700px;
		margin: 0 auto;
		padding: 1em;
	}

	/* Hero */
	.hero {
		text-align: center;
		padding: 2rem 0 1rem;
	}
	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
		margin: 0 0 0.5em;
	}
	h1 {
		font-size: 2.4rem;
		margin: 0 0 0.25em;
		line-height: 1.15;
	}
	.subtitle {
		color: var(--color-text-tertiary);
		font-size: 0.9rem;
	}

	/* Sections */
	section {
		margin: 3rem 0;
		scroll-margin-top: 4rem;
	}
	section div[id] {
		scroll-margin-top: 4rem;
	}
	h2 {
		font-size: 1.5rem;
		margin-bottom: 1rem;
	}
	p {
		line-height: 1.6;
		margin: 0.75em 0;
	}
	li {
		line-height: 1.6;
		margin-bottom: 0.25em;
	}
	.lead {
		font-size: 1.1em;
	}

	/* Blockquotes */
	blockquote {
		border-left: 3px solid var(--nord10);
		margin: 1.25em 0;
		padding: 0.75em 1em;
		background: var(--color-surface);
		border-radius: 0 6px 6px 0;
	}
	blockquote p {
		margin: 0;
		font-style: italic;
	}
	blockquote cite {
		display: block;
		margin-top: 0.25em;
		font-size: 0.85rem;
		color: var(--color-text-tertiary);
		font-style: normal;
	}
	blockquote.quote-church {
		border-left-color: var(--nord14);
	}
	blockquote.quote-latin {
		border-left-color: var(--color-text-tertiary);
		background: var(--color-bg-tertiary);
	}
	blockquote.quote-latin p {
		font-variant: small-caps;
		letter-spacing: 0.01em;
	}

	/* Natürlich vs übernatürlich */
	.kind-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75em;
		margin: 1.25em 0;
	}
	.kind-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 1em;
	}
	.kind-card.accent {
		border-color: var(--color-primary);
		background: color-mix(in oklab, var(--color-primary) 8%, var(--color-surface));
	}
	.kind-tag {
		display: inline-block;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.4em;
	}
	.kind-card.accent .kind-tag {
		color: var(--color-primary);
	}
	.kind-card p {
		margin: 0;
		font-size: 0.92rem;
	}

	/* Drei Tugenden — pillars */
	.trinity {
		display: flex;
		gap: 0.75em;
		align-items: stretch;
		margin: 1.25em 0;
	}
	.virtue-pillar {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15em;
		padding: 1.5em 0.5em;
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: var(--color-text-primary);
		background: var(--color-surface);
		border: 2px solid var(--vc, var(--color-border));
		position: relative;
		transition: var(--transition-normal);
	}
	.virtue-pillar:hover {
		scale: 1.03;
		box-shadow: var(--shadow-sm);
	}
	.virtue-pillar.greatest {
		background: color-mix(in oklab, var(--vc) 12%, var(--color-surface));
	}
	.pillar-icon {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--vc);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.5em;
	}
	.pillar-de {
		font-size: 1.2em;
		font-weight: 700;
		color: var(--vc);
	}
	.pillar-la {
		font-style: italic;
		font-size: 0.85rem;
		color: var(--color-text-tertiary);
	}
	.crown {
		position: absolute;
		top: -0.7em;
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 700;
		background: var(--vc);
		color: #fff;
		padding: 0.2em 0.6em;
		border-radius: var(--radius-pill);
	}

	/* Virtue colour themes */
	.v-glaube {
		--vc: var(--blue);
	}
	.v-hoffnung {
		--vc: var(--green);
	}
	.v-liebe {
		--vc: var(--red);
	}

	/* Virtue section */
	.virtue {
		border-top: 2px solid var(--vc);
		padding-top: 1.5rem;
	}
	.virtue-head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	.virtue-letter {
		width: 48px;
		height: 48px;
		flex-shrink: 0;
		border-radius: 50%;
		background: var(--vc);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 1.4rem;
		font-family: serif;
	}
	.virtue-head h2 {
		margin: 0;
		color: var(--vc);
	}
	.virtue-latin {
		font-style: italic;
		color: var(--color-text-tertiary);
		font-size: 0.95rem;
	}
	.part {
		margin: 1.5em 0;
		padding-left: 1em;
		border-left: 2px solid color-mix(in oklab, var(--vc) 35%, transparent);
	}
	.part-tag {
		display: inline-block;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-weight: 700;
		color: var(--vc);
		margin-bottom: 0.3em;
	}
	.dauer-note {
		font-size: 0.9rem;
		color: var(--color-text-secondary);
		font-style: italic;
		border-top: 1px dashed var(--color-border);
		padding-top: 0.6em;
		margin-top: 1em;
	}

	/* Aquinas formula */
	.formula {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4em;
		flex-wrap: wrap;
		margin: 1em 0 0.25em;
	}
	.formula-node {
		background: var(--color-surface);
		border: 1px solid var(--vc);
		border-radius: var(--radius-md);
		padding: 0.6em 0.9em;
		text-align: center;
		min-width: 88px;
	}
	.formula-step {
		display: block;
		font-weight: 700;
		color: var(--vc);
	}
	.formula-sub {
		display: block;
		font-size: 0.78rem;
		color: var(--color-text-secondary);
	}
	:global(.formula-arrow) {
		color: var(--color-text-tertiary);
		flex-shrink: 0;
	}
	.formula-result {
		text-align: center;
		font-weight: 600;
		color: var(--color-text-secondary);
		margin: 0.25em 0 0;
	}

	/* Was man nicht kennt */
	.kennen-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5em;
		margin: 1em 0;
	}
	.kennen-card {
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-sm);
		padding: 0.7em 0.9em;
		font-size: 0.92rem;
	}

	/* Etymology */
	.etymologie {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5em;
		font-size: 1.1em;
		margin: 1.25em 0;
		flex-wrap: wrap;
	}
	.latin {
		font-style: italic;
		font-weight: bold;
	}
	.equals {
		color: var(--color-text-tertiary);
	}
	.meaning {
		font-weight: 600;
	}

	/* Anchor */
	.anchor-visual {
		text-align: center;
		margin: 1em 0;
		color: var(--vc);
	}
	.anchor-cite {
		font-size: 0.85rem;
		font-style: italic;
		color: var(--color-text-secondary);
		margin: 0.25em 0 0;
	}

	/* Balance — Verzweiflung / Vermessenheit */
	.balance {
		display: flex;
		align-items: stretch;
		gap: 0.5em;
		margin: 1em 0;
	}
	.balance-side {
		flex: 1;
		background: color-mix(in oklab, var(--nord12) 10%, var(--color-surface));
		border: 1px solid var(--nord12);
		border-radius: var(--radius-md);
		padding: 0.8em;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 0.15em;
	}
	.balance-name {
		font-weight: 700;
		color: var(--nord12);
	}
	.balance-la {
		font-style: italic;
		font-size: 0.8rem;
		color: var(--color-text-tertiary);
	}
	.balance-desc {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		margin-top: 0.25em;
		line-height: 1.35;
	}
	.balance-center {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 0.5em;
	}
	.balance-virtue {
		font-weight: 700;
		color: var(--green);
		writing-mode: vertical-rl;
		text-orientation: mixed;
		transform: rotate(180deg);
		font-size: 0.95rem;
	}

	/* Grund cards (Liebe) */
	.grund-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6em;
		margin: 1em 0;
	}
	.grund-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.9em;
	}
	.grund-num {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--vc);
		color: #fff;
		font-weight: 700;
		font-size: 0.8rem;
		margin-bottom: 0.4em;
	}
	.grund-card p {
		margin: 0;
		font-size: 0.9rem;
	}
	.wirk-list {
		padding-left: 1.4em;
	}

	/* Descent — Verstöße gegen die Liebe */
	.descent {
		margin: 1em 0;
	}
	.descent-step {
		background: var(--color-surface);
		border-left: 3px solid var(--nord12);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		padding: 0.5em 0.9em;
		margin-bottom: 0.3em;
		transition: var(--transition-fast);
	}
	.descent-step:last-child {
		border-left-color: var(--nord11);
		background: color-mix(in oklab, var(--nord11) 12%, var(--color-surface));
	}
	.descent-name {
		font-weight: 600;
	}
	.descent-step:last-child .descent-name {
		color: var(--nord11);
	}

	/* Dauer der Tugenden */
	.duration {
		margin: 1.25em 0;
	}
	.dur-row {
		display: grid;
		grid-template-columns: 140px 1fr;
		grid-template-areas: 'label track' 'bis bis';
		gap: 0.25em 0.75em;
		align-items: center;
		margin-bottom: 0.9em;
	}
	.dur-label {
		grid-area: label;
		font-weight: 700;
		font-size: 0.9rem;
	}
	.dur-label em {
		font-weight: 400;
		font-size: 0.8rem;
		color: var(--color-text-tertiary);
	}
	.dur-track {
		grid-area: track;
		position: relative;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		height: 22px;
		display: flex;
		align-items: center;
	}
	.dur-fill {
		height: 100%;
		border-radius: var(--radius-pill);
		opacity: 0.85;
	}
	.dur-fill.eternal {
		background: linear-gradient(90deg, var(--red), color-mix(in oklab, var(--red) 40%, transparent)) !important;
	}
	.dur-end {
		position: absolute;
		right: 0.6em;
		font-weight: 700;
		font-size: 0.85rem;
	}
	.dur-bis {
		grid-area: bis;
		font-size: 0.78rem;
		color: var(--color-text-secondary);
		font-style: italic;
	}
	.dur-axis {
		display: flex;
		justify-content: space-between;
		font-size: 0.7rem;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		border-top: 1px solid var(--color-border);
		padding-top: 0.4em;
		margin-top: 0.5em;
	}

	/* Mobile */
	@media (max-width: 600px) {
		h1 {
			font-size: 1.7rem;
		}
		.kind-grid,
		.kennen-grid,
		.grund-grid {
			grid-template-columns: 1fr;
		}
		.trinity {
			flex-direction: column;
		}
		.virtue-pillar {
			flex-direction: row;
			justify-content: center;
			gap: 0.5em;
			padding: 1em;
		}
		.crown {
			top: -0.6em;
		}
		.balance {
			flex-direction: column;
		}
		.balance-virtue {
			writing-mode: horizontal-tb;
			transform: none;
		}
		.formula {
			flex-direction: column;
		}
		:global(.formula-arrow) {
			rotate: 90deg;
		}
		.dur-row {
			grid-template-columns: 1fr;
			grid-template-areas: 'label' 'track' 'bis';
		}
	}
</style>
