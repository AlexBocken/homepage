<script>
	import ReferencePeeks from '$lib/components/faith/bible/ReferencePeeks.svelte';
	import ScriptureRef from '$lib/components/faith/bible/ScriptureRef.svelte';
	import CccRef from '$lib/components/faith/ccc/CccRef.svelte';
	import { bibleSlug } from '$lib/js/faithI18n';
	import { resolve } from '$app/paths';
	import { createScrollSpy } from '$lib/js/scrollSpy.svelte';
	import { page } from '$app/state';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Check from '@lucide/svelte/icons/check';
	import Scale from '@lucide/svelte/icons/scale';
	import Brain from '@lucide/svelte/icons/brain';
	import Church from '@lucide/svelte/icons/church';
	import MessageSquareQuote from '@lucide/svelte/icons/message-square-quote';
	import Handshake from '@lucide/svelte/icons/handshake';
	import ApologetikToc from '$lib/components/faith/ApologetikToc.svelte';
	import KatecheseSeries, { ZWEITES_GEBOT } from '$lib/components/faith/KatecheseSeries.svelte';
	import { m, langFromFaithSlug } from '$lib/js/faithI18n';

	const lang = $derived(langFromFaithSlug(page.url.pathname.split('/')[1]));
	const t = $derived(m[lang]);
	const isGerman = $derived(lang === 'de');
	const faithLang = $derived(page.params.faithLang ?? 'glaube');

	const tocItems = [
		{ id: 'eid-wesen', short: 'Wesen des Eides', href: '#eid-wesen' },
		{ id: 'eid-bedingungen', short: 'Bedingungen', href: '#eid-bedingungen' },
		{ id: 'eid-schrift', short: 'Heilige Schrift', href: '#eid-schrift' },
		{ id: 'eid-verfehlungen', short: 'Verfehlungen', href: '#eid-verfehlungen' }
	];

	const spy = createScrollSpy({ ids: tocItems.map((it) => it.id) });

	// Die drei Bedingungen eines gültigen Eides (CIC can 1199 § 1).
	const eidBedingungen = [
		{ name: 'wahr', gegen: 'keine Lüge', Icon: Check },
		{ name: 'gerecht', gegen: 'kein Unrecht', Icon: Scale },
		{ name: 'wohlüberlegt', gegen: 'nicht leichtfertig', Icon: Brain }
	];

	// Was der Meineid zugleich verletzt.
	const meineidVerletzt = [
		{ gut: 'Wahrheit', wie: 'Es wird gelogen.', Icon: Check },
		{ gut: 'Gerechtigkeit', wie: 'Es wird geschädigt, etwa vor Gericht.', Icon: Scale },
		{ gut: 'Religion', wie: 'Der göttliche Name wird schwer missbraucht.', Icon: Church }
	];
</script>

<svelte:head>
	<title>Der Eid - Bocken</title>
	<meta name="description" content="Der Eid im zweiten Gebot — Wesen, Bedingungen, Zeugnis der Heiligen Schrift und der Meineid. Katechese nach P. Martin Ramm FSSP" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: 'Der Eid',
		description: 'Katechese zum Eid im zweiten Gebot — Wesen und Arten des Eides, seine drei Bedingungen, das Zeugnis der Heiligen Schrift und der Meineid. Aufbereitung des Glaubenskurses (3. Hauptteil) von P. Martin Ramm FSSP.',
		inLanguage: 'de',
		url: 'https://bocken.org/glaube/katechese/eid-und-schwur',
		mainEntityOfPage: 'https://bocken.org/glaube/katechese/eid-und-schwur',
		isAccessibleForFree: true,
		articleSection: 'Katechese',
		about: { '@type': 'Thing', name: 'Eid' },
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
		{ '@type': 'ListItem', position: 4, name: 'Der Eid', item: 'https://bocken.org/glaube/katechese/eid-und-schwur' }
		]
	})}</script>`}
</svelte:head>

<div class="page-wrapper katechese">
<ApologetikToc title="Inhalt" items={tocItems} activeId={spy.activeId} onItemClick={spy.jumpTo} />
<div class="page">
	<header class="hero">
	<p class="eyebrow">Die Zehn Gebote &middot; Zweites Gebot</p>
	<h1>Der Eid</h1>
	<p class="subtitle">Glaubenskurs, 3. Hauptteil &mdash; P. Martin Ramm FSSP</p>
	</header>

	{#if !isGerman}
	<p class="lang-notice">{t.only_german_pre}<a href={resolve('/glaube/katechese/eid-und-schwur')}>{t.only_german_link}</a>{t.only_german_post}</p>
	{/if}

	<p class="lead">Der Eid gehört zum zweiten Gebot, weil er den Namen Gottes anruft: Wer schwört, stellt die eigene Aussage unter die göttliche Wahrhaftigkeit. Wie <a href={`/${faithLang}/katechese/zweites-gebot`}>der heilige Name</a> überhaupt kann auch der Eid geehrt oder missbraucht werden.</p>

	<section class="topic c-blue" id="eid-wesen">
		<div class="topic-head">
			<span class="topic-badge"><Scale size={24} strokeWidth={1.9} /></span>
			<h2>Wesen des Eides</h2>
		</div>
		<p>Ein Eid ist eine besonders feierliche Form der Bekräftigung einer Aussage oder eines Versprechens, bei der man sich ausdrücklich auf Gott beruft (vgl. CIC can 1199&ndash;1204).</p>
		<div class="def-grid">
			<div class="def-card">
				<span class="def-icon"><MessageSquareQuote size={22} strokeWidth={1.8} /></span>
				<span class="def-la">assertorischer Eid</span>
				<span class="def-term">Aussageeid</span>
				<p>Bekräftigt, dass eine Aussage wahr ist.</p>
			</div>
			<div class="def-card">
				<span class="def-icon"><Handshake size={22} strokeWidth={1.8} /></span>
				<span class="def-la">promissorischer Eid</span>
				<span class="def-term">Versprechens-Eid / Schwur</span>
				<p>Bekräftigt, dass ein Versprechen gehalten wird &mdash; etwa der Dienst-Eid eines Beamten.</p>
			</div>
		</div>
		<p>Zum Eid gehört die innere Absicht, Gott anzurufen: Er ist ein <strong>Akt der Gottesverehrung</strong>. Im Eid bezeugen wir Gott Ehre, weil wir darin ausdrücklich seine Allwissenheit, Wahrhaftigkeit und Gerechtigkeit anerkennen und die eigene Aussage unter eine letztverbindliche höchste Instanz stellen.</p>
		<blockquote class="quote-church">
			<p>Schwören oder einen Eid ablegen heisst … die göttliche Wahrhaftigkeit anrufen, damit sie für die eigene Wahrhaftigkeit bürge. Der Eid verpflichtet auf den Namen des Herrn.</p>
			<cite><CccRef n={2150} /></cite>
		</blockquote>
		<p class="aside-note">Einen formellen Eid legt man ab, indem man mit der Hand die Heilige Schrift berührt und spricht: „Dies schwöre ich, so wahr mir Gott helfe."</p>
		<blockquote class="quote-scripture">
			<p>Den Herrn, deinen Gott, sollst du fürchten und ihm dienen und bei seinem Namen schwören!</p>
			<cite><ScriptureRef reference="Dt 6, 13" /></cite>
		</blockquote>
	</section>

	<section class="topic c-blue" id="eid-bedingungen">
		<div class="topic-head">
			<span class="topic-badge"><BadgeCheck size={24} strokeWidth={1.9} /></span>
			<h2>Bedingungen</h2>
		</div>
		<p>Ein Eid muss drei Bedingungen zugleich erfüllen. Fällt eine weg, ist er kein Gottesdienst mehr, sondern ein Missbrauch:</p>
		<div class="triad">
			{#each eidBedingungen as b (b.name)}
				{@const Icon = b.Icon}
				<div class="triad-node">
					<span class="triad-icon"><Icon size={22} strokeWidth={2} /></span>
					<span class="triad-name">{b.name}</span>
					<span class="triad-gegen">{b.gegen}</span>
				</div>
			{/each}
		</div>
		<blockquote class="quote-church">
			<p>Ein Eid, das ist die Anrufung des göttlichen Namens als Zeugen für die Wahrheit, darf nur geleistet werden in Wahrheit, Überlegung und Gerechtigkeit.</p>
			<cite>CIC can 1199 § 1</cite>
		</blockquote>
		<p>Da der Eid als Anruf Gottes etwas Heiliges ist, fordert er gewissenhafte Überlegung und darf nicht aus Leichtsinn gebraucht werden.</p>
		<blockquote class="quote-scripture">
			<p>Gewöhne deinen Mund nicht ans Schwören, und nenne nicht aus Gewohnheit des Heiligen Namen!</p>
			<cite><ScriptureRef reference="Sir 23, 9" /></cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Ihr habt gehört, dass zu den Alten gesagt wurde: „Du sollst nicht falsch schwören; du sollst dem Herrn deine Schwüre halten." Ich aber sage euch: Schwört überhaupt nicht … Es sei euer Jawort ein Ja, euer Nein ein Nein. Was darüber hinausgeht, ist vom Bösen.</p>
			<cite><ScriptureRef reference="Mt 5, 33-37" /></cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Vor allen Dingen, meine Brüder, schwört nicht, weder beim Himmel noch bei der Erde noch sonst einen Eid! Euer Ja sei ein Ja, euer Nein ein Nein, damit ihr nicht dem Gericht verfallet.</p>
			<cite><ScriptureRef reference="Jak 5, 12" /></cite>
		</blockquote>
		<blockquote class="quote-church">
			<p>In Anlehnung an den hl. Paulus hat die Überlieferung der Kirche das Wort Jesu so verstanden, dass es den Eid dann, wenn er sich auf eine schwerwiegende und gerechte Sache — z. B. vor Gericht — bezieht, nicht verbietet.</p>
			<cite><CccRef n={2154} /></cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Ihr sollt nicht bei meinem Namen falsch schwören, sodass du den Namen deines Gottes entweihst. Ich bin der Herr.</p>
			<cite><ScriptureRef reference="Lev 19, 12" /></cite>
		</blockquote>
	</section>

	<section class="topic c-blue" id="eid-schrift">
		<div class="topic-head">
			<span class="topic-badge"><BookOpen size={24} strokeWidth={1.9} /></span>
			<h2>Der Eid in der Heiligen Schrift</h2>
		</div>
		<p>Würden alle Menschen stets die Wahrheit sagen, wäre der Eid überflüssig. Erst die tatsächliche Unwahrhaftigkeit der Menschen und das Ungenügen menschlicher Zeugnisse machen ihn als Mittel zur Sicherung der Wahrheit und des Rechts notwendig.</p>

		<div class="part">
			<span class="part-tag">Der Einwand</span>
			<p>Aus dem Wort der Bergpredigt &mdash; <em>„Schwört überhaupt nicht"</em> &mdash; und der Mahnung des hl. Jakobus (<ScriptureRef reference="Jak 5, 12" />) haben täuferische Gemeinschaften, Mennoniten und Quäker vor allem, gefolgert, ein Christ dürfe überhaupt nicht schwören. Die lutherischen und reformierten Bekenntnisse teilen diesen Schluss nicht; die Kirche hat ihn nie gezogen.</p>
			<blockquote class="quote-scripture">
				<p>Euer Ja sei ein Ja, euer Nein ein Nein.</p>
				<cite><ScriptureRef reference="Mt 5, 37" /></cite>
			</blockquote>
			<p>Jesus wendet sich gegen den <strong>leichtfertigen</strong> und den <strong>falschen</strong> Schwur, wie ihn die Pharisäer mit ihren Ausflüchten pflegten &mdash; nicht gegen die Anrufung Gottes in einer schwerwiegenden und gerechten Sache. Wo der Eid geboten ist, bleibt er ein Akt der Gottesverehrung (vgl. <CccRef n={2154} />).</p>
			<p class="callout-key">Dem Christen ist der Eid erlaubt. Christus selbst und die Apostel haben ihn gebraucht.</p>
		</div>

		<div class="part">
			<span class="part-tag">Christus</span>
			<p>Vor dem Hohen Rat nimmt Christus die eidliche Befragung durch den Hohenpriester an und beantwortet sie. Hätte er jeden Eid verworfen, so hätte er hier schweigen müssen; stattdessen anerkennt er ihn als berechtigt.</p>
			<blockquote class="quote-scripture">
				<p>Der Hohepriester sagte zu ihm: „Ich beschwöre dich bei dem lebendigen Gott, dass du uns sagst, ob du der Messias bist, der Sohn Gottes!" Jesus sprach zu ihm: „Du hast es gesagt! Weiter aber sage ich euch: Von nun an werdet ihr den Menschensohn sehen sitzend zur Rechten der Kraft und kommend auf den Wolken des Himmels."</p>
				<cite><ScriptureRef reference="Mt 26, 63f." /></cite>
			</blockquote>
		</div>

		<div class="part">
			<span class="part-tag">Der hl. Apostel Paulus</span>
			<p>Paulus schreibt seine Briefe lange nach der Bergpredigt &mdash; und ruft Gott dreimal ausdrücklich zum Zeugen an. Er tut also genau das, was ein grundsätzliches Schwurverbot ausschlösse:</p>
			<blockquote class="quote-scripture">
				<p>Ich aber rufe Gott zum Zeugen an bei meiner Seele …</p>
				<cite><ScriptureRef reference="2 Kor 1, 23" /></cite>
			</blockquote>
			<blockquote class="quote-scripture">
				<p>Was ich euch schreibe, seht, bei Gott, ich lüge nicht!</p>
				<cite><ScriptureRef reference="Gal 1, 20" /></cite>
			</blockquote>
			<blockquote class="quote-scripture">
				<p>Denn Gott ist mein Zeuge, wie ich mich nach euch allen sehne in innigster Liebe zu Christus Jesus.</p>
				<cite><ScriptureRef reference="Phil 1, 8" /></cite>
			</blockquote>
			<p class="aside-note">Eben diese beiden Stellen nennt der Katechismus, wenn er erklärt, warum das Wort Jesu den Eid in einer schwerwiegenden und gerechten Sache nicht verbietet.</p>
		</div>
	</section>

	<section class="topic c-red" id="eid-verfehlungen">
		<div class="topic-head">
			<span class="topic-badge"><TriangleAlert size={24} strokeWidth={1.9} /></span>
			<h2>Verfehlungen</h2>
		</div>
		<div class="etymologie">
			<span class="latin">Meineid</span>
			<span class="equals">&larr;</span>
			<span class="latin">min</span>
			<span class="equals">=</span>
			<span class="meaning">falsch</span>
		</div>
		<p>Ein <strong>Meineid</strong> ist ein vorsätzlich falscher Eid: wenn jemand unter Eid etwas aussagt oder verspricht, von dem er weiss, dass es nicht wahr ist oder nicht eingehalten werden soll. Er zerstört nicht nur das Vertrauen, sondern auch die Gottesbeziehung &mdash; und verletzt drei Dinge zugleich:</p>
		<div class="broken-grid">
			{#each meineidVerletzt as v (v.gut)}
				{@const Icon = v.Icon}
				<div class="broken-card">
					<span class="broken-head">
						<span class="broken-icon"><Icon size={18} strokeWidth={2} /></span>
						<span class="broken-gut">{v.gut}</span>
					</span>
					<span class="broken-wie">{v.wie}</span>
				</div>
			{/each}
		</div>
		<p class="callout-warn">Es wäre schwere Sünde, eidlich zu versprechen, etwas Böses zu tun &mdash; zum unmittelbaren Schaden anderer, zum Nachteil des öffentlichen Wohls oder des ewigen Heils. Einen solchen „Eid" darf man nicht halten. Das gilt auch, wenn man in der Meinung geschworen hat, etwas sei gut, dann aber bemerkt, dass es doch schlecht ist.</p>
		<blockquote class="quote-church">
			<p>Eidbrüchig ist, wer unter Eid ein Versprechen ablegt, das er gar nicht zu halten beabsichtigt oder nachträglich bricht.</p>
			<cite><CccRef n={2152} /></cite>
		</blockquote>
	</section>

	<KatecheseSeries gebot="Das zweite Gebot" parts={ZWEITES_GEBOT} current={3} />

	<p class="disclaimer">Diese Seite stellt eine freie Aufbereitung der erhaltenen Unterlagen dar und ist kein offizielles Angebot von P. Martin Ramm oder der FSSP. Etwaige Fehler oder Missverständnisse sind dem Verfasser dieser Seite anzulasten.</p>
</div>
</div>

<!-- Bible citations: the reader's peeks, with a link into the Bible. -->
<ReferencePeeks {lang} faithLang={page.url.pathname.split('/')[1]} bibleLang={bibleSlug(lang)} source={lang === 'en' ? 'Douay-Rheims' : 'Allioli'} />

<style>

	/* Drei Bedingungen des Eides */
	.triad {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.6em;
		margin: 1.25em 0;
	}
	.triad-node {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2em;
		text-align: center;
		background: color-mix(in oklab, var(--vc) 10%, var(--color-surface));
		border: 1px solid color-mix(in oklab, var(--vc) 30%, var(--color-border));
		border-radius: var(--radius-md);
		padding: 0.85em 0.6em;
	}
	.triad-icon {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: color-mix(in oklab, var(--vc) 18%, var(--color-surface));
		color: var(--vc);
		margin-bottom: 0.15em;
	}
	.triad-name {
		font-weight: 700;
		color: var(--vc);
	}
	.triad-gegen {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}

	/* Was der Meineid verletzt */
	.broken-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.6em;
		margin: 1.25em 0;
	}
	.broken-card {
		display: flex;
		flex-direction: column;
		gap: 0.25em;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--red);
		border-radius: var(--radius-sm);
		padding: 0.75em 0.8em;
	}
	.broken-head {
		display: flex;
		align-items: center;
		gap: 0.45em;
	}
	.broken-icon {
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: color-mix(in oklab, var(--red) 15%, var(--color-surface));
		color: var(--red);
	}
	.broken-gut {
		font-weight: 700;
		color: var(--red);
		text-decoration: line-through;
		text-decoration-thickness: 2px;
	}
	.broken-wie {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		line-height: 1.4;
	}

	@media (max-width: 600px) {
		.triad,
		.broken-grid {
			grid-template-columns: 1fr;
		}
	}

</style>
