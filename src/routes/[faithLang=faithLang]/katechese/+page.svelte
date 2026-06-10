<script>
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Cross from '@lucide/svelte/icons/cross';
	import Anchor from '@lucide/svelte/icons/anchor';
	import Heart from '@lucide/svelte/icons/heart';
	import Flame from '@lucide/svelte/icons/flame';
	import ApologetikToc from '$lib/components/faith/ApologetikToc.svelte';
	import { m } from '$lib/js/faithI18n';

	/** @typedef {import('$lib/js/faithI18n').FaithLang} FaithLang */
	let { data } = $props();
	const lang = $derived(/** @type {FaithLang} */ (data.lang));
	const t = $derived(m[lang]);
	const isGerman = $derived(lang === 'de');

	const tocItems = [
		{ id: 'tafeln', short: 'Die zwei Tafeln', href: '#tafeln' },
		{ id: 'ursprung', short: 'Ursprung', href: '#ursprung' },
		{ id: 'warum', short: 'Warum die 10 Gebote?', href: '#warum' },
		{ id: 'biblischer-text', short: 'Biblischer Text', href: '#biblischer-text' },
		{ id: 'vertiefungen', short: 'Das erste Gebot', href: '#vertiefungen' }
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

	const gebote = [
		{ nr: 1, roman: 'I', text: 'Du sollst keine anderen Götter neben mir haben.', tablet: 'god', active: true },
		{ nr: 2, roman: 'II', text: 'Du sollst den Namen Gottes nicht verunehren.', tablet: 'god', active: false },
		{ nr: 3, roman: 'III', text: 'Du sollst den Sonntag heiligen.', tablet: 'god', active: false },
		{ nr: 4, roman: 'IV', text: 'Du sollst Vater und Mutter ehren.', tablet: 'neighbor', active: false },
		{ nr: 5, roman: 'V', text: 'Du sollst nicht töten.', tablet: 'neighbor', active: false },
		{ nr: 6, roman: 'VI', text: 'Du sollst nicht Unkeuschheit treiben.', tablet: 'neighbor', active: false },
		{ nr: 7, roman: 'VII', text: 'Du sollst nicht stehlen.', tablet: 'neighbor', active: false },
		{ nr: 8, roman: 'VIII', text: 'Du sollst kein falsches Zeugnis geben.', tablet: 'neighbor', active: false },
		{ nr: 9, roman: 'IX', text: 'Du sollst nicht Unkeusches begehren.', tablet: 'neighbor', active: false },
		{ nr: 10, roman: 'X', text: 'Du sollst nicht begehren deines Nächsten Hab und Gut.', tablet: 'neighbor', active: false }
	];
	const tafelGott = gebote.filter((g) => g.tablet === 'god');
	const tafelNaechster = gebote.filter((g) => g.tablet === 'neighbor');
</script>

<svelte:head>
	<title>Die Zehn Gebote Gottes - Bocken</title>
	<meta name="description" content="Die Zehn Gebote Gottes — Ursprung, biblischer Text und Vertiefungen zum ersten Gebot. Katechese nach P. Martin Ramm FSSP" />
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
			{ '@type': 'ListItem', position: 3, name: 'Die Zehn Gebote', item: 'https://bocken.org/glaube/katechese' }
		]
	})}</script>`}
</svelte:head>

<div class="page-wrapper">
<ApologetikToc title="Inhalt" items={tocItems} {activeId} onItemClick={jumpTo} />
<div class="page">
	<header class="hero">
		<p class="eyebrow">Katechese &middot; Glaubenskurs 3. Hauptteil</p>
		<h1>Die Zehn Gebote Gottes</h1>
		<p class="subtitle">P. Martin Ramm FSSP</p>
	</header>

	{#if !isGerman}
		<p class="lang-notice">{t.only_german_pre}<a href={resolve('/glaube/katechese')}>{t.only_german_link}</a>{t.only_german_post}</p>
	{/if}

	<!-- Die zwei Tafeln -->
	<section id="tafeln">
		<h2>Die zwei Tafeln</h2>
		<p class="intro-text">Die zehn Worte teilen sich auf zwei Tafeln: die Liebe zu Gott und die Liebe zum Nächsten. Wählen Sie ein Gebot, um es zu vertiefen.</p>

		<div class="tablets">
			<div class="tablet">
				<span class="tablet-label">Liebe zu Gott</span>
				<div class="cmd-list">
					{#each tafelGott as g (g.nr)}
						{#if g.active}
							<a class="cmd active" href="#vertiefungen" onclick={(e) => jumpTo(e, 'vertiefungen')}>
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

	<section id="ursprung">
		<h2>Ursprung</h2>
		<p>Die Zehn Gebote (Dekalog, von <em>deca-logos</em> = zehn Worte) haben Gott selbst zum Urheber. Er hat sie dem Moses am Sinai gegeben (Ex 19–20) und auf zwei steinerne Tafeln geschrieben:</p>
		<blockquote class="quote-scripture">
			<p>Der Herr redete zu euch mitten aus dem Feuer heraus. &hellip; Er verkündete euch seinen Bund, welchen er euch zu halten gebot, die zehn Worte; und er schrieb sie auf zwei steinerne Tafeln.</p>
			<cite>Dt 4, 12f.</cite>
		</blockquote>
		<p>Jesus Christus hat die Gebote bestätigt:</p>
		<blockquote class="quote-scripture">
			<p>Denkt nicht, ich sei gekommen, das Gesetz oder die Propheten aufzuheben. Ich bin nicht gekommen aufzuheben, sondern zu erfüllen.</p>
			<cite>Mt 5, 17</cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Willst du aber zum Leben eingehen, so halte die Gebote!</p>
			<cite>Mt 19, 17</cite>
		</blockquote>
	</section>

	<section id="warum">
		<h2>Warum hat Gott die 10 Gebote gegeben?</h2>
		<blockquote class="quote-saint">
			<p>Gott schuf den Menschen auf das Gute hin, und der Mensch wird unglücklich, wenn er die Gesetze, die um seines Glückes willen aufgestellt sind, nicht hält.</p>
			<cite>Fulton Sheen, Zur Liebe gehören Drei</cite>
		</blockquote>
		<p>Eigentlich sollte das Gewissen genügen, um die göttliche Ordnung zu erkennen. Aber seit dem Sündenfall ist die Erkenntniskraft des Menschen getrübt. Was durch den Sündenfall verdunkelt war, wird durch die Gesetzgebung auf dem Sinai erhellt. Die 10 Gebote nehmen uns nicht die Freiheit, sondern garantieren sie &mdash; sie sind Wegweiser zum zeitlichen und ewigen Glück.</p>
		<blockquote class="quote-church">
			<p>Obwohl die Gebote des Dekalogs schon der Vernunft einsichtig sind, wurden sie geoffenbart. Um zu einer vollständigen und sicheren Erkenntnis der Forderungen des natürlichen Gesetzes zu gelangen, bedurfte die sündige Menschheit dieser Offenbarung.</p>
			<cite>KKK 2071</cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Wenn du nach Weisheit verlangst, halte die Gebote.</p>
			<cite>Sir 1, 26</cite>
		</blockquote>

		<h3>Befreiung aus der Knechtschaft</h3>
		<p>Am Sinai erinnert Gott an die Befreiung aus der Knechtschaft: Die Knechtschaft des Pharao ist ein Bild für die Knechtschaft der Sünde. Entweder wir beherrschen unsere Leidenschaften oder die Leidenschaften beherrschen uns. Durch die 10 Gebote führt Gott den Menschen heraus aus dieser Knechtschaft.</p>
		<blockquote class="quote-scripture">
			<p>O hättest du doch meine Gebote beachtet, so wäre dein Glück wie ein Strom und dein Heil wie die Wogen des Meeres.</p>
			<cite>Is 48, 18</cite>
		</blockquote>
		<p>Die Gebote sind nicht nur für den Einzelnen, sondern auch das Fundament jeglicher ziviler Gemeinschaft.</p>
		<blockquote class="quote-saint">
			<p>Wo die Zehn Gebote Gottes nicht mehr gehalten werden, da werden hunderttausend Staatsgesetze keine Rechtsordnung aufrichten.</p>
			<cite>Kardinal Faulhaber</cite>
		</blockquote>
	</section>

	<section id="biblischer-text">
		<h2>Biblischer Text</h2>
		<div class="scripture-block">
			<p class="biblical-intro">„Ich bin der Herr, dein Gott, der dich aus dem Lande Ägypten, dem Hause der Knechtschaft, geführt hat.</p>
			<ol class="exodus-list">
				<li>Du sollst keine anderen Götter neben mir haben! Du sollst dir kein Schnitzbild machen, noch irgendein Abbild von dem, was droben im Himmel oder auf der Erde unten oder im Wasser unter der Erde ist! Du sollst dich vor ihnen nicht niederwerfen und sollst sie nicht verehren; denn ich, der Herr, dein Gott, bin ein eifersüchtiger Gott.</li>
				<li>Du sollst den Namen des Herrn, deines Gottes, nicht unnütz aussprechen; denn der Herr lässt denjenigen nicht ungestraft, der seinen Namen unnütz ausspricht!</li>
				<li>Gedenke des Sabbattages, um ihn heilig zu halten. Sechs Tage lang sollst du arbeiten und all deine Geschäfte verrichten. Doch der siebte Tag ist ein Ruhetag für den Herrn, deinen Gott.</li>
				<li>Ehre deinen Vater und deine Mutter, damit du lange lebst in dem Lande, das der Herr, dein Gott, dir gibt!</li>
				<li>Du sollst nicht töten!</li>
				<li>Du sollst nicht ehebrechen!</li>
				<li>Du sollst nicht stehlen!</li>
				<li>Du sollst gegen deinen Nächsten kein falsches Zeugnis abgeben!</li>
				<li>Du sollst nicht das Haus deines Nächsten begehren!</li>
				<li>Du sollst nicht begehren die Frau deines Nächsten und auch nicht seinen Knecht, seine Magd, sein Rind, seinen Esel und nichts von dem, was deinem Nächsten gehört!"</li>
			</ol>
			<p class="exodus-cite">Ex 20, 1–17</p>
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
			<a class="path-step" href={resolve('/[faithLang=faithLang]/katechese/erstes-gebot', { faithLang: data.faithLang })}>
				<span class="step-badge">1</span>
				<span class="step-icon"><BookOpen size={26} strokeWidth={1.7} /></span>
				<span class="step-body">
					<span class="step-title">Einführung</span>
					<span class="step-desc">Anerkennung Gottes und die Tugend der Religion — glauben, hoffen, lieben.</span>
				</span>
				<ArrowRight class="step-go" size={18} />
			</a>

			<a class="path-step" href={resolve('/[faithLang=faithLang]/katechese/goettliche-tugenden', { faithLang: data.faithLang })}>
				<span class="step-badge">2</span>
				<span class="step-icon trio">
					<Cross size={16} strokeWidth={2} /><Anchor size={16} strokeWidth={2} /><Heart size={16} strokeWidth={2} />
				</span>
				<span class="step-body">
					<span class="step-title">Göttliche Tugenden</span>
					<span class="step-desc">Glaube, Hoffnung und Liebe — Gegenstand, Wirkungen und Verstöße.</span>
				</span>
				<ArrowRight class="step-go" size={18} />
			</a>

			<a class="path-step" href={resolve('/[faithLang=faithLang]/katechese/geluebde-und-suenden', { faithLang: data.faithLang })}>
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

	<p class="disclaimer">Diese Seiten stellen eine freie Aufbereitung der erhaltenen Unterlagen dar und sind kein offizielles Angebot von P. Martin Ramm oder der FSSP. Etwaige Fehler oder Missverständnisse sind dem Verfasser dieser Seiten anzulasten.</p>
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
		letter-spacing: 0.16em;
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
		margin: 0 0 0.5em;
	}
	h1 {
		font-size: 2.5rem;
		margin: 0 0 0.25em;
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
	h2 {
		font-size: 1.5rem;
		margin-bottom: 1rem;
	}
	h3 {
		font-size: 1.25em;
		margin: 2rem 0 0.75rem;
	}
	p {
		line-height: 1.6;
		margin: 0.75em 0;
	}
	li {
		line-height: 1.6;
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
	blockquote.quote-saint {
		border-left-color: var(--nord15);
	}

	/* Scripture block */
	.scripture-block {
		background: var(--color-surface);
		padding: 1.5em;
		border-radius: 8px;
	}
	.biblical-intro {
		font-style: italic;
	}
	.exodus-list {
		padding-left: 1.5em;
	}
	.exodus-list li {
		margin-bottom: 0.5em;
		font-style: italic;
	}
	.exodus-cite {
		color: var(--color-text-tertiary);
		font-size: 0.85rem;
		text-align: right;
		margin-top: 0.5em;
	}

	.intro-text {
		color: var(--color-text-secondary);
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
		padding: 1.75rem 0.9rem 1rem;
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
		gap: 0.5em;
		padding: 0.5em 0.6em;
		border-radius: var(--radius-sm);
		border-left: 3px solid transparent;
		text-decoration: none;
		color: var(--color-text-primary);
	}
	.cmd-nr {
		font-family: serif;
		font-weight: 700;
		font-size: 1.05em;
		text-align: center;
		color: var(--color-text-tertiary);
	}
	.cmd-text {
		font-size: 0.86rem;
		line-height: 1.25;
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
		color: var(--color-primary);
		width: 2em;
	}
	.step-icon.trio {
		gap: 1px;
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
		h1 {
			font-size: 1.85rem;
		}
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
