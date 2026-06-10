<script>
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Cross from '@lucide/svelte/icons/cross';
	import Anchor from '@lucide/svelte/icons/anchor';
	import Heart from '@lucide/svelte/icons/heart';
	import { page } from '$app/state';
	import ApologetikToc from '$lib/components/faith/ApologetikToc.svelte';
	import ErstesGebotSeries from '$lib/components/faith/ErstesGebotSeries.svelte';
	import { m, langFromFaithSlug } from '$lib/js/faithI18n';

	/** @type {number | string | null} */
	let expanded = $state(null);
	const lang = $derived(langFromFaithSlug(page.url.pathname.split('/')[1]));
	const t = $derived(m[lang]);
	const isGerman = $derived(lang === 'de');

	/** @param {number | string} id */
	function toggle(id) {
		expanded = expanded === id ? null : id;
	}

	const tocItems = [
		{ id: 'erstes-gebot', short: 'Das Erste Gebot', href: '#erstes-gebot' },
		{ id: 'drei-pflichten', short: 'Drei Pflichten', href: '#drei-pflichten' },
		{ id: 'tugend-der-religion', short: 'Tugend der Religion', href: '#tugend-der-religion' },
		{ id: 'vier-akte', short: 'Vier Akte der religio', href: '#vier-akte' },
		{ id: 'warnung', short: 'Warnung', href: '#warnung' }
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

	const akteReligio = [
		{ name: 'Anbetung', desc: 'Ich anerkenne Gottes als meinen höchsten Herrn.', icon: '1' },
		{ name: 'Dank', desc: 'Ich anerkenne Gott als meinen Schöpfer, dem ich alles verdanke.', icon: '2' },
		{ name: 'Bitte', desc: 'Ich anerkenne Gott als meinen Vater, von dem ich alles erwarte.', icon: '3' },
		{ name: 'Sühne', desc: 'Ich anerkenne Gott als meinen gütigen Erlöser.', icon: '4' }
	];
</script>

<svelte:head>
	<title>Das erste Gebot - Bocken</title>
	<meta name="description" content="Das erste Gebot Gottes — Anerkennung Gottes und die Tugend der Religion. Katechese nach P. Martin Ramm FSSP" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: 'Das erste Gebot',
		description: 'Katechese zum ersten Gebot Gottes — Anerkennung Gottes und die Tugend der Religion. Aufbereitung des Glaubenskurses (3. Hauptteil) von P. Martin Ramm FSSP.',
		inLanguage: 'de',
		url: 'https://bocken.org/glaube/katechese/erstes-gebot',
		mainEntityOfPage: 'https://bocken.org/glaube/katechese/erstes-gebot',
		isAccessibleForFree: true,
		articleSection: 'Katechese',
		about: { '@type': 'Thing', name: 'Erstes Gebot' },
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
			{ '@type': 'ListItem', position: 3, name: 'Die Zehn Gebote', item: 'https://bocken.org/glaube/katechese' },
			{ '@type': 'ListItem', position: 4, name: 'Das erste Gebot', item: 'https://bocken.org/glaube/katechese/erstes-gebot' }
		]
	})}</script>`}
</svelte:head>

<div class="page-wrapper">
<ApologetikToc title="Inhalt" items={tocItems} {activeId} onItemClick={jumpTo} />
<div class="page">
	<header class="hero">
		<p class="eyebrow">Die Zehn Gebote &middot; Erstes Gebot</p>
		<h1>Das erste Gebot</h1>
		<p class="subtitle">Glaubenskurs, 3. Hauptteil &mdash; P. Martin Ramm FSSP</p>
	</header>

	{#if !isGerman}
		<p class="lang-notice">{t.only_german_pre}<a href={resolve('/glaube/katechese/erstes-gebot')}>{t.only_german_link}</a>{t.only_german_post}</p>
	{/if}

	<section class="first-commandment" id="erstes-gebot">
		<div class="gebot-header">
			<span class="gebot-nr">I</span>
			<div>
				<h2>Du sollst keine fremden Götter neben mir haben</h2>
				<p class="gebot-text-full">Ich bin der Herr, dein Gott. Du sollst keine fremden Götter neben mir haben.</p>
			</div>
		</div>

		<p>Das erste Gebot ist grundlegend. In ihm sind alle weiteren Gebote enthalten und begründet. Es geht um die Anerkennung Gottes und um das rechte Verhältnis des Menschen zu Gott. Sache des <em>Verstandes</em> ist es, Gott zu erkennen. Der <em>Wille</em> muss hinzukommen, um Gott tatsächlich anzuerkennen und sich ihm gänzlich zu unterwerfen.</p>

		<!-- Drei Pflichten -->
		<div class="three-duties" id="drei-pflichten">
			<h3>Das erste Gebot befiehlt</h3>
			<div class="duties-visual">
				<div class="duty">
					<div class="duty-circle" style="background: var(--blue)">
						<Cross size={32} strokeWidth={2} />
					</div>
					<span class="duty-label" style="color: var(--blue)">glauben</span>
					<p>An den einen wahren Gott fest glauben</p>
				</div>
				<div class="duty-connector"></div>
				<div class="duty">
					<div class="duty-circle" style="background: var(--green)">
						<Anchor size={32} strokeWidth={2} />
					</div>
					<span class="duty-label" style="color: var(--green)">hoffen</span>
					<p>Fest auf ihn hoffen</p>
				</div>
				<div class="duty-connector"></div>
				<div class="duty">
					<div class="duty-circle" style="background: var(--red)">
						<Heart size={32} strokeWidth={2} />
					</div>
					<span class="duty-label" style="color: var(--red)">lieben</span>
					<p>Ihn über alles lieben</p>
				</div>
			</div>
		</div>

		<!-- Tugend der Religion -->
		<div class="religion-virtue" id="tugend-der-religion">
			<h3>Die Tugend der Religion</h3>
			<div class="etymologie">
				<span class="latin">religio</span>
				<ArrowLeft class="arrow" size={20} />
				<span class="latin">religare</span>
				<span class="equals">=</span>
				<span class="meaning">anbinden</span>
			</div>
			<p>Was man liebt, daran bindet man sich. Die Religion gibt Orientierung und festen „Halt nach oben". Entsprechend der leib-seelischen Natur des Menschen hat die Tugend der Religion eine <strong>innere</strong> und eine <strong>äussere</strong> Seite.</p>

			<h4>Die innere Seite</h4>
			<p>Die Tugend der Religion macht das Herz geneigt, Gott anzuerkennen, sich ihm anzuvertrauen, ihn über alles zu lieben und ihm zu geben, <em>„was wir ihm als Geschöpfe rechtmässig schulden"</em> (KKK 2095). Die <em>religio</em> ist Teil der Kardinaltugend der Gerechtigkeit (<em>suum cuique</em>): Gott zu geben, was ihm gebührt.</p>
			<blockquote class="quote-scripture">
				<p>Gebt also dem Kaiser, was des Kaisers ist, und Gott, was Gottes ist!</p>
				<cite>Mt 22, 21</cite>
			</blockquote>
			<p>Da aber ein wirklicher Ausgleich zwischen der unendlich erhabenen göttlichen Majestät und der menschlichen Begrenztheit nicht möglich ist, können wir Gott nicht wirklich so ehren, wie er es verdient. Deshalb nennt man die Religion eine <em>pars potentialis</em> der Tugend der Gerechtigkeit.</p>

			<h4>Die äussere Seite</h4>
			<p>Der ganze Mensch soll Gott loben und ihm die Ehre geben. Wir schulden Gott nicht nur die Huldigung unserer Seele, sondern auch die unseres Leibes.</p>
			<blockquote class="quote-scripture">
				<p>Bringt eure Leiber dar als ein lebendiges, heiliges, Gott wohlgefälliges Opfer, als euren sinnvoll entsprechenden Gottesdienst.</p>
				<cite>Röm 12, 1</cite>
			</blockquote>
			<blockquote class="quote-scripture">
				<p>Wisst ihr nicht, dass euer Leib ein Tempel des Heiligen Geistes ist, der in euch wohnt? Ihn habt ihr von Gott, und nicht euch selber gehört ihr. Denn ihr wurdet erkauft um einen Preis. So verherrlicht denn Gott in eurem Leib!</p>
				<cite>1 Kor 6, 18–20</cite>
			</blockquote>
			<p>Innere Haltung und äussere Übung bedingen einander wie Seele und Leib. Es besteht eine geheimnisvolle Wechselwirkung: Die innere Haltung findet Ausdruck und Stütze in der äusseren Form; zugleich vertieft die äussere Gebärde das innere Gefühl. Aus diesem Grund gebraucht die Liturgie so viele Riten.</p>
			<blockquote class="quote-scripture">
				<p>Wovon das Herz voll ist, davon redet der Mund.</p>
				<cite>Mt 12, 34</cite>
			</blockquote>
			<blockquote class="quote-church">
				<p>Das Bedürfnis, die äusseren Sinne am inneren Beten zu beteiligen, entspricht einer Forderung unserer menschlichen Natur. Wir sind Leib und Geist und empfinden das Bedürfnis, unsere Gefühle nach aussen kundzutun.</p>
				<cite>KKK 2702</cite>
			</blockquote>

			<h4>Das Gebet der Gemeinschaft</h4>
			<p>Das äussere Gebet ist in besonderer Weise auch das Gebet der Gemeinschaft. In den Sakramenten verbindet Gott selbst äussere Zeichen mit seiner Gnade und heiligt so den ganzen Menschen.</p>
			<blockquote class="quote-scripture">
				<p>Denn wo zwei oder drei in meinem Namen versammelt sind, da bin ich mitten unter ihnen.</p>
				<cite>Mt 18, 20</cite>
			</blockquote>
		</div>

		<!-- Vier Akte der religio -->
		<div class="four-acts" id="vier-akte">
			<h3>Die vier Akte der <em>religio</em></h3>
			<p>Aus vier elementaren Regeln des Anstandes lassen sich die vier Akte der Tugend der <em>religio</em> ableiten. Tatsächlich ist Religion &mdash; im besten Sinn &mdash; guter Anstand Gott gegenüber:</p>
			<div class="acts-grid">
				{#each akteReligio as akt (akt.name)}
					<button class="act-card" onclick={() => toggle(akt.name)} class:open={expanded === akt.name}>
						<div class="act-header">
							<span class="act-number">{akt.icon}</span>
							<h4>{akt.name}</h4>
						</div>
						<p class="act-desc">{akt.desc}</p>
						<p class="act-rule">
							{#if akt.name === 'Anbetung'}
								Jeden so ehren, wie es verdient ist. &mdash; <em>Je würdiger jemand ist, desto mehr gebührt ihm Ehre.</em>
							{:else if akt.name === 'Dank'}
								Danken, wenn man etwas bekommt. &mdash; <em>Je mehr man empfängt, desto grösser ist die Dankesschuld.</em>
							{:else if akt.name === 'Bitte'}
								Bitten, wenn man etwas braucht. &mdash; <em>Je mehr man von jemandem erwartet, desto inständiger muss man bitten.</em>
							{:else}
								Wieder gut machen, wenn man etwas verschuldet hat. &mdash; <em>Je mehr man verschuldet hat, desto grösser die Pflicht zur Genugtuung.</em>
							{/if}
						</p>
					</button>
				{/each}
			</div>
			<blockquote class="quote-scripture acts-quote">
				<p>Den Herrn, deinen Gott, sollst du anbeten und ihm allein dienen.</p>
				<cite>Mt 4, 10</cite>
			</blockquote>
		</div>

		<!-- Warnung -->
		<div class="warning-section" id="warnung">
			<h3>Warnung vor Veräusserlichung</h3>
			<p>Die äusseren Akte der Gottesverehrung haben ihren vollen Wert nur dann, wenn sie von der rechten inneren Gesinnung getragen sind. Wer äusserlich fromm erscheint, ohne es wirklich zu sein, gleicht einem faulen Apfel mit schöner Schale.</p>
			<blockquote class="quote-scripture">
				<p>Dieses Volk ehrt mich mit den Lippen, ihr Herz aber ist fern von mir.</p>
				<cite>Mt 15, 8</cite>
			</blockquote>
		</div>
	</section>

	<ErstesGebotSeries current={1} />

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
	section div[id] {
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
	h4 {
		font-size: 1.1em;
		margin: 1.5rem 0 0.5rem;
		color: var(--color-text-secondary);
	}
	p {
		line-height: 1.6;
		margin: 0.75em 0;
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

	/* First commandment */
	.gebot-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.gebot-nr {
		font-size: 3.5em;
		font-weight: bold;
		color: var(--color-text-tertiary);
		line-height: 1;
		font-family: serif;
	}
	.gebot-header h2 {
		margin: 0;
	}
	.gebot-text-full {
		font-style: italic;
		color: var(--color-text-secondary);
		margin-top: 0.25em;
	}

	/* Three duties */
	.duties-visual {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		gap: 0;
		flex-wrap: wrap;
		margin-top: 1rem;
	}
	.duty {
		text-align: center;
		flex: 0 1 160px;
		padding: 0.5em;
	}
	.duty-circle {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 0.5em;
	}
	.duty-label {
		display: block;
		font-weight: bold;
		font-size: 1.1em;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.duty p {
		margin: 0.25em 0 0;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}
	.duty-connector {
		width: 32px;
		height: 2px;
		background: var(--color-border);
		margin-top: 32px;
		flex-shrink: 0;
	}

	/* Etymology */
	.etymologie {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5em;
		font-size: 1.15em;
		margin: 1em 0;
		flex-wrap: wrap;
	}
	.latin {
		font-style: italic;
		font-weight: bold;
	}
	:global(.arrow) {
		color: var(--color-text-tertiary);
	}
	.equals {
		color: var(--color-text-tertiary);
	}
	.meaning {
		font-weight: 600;
	}

	/* Four acts */
	.acts-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5em;
		margin-top: 1em;
	}
	.act-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 1em;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		font: inherit;
		color: inherit;
		width: 100%;
	}
	.act-card:hover, .act-card.open {
		border-color: var(--blue);
	}
	.act-header {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}
	.act-number {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: var(--color-text-tertiary);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		font-size: 0.85rem;
		flex-shrink: 0;
	}
	.act-card.open .act-number,
	.act-card:hover .act-number {
		background: var(--blue);
	}
	.act-header h4 {
		margin: 0;
		font-size: 1rem;
	}
	.act-desc {
		margin: 0.5em 0 0;
		font-size: 0.9rem;
		line-height: 1.4;
	}
	.act-rule {
		margin: 0.5em 0 0;
		font-size: 0.85rem;
		color: var(--color-text-tertiary);
		max-height: 0;
		overflow: hidden;
		transition: max-height 0.3s ease;
	}
	.act-card.open .act-rule {
		max-height: 6em;
	}
	.acts-quote {
		margin-top: 1.5em;
		text-align: center;
	}

	/* Warning */
	.warning-section {
		border-left: 3px solid var(--nord12);
		padding-left: 1em;
		margin: 2.5em 0;
	}
	.warning-section h3 {
		color: var(--nord12);
		margin-top: 0;
	}

	/* Mobile */
	@media (max-width: 600px) {
		h1 { font-size: 1.75rem; }
		.acts-grid {
			grid-template-columns: 1fr;
		}
		.duty-connector {
			display: none;
		}
		.duties-visual {
			gap: 0.5em;
		}
		.gebot-header {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}
		.etymologie {
			font-size: 1em;
		}
	}
</style>
