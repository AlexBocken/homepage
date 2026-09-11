<script>
	import ReferencePeeks from '$lib/components/faith/bible/ReferencePeeks.svelte';
	import ScriptureRef from '$lib/components/faith/bible/ScriptureRef.svelte';
	import CccRef from '$lib/components/faith/ccc/CccRef.svelte';
	import { bibleSlug } from '$lib/js/faithI18n';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Sun from '@lucide/svelte/icons/sun';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Crown from '@lucide/svelte/icons/crown';
	import Target from '@lucide/svelte/icons/target';
	import Cross from '@lucide/svelte/icons/cross';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import Hand from '@lucide/svelte/icons/hand';
	import { page } from '$app/state';
	import ApologetikToc from '$lib/components/faith/ApologetikToc.svelte';
	import KatecheseSeries, { ZWEITES_GEBOT } from '$lib/components/faith/KatecheseSeries.svelte';
	import { m, langFromFaithSlug } from '$lib/js/faithI18n';

	const lang = $derived(langFromFaithSlug(page.url.pathname.split('/')[1]));
	const t = $derived(m[lang]);
	const isGerman = $derived(lang === 'de');
	const faithLang = $derived(page.params.faithLang ?? 'glaube');

	const tocItems = [
		{ id: 'name', short: 'Der Name Gottes', href: '#name' },
		{ id: 'tetragramm', short: 'Das Tetragramm', href: '#tetragramm', group: 'Der Name' },
		{ id: 'name-wesen', short: '„Name" = das Wesen', href: '#name-wesen', group: 'Der Name' },
		{ id: 'weisung-2008', short: 'Weisung von 2008', href: '#weisung-2008', group: 'Der Name' },
		{ id: 'ehre', short: 'Die Ehre Gottes', href: '#ehre' },
		{ id: 'ehre-ruhm', short: 'Ehre und Ruhm', href: '#ehre-ruhm', group: 'Die Ehre' },
		{ id: 'glorie', short: 'Zweifache Glorie', href: '#glorie', group: 'Die Ehre' },
		{ id: 'bestimmung', short: 'Bestimmung des Menschen', href: '#bestimmung' },
		{ id: 'babel', short: 'Der Gegensatz zu Babel', href: '#babel', group: 'Bestimmung' },
		{ id: 'zeugnis', short: 'Das Zeugnis des Lebens', href: '#zeugnis', group: 'Bestimmung' }
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

	// Die vier Buchstaben des Gottesnamens — hebräisch von rechts nach links.
	const tetragramm = [
		{ letter: 'י', name: 'Jod', lat: 'J' },
		{ letter: 'ה', name: 'He', lat: 'H' },
		{ letter: 'ו', name: 'Waw', lat: 'W' },
		{ letter: 'ה', name: 'He', lat: 'H' }
	];

</script>

<svelte:head>
	<title>Der Name Gottes - Bocken</title>
	<meta name="description" content="Das zweite Gebot Gottes — der heilige Name, die Ehre Gottes, Fluchen, Blasphemie und Sakrileg. Katechese nach P. Martin Ramm FSSP" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: 'Der Name Gottes',
		description: 'Katechese zum zweiten Gebot Gottes — der heilige Name, die Ehre Gottes und die Verstösse gegen ihn: Fluchen, Blasphemie und Sakrileg. Aufbereitung des Glaubenskurses (3. Hauptteil) von P. Martin Ramm FSSP.',
		inLanguage: 'de',
		url: 'https://bocken.org/glaube/katechese/zweites-gebot',
		mainEntityOfPage: 'https://bocken.org/glaube/katechese/zweites-gebot',
		isAccessibleForFree: true,
		articleSection: 'Katechese',
		about: { '@type': 'Thing', name: 'Zweites Gebot' },
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
			{ '@type': 'ListItem', position: 4, name: 'Der Name Gottes', item: 'https://bocken.org/glaube/katechese/zweites-gebot' }
		]
	})}</script>`}
</svelte:head>

<div class="page-wrapper katechese">
<ApologetikToc title="Inhalt" items={tocItems} {activeId} onItemClick={jumpTo} />
<div class="page">
	<header class="hero">
		<p class="eyebrow">Die Zehn Gebote &middot; Zweites Gebot</p>
		<h1>Der Name Gottes</h1>
		<p class="subtitle">Glaubenskurs, 3. Hauptteil &mdash; P. Martin Ramm FSSP</p>
	</header>

	{#if !isGerman}
		<p class="lang-notice">{t.only_german_pre}<a href={resolve('/glaube/katechese/zweites-gebot')}>{t.only_german_link}</a>{t.only_german_post}</p>
	{/if}

	<div class="gebot-header">
		<span class="gebot-nr">II</span>
		<div>
			<h2>Du sollst den Namen Gottes nicht verunehren</h2>
			<p class="gebot-text-full">Wir ehren den Namen Gottes durch die Art, wie wir ihn aussprechen, und durch die Art, wie wir leben.</p>
		</div>
	</div>

	<!-- Zwei Wege, den Namen zu ehren — der Bogen beider Teile -->
	<div class="two-ways">
		<div class="way">
			<span class="way-icon"><Megaphone size={22} strokeWidth={1.8} /></span>
			<span class="way-name">Wie wir ihn aussprechen</span>
			<span class="way-desc">Ehrfurcht im Wort — von den <a href={`/${faithLang}/katechese/verstoesse-gegen-den-namen`}>Verstössen</a> bis zum <a href={`/${faithLang}/katechese/eid-und-schwur`}>Eid</a>.</span>
		</div>
		<div class="way">
			<span class="way-icon"><Sun size={22} strokeWidth={1.8} /></span>
			<span class="way-name">Wie wir leben</span>
			<span class="way-desc">Ein heiliges Leben ehrt ihn, die Sünde entehrt ihn.</span>
		</div>
	</div>

	<!-- ============ 1 — DER NAME GOTTES ============ -->
	<section class="topic c-blue" id="name">
		<div class="topic-head">
			<span class="topic-badge"><Sparkles size={24} strokeWidth={1.9} /></span>
			<h2>Der Name Gottes</h2>
		</div>
		<p>Dieses Gebot wurde dem Moses am Berg Sinai gegeben &mdash; genau dort, wo Gott ihm zuvor beim brennenden Dornbusch seinen heiligen Namen geoffenbart hat.</p>
		<blockquote class="quote-scripture">
			<p>Moses sprach zu Gott: „Wenn ich nun zu den Kindern Israels komme und zu ihnen spreche: Der Gott eurer Väter hat mich zu euch gesandt, und sie mich dann fragen werden: Wie heisst er?, was soll ich ihnen dann antworten?" Gott entgegnete dem Moses: „Ich bin, der ich bin!"</p>
			<cite><ScriptureRef reference="Ex 3, 13f." /></cite>
		</blockquote>

		<div class="part" id="tetragramm">
			<span class="part-tag">1 &middot; Das Tetragramm</span>
			<p>Der in vier hebräischen Buchstaben ausgedrückte Gottesname war den Juden so heilig, dass sie ihn nicht auszusprechen wagten. Wo er in den heiligen Büchern vorkam, las man stattdessen <em>Adonai</em> &mdash; der Herr. Damit beim Vorlesen niemand versehentlich den Namen selbst aussprach, schrieben die Masoreten die <strong>Vokalzeichen von Adonai</strong> unter die Konsonanten JHWH: ein blosser Lesehinweis, kein Bestandteil des Namens.</p>

			<div class="tetra">
				<span class="tetra-cap">geschrieben</span>
				<div class="tetra-letters" dir="rtl" aria-hidden="true">
					{#each tetragramm as t2, i (i)}
						<div class="tetra-cell">
							<span class="tetra-glyph">{t2.letter}</span>
							<span class="tetra-name">{t2.name}</span>
							<span class="tetra-lat">{t2.lat}</span>
						</div>
					{/each}
				</div>
				<p class="tetra-sr">Die vier hebräischen Buchstaben Jod, He, Waw, He &mdash; JHWH, von rechts nach links gelesen.</p>

				<div class="tetra-step">
					<ArrowDown size={18} />
					<span>im Text ergänzt: die Vokalzeichen von <em>Adonai</em></span>
				</div>

				<div class="tetra-pointed">
					<span class="pointed-glyph" lang="he" dir="rtl">&#x5D9;&#x5B0;&#x5D4;&#x5B9;&#x5D5;&#x5B8;&#x5D4;</span>
					<span class="pointed-cap">Konsonanten <span class="c">JHWH</span> mit den Vokalen von <span class="v">Adonai</span></span>
				</div>

				<div class="tetra-branch">
					<div class="branch true">
						<span class="branch-tag">so gemeint</span>
						<span class="branch-word">Adonai</span>
						<p>Die Zeichen sind eine Anweisung an den Leser: Er sieht JHWH und spricht „der Herr".</p>
					</div>
					<div class="branch wrong">
						<span class="branch-tag">so missverstanden</span>
						<span class="merge" aria-hidden="true"><span class="c">J</span><span class="v">a</span><span class="c">H</span><span class="v">o</span><span class="c">W</span><span class="v">a</span><span class="c">H</span></span>
						<span class="merge-sr">JaHoWaH</span>
						<p>Wer die Vokale für einen Teil des Namens hielt, las beides in einem Zug &mdash; und erhielt <em>Jehova</em>.</p>
					</div>
				</div>
			</div>

			<div class="callout-warn">
				<strong>Ein Name, den es nie gab.</strong> <em>Jehova</em> ist erst im Mittelalter aus dieser Amalgamation von Konsonanten und fremden Vokalen entstanden. Weder im Judentum noch in der frühen Kirche wurde Gott je so genannt.
			</div>
			<p class="aside-note">Genau genommen steht unter dem ersten Buchstaben ein einfaches Schwa statt des Hatef-Patach von <em>Adonai</em> &mdash; die Verschmelzung ist also nicht einmal lautlich sauber.</p>

			<p>Was am brennenden Dornbusch begann, hat Jesus Christus vollendet. Er sagt im Hohepriesterlichen Gebet:</p>
			<blockquote class="quote-scripture">
				<p>Ich habe deinen Namen den Menschen offenbart …</p>
				<cite><ScriptureRef reference="Joh 17, 6" /></cite>
			</blockquote>

		</div>

		<div class="part" id="name-wesen">
			<span class="part-tag">2 &middot; „Name" meint das Wesen</span>
			<p>Nach dem biblischen Verständnis meint <em>Name</em> das Wesentliche der Sache selbst. Wer den Namen anruft, ruft Gott selbst an.</p>
			<blockquote class="quote-scripture">
				<p>Sodann baute er (Abraham) dem Herrn einen Altar und rief den Namen des Herrn an.</p>
				<cite><ScriptureRef reference="Gen 12, 8" /></cite>
			</blockquote>
			<blockquote class="quote-scripture">
				<p>In Freuden will ich über Dich frohlocken, will Deinem Namen lobsingen, Du Allerhöchster.</p>
				<cite><ScriptureRef reference="Ps 9, 3" /></cite>
			</blockquote>
			<blockquote class="quote-scripture">
				<p>Lobet, ihr Diener des Herrn, lobet den Namen des Herrn! Gepriesen sei der Name des Herrn von nun an bis in Ewigkeit! Vom Aufgang der Sonne bis zu ihrem Untergang sei gelobt der Name des Herrn! Erhaben über alle Völker ist der Herr, über den Himmel seine Herrlichkeit.</p>
				<cite><ScriptureRef reference="Ps 113, 1-4" /></cite>
			</blockquote>
			<blockquote class="quote-latin">
				<p>Sanctum et terribile nomen eius. &mdash; Heilig und ehrfurchtgebietend ist sein Name.</p>
				<cite><ScriptureRef reference="Ps 111, 9" /></cite>
			</blockquote>
		</div>
		<div class="part" id="weisung-2008">
			<span class="part-tag">3 &middot; Die Weisung der Gottesdienstkongregation (2008)</span>
			<p>In den Jahrzehnten nach dem Konzil war es in Liedern, Gebeten und Lesungen üblich geworden, den Gottesnamen als „Jahwe" auszusprechen. Am 29. Juni 2008 hat die Kongregation für den Gottesdienst und die Sakramentenordnung dem ein Ende gesetzt.</p>
			<blockquote class="quote-church">
				<p>Die ehrwürdige biblische Tradition der Heiligen Schrift … bezeugt eine ganze Reihe von göttlichen Anreden, unter anderem den heiligen Namen Gottes, der sich im Tetragramm JHWH offenbart. Insofern dieses Tetragramm die unendliche Grösse und Majestät Gottes ausdrückt, wurde es als unaussprechlich angesehen und wurde daher beim Lesen der Heiligen Schrift durch eine alternative Anrede ersetzt: „Adonai", was „Herr" bedeutet. (…) In den liturgischen Feiern, den Gesängen und den Gebeten darf der Name Gottes in der Form des Tetragramms JHWH weder verwendet noch ausgesprochen werden. … Das göttliche Tetragramm ist mit einem gleichbedeutenden Begriff zu Adonai / Kyrios zu übersetzen.</p>
				<cite>Rundschreiben der Kongregation für den Gottesdienst und die Sakramentenordnung an die Bischofskonferenzen über den Namen Gottes, 29.06.2008</cite>
			</blockquote>

			<p>Der Brief nennt dafür drei Gründe, die alle in dieselbe Richtung weisen:</p>
			<div class="trio">
				<div class="trio-card">
					<span class="trio-icon"><ScrollText size={24} strokeWidth={1.8} /></span>
					<span class="trio-name">Treue zur Schrift</span>
					<span class="trio-note">Schon die Septuaginta gibt das Tetragramm durchweg mit <em>Kyrios</em> wieder, die Vulgata mit <em>Dominus</em>.</span>
				</div>
				<div class="trio-card">
					<span class="trio-icon"><Hand size={24} strokeWidth={1.8} /></span>
					<span class="trio-name">Ehrfurcht Israels</span>
					<span class="trio-note">Was Israel aus Scheu nie aussprach, hat auch die Kirche von Anfang an weder ausgesprochen noch übersetzt.</span>
				</div>
				<div class="trio-card">
					<span class="trio-icon"><Cross size={24} strokeWidth={1.8} /></span>
					<span class="trio-name">Bekenntnis zu Christus</span>
					<span class="trio-note">Weil der Name mit „Herr" wiedergegeben wird, trifft das Bekenntnis „Jesus ist der Herr" den Gottesnamen selbst.</span>
				</div>
			</div>
			<p>Den dritten Grund führt der Brief eigens aus: Wenn Paulus schreibt, Gott habe Christus <em>„den Namen verliehen, der über alle Namen ist"</em>, so meint er keinen anderen als den Namen <em>Herr</em> &mdash; denn er fährt fort: <em>„und jede Zunge bekenne: Jesus Christus ist der Herr"</em> (<ScriptureRef reference="Phil 2, 9-11" />). Der Katechismus zieht dieselbe Linie:</p>
			<blockquote class="quote-church">
				<p>Aus Ehrfurcht vor Gottes Heiligkeit spricht das Volk Israel den Namen Gottes nicht aus. Bei der Lesung der Heiligen Schrift wird der geoffenbarte Name durch den göttlichen Würdetitel „Herr" ersetzt. … Unter diesem Titel wird die Gottheit Jesu feierlich bekannt: „Jesus ist der Herr."</p>
				<cite><CccRef n={209} /></cite>
			</blockquote>

			<p>Damit ist die Weisung mehr als eine Frage des Stils. Wer in einer katholischen Liturgie sitzt, hört denselben Verzicht, den Israel seit den Tagen des zweiten Tempels übt. Die Scheu vor dem Namen ist nicht abgelegt, sondern weitergetragen: Ein Jude findet in unserem Gottesdienst nicht einen fremden Umgang mit dem Namen seines Gottes, sondern den eigenen &mdash; und die Kirche bekennt damit zugleich, dass der Gott, den sie anbetet, kein anderer ist als der, der sich am Dornbusch offenbart hat.</p>
			<blockquote class="quote-church">
				<p>Indem die Kirche, das Gottesvolk im Neuen Bund, sich in ihr eigenes Mysterium vertieft, entdeckt sie ihren Zusammenhang mit dem jüdischen Volk … Im Unterschied zu den anderen nichtchristlichen Religionen ist der jüdische Glaube schon Antwort auf die Offenbarung Gottes im Alten Bund.</p>
				<cite><CccRef n={839} /> (vgl. <em>Nostra aetate</em> 4)</cite>
			</blockquote>
			<p class="aside-note">Aus demselben Grund verlangt die Instruktion <em>Liturgiam authenticam</em> (Nr. 41) schon seit 2001, das Tetragramm in liturgischen Übersetzungen mit dem jeweiligen Wort für <em>Herr</em> wiederzugeben.</p>
		</div>
	</section>

	<!-- ============ 2 — DIE EHRE GOTTES ============ -->
	<section class="topic c-purple" id="ehre">
		<div class="topic-head">
			<span class="topic-badge"><Crown size={24} strokeWidth={1.9} /></span>
			<h2>Die Ehre Gottes</h2>
		</div>
		<p>Der Name Gottes wird geheiligt durch die ihm erwiesene Ehre.</p>

		<div class="part" id="ehre-ruhm">
			<span class="part-tag">1 &middot; Ehre und Ruhm</span>
			<div class="formula">
				<div class="formula-node">
					<span class="formula-step">Ehre</span>
					<span class="formula-la">honor</span>
					<span class="formula-sub">die öffentliche Bezeugung des Vorzugs einer Person</span>
				</div>
				<ArrowRight class="formula-arrow" size={20} />
				<div class="formula-node">
					<span class="formula-step">Ruhm</span>
					<span class="formula-la">gloria</span>
					<span class="formula-sub"><em>clara notitia cum laude</em> — bekannt und gelobt</span>
				</div>
			</div>
			<p class="formula-result">&rarr; Der Ruhm ist die Wirkung der erwiesenen Ehre (vgl. S. th. II-II, 103, 1)</p>

			<blockquote class="quote-latin">
				<p>Regi saeculorum immortali et invisibili, soli Deo honor et gloria in saecula saeculorum. Amen. &mdash; Dem König der Ewigkeit, dem unsterblichen und unsichtbaren, dem alleinigen Gott sei Ehre und Ruhm in alle Ewigkeit. Amen.</p>
				<cite><ScriptureRef reference="1 Tim 1, 17" /> — Kapitel zur Prim</cite>
			</blockquote>
			<p>Die Liturgie ist voll von diesem Lobpreis:</p>
			<ul class="liturgy-list">
				<li><em>Gloria in excelsis Deo …</em></li>
				<li><em>Gloria Patri, et Filio, et Spiritui Sancto …</em></li>
				<li><em>Per ipsum et cum ipso et in ipso est tibi Deo Patri omnipotenti in unitate Spiritus Sancti omnis honor et gloria per omnia saecula saeculorum.</em></li>
			</ul>
			<blockquote class="quote-scripture">
				<p>Und nun verherrliche (clarifica) Du mich, Vater, bei Dir mit der Herrlichkeit (claritate), die ich bei Dir hatte, ehe die Welt war.</p>
				<cite><ScriptureRef reference="Joh 17, 5" /></cite>
			</blockquote>
		</div>

		<div class="part" id="glorie">
			<span class="part-tag">2 &middot; Die zweifache Glorie</span>
			<p>Man unterscheidet zwei Weisen der göttlichen Herrlichkeit &mdash; eine, die Gott wesentlich ist, und eine, die ihm die Geschöpfe erweisen.</p>

			<div class="glorie">
				<div class="glorie-card intrinseca">
					<span class="glorie-la">gloria intrinseca</span>
					<p class="glorie-lead">Das innerste Leben der Allerheiligsten Dreifaltigkeit.</p>
					<ul>
						<li>Diese Glorie ist Gott <strong>wesentlich</strong>.</li>
						<li>Sie ist <strong>unendlich</strong> und kann weder gemindert noch vermehrt werden.</li>
					</ul>
					<p class="glorie-quote"><em>Gratias agimus tibi propter magnam gloriam tuam.</em> — Wir sagen Dir Dank ob Deiner grossen Herrlichkeit. <span class="glorie-cite">(Gloria)</span></p>
				</div>

				<div class="glorie-card extrinseca">
					<span class="glorie-la">gloria extrinseca</span>
					<p class="glorie-lead">Die Verherrlichung Gottes durch die Geschöpfe.</p>
					<ul>
						<li>Sie ist Gott <strong>keineswegs notwendig</strong>.</li>
						<li>Durch das Lob der Geschöpfe wird die innergöttliche Glorie <strong>nicht vermehrt</strong>.</li>
					</ul>
					<div class="glorie-split">
						<div class="glorie-sub">
							<span class="sub-la">gloria objectiva</span>
							<p>Von <strong>allen</strong> Geschöpfen: Sie preisen Gott durch ihr blosses Dasein und durch ihre Vollkommenheit, indem sie gut und schön sind und so den Schöpfer widerspiegeln.</p>
						</div>
						<div class="glorie-sub">
							<span class="sub-la">gloria formalis</span>
							<p>Von der <strong>vernünftigen</strong> Kreatur, die befähigt ist, Gott zu erkennen und anzuerkennen.</p>
						</div>
					</div>
				</div>
			</div>

			<blockquote class="quote-church">
				<p>Obwohl es ganz wahr ist, dass der göttliche Name an sich der Heiligung nicht bedarf, da er heilig und furchtbar ist, wie Gott selbst durch seine eigene Natur heilig ist … so wünschen und begehren wir dennoch, dass er mit Lob, Ehre und Ruhm gefeiert werde nach dem Beispiele jenes Lobes, jener Ehre und jenes Ruhmes, der ihm im Himmel gezollt wird.</p>
				<cite>Cat Rom IV, 10, 4</cite>
			</blockquote>
			<p>Das erste Ziel der ganzen Schöpfung ist die Offenbarung der göttlichen Vollkommenheit &mdash; Allmacht, Weisheit &mdash; und die daraus folgende Ehre Gottes.</p>
			<blockquote class="quote-church">
				<p>Wer leugnet, die Welt sei zur Verherrlichung Gottes geschaffen, der sei ausgeschlossen.</p>
				<cite>1. Vatikanum, 3. Sitzung (NR 322)</cite>
			</blockquote>
			<blockquote class="quote-saint">
				<p>Die gesamte Natur betet in ihrer Weise Gott an. Die aber, die weder mit einem Empfindungsvermögen noch mit Vernunft begabt ist, hat kein Herz, um Gott zu lieben und keinen Verstand, um ihn zu begreifen. Sie begnügt sich deshalb damit, ihre Ordnung, ihre verschiedenartigen Tätigkeiten und ihren Schmuck vor unseren Augen auszubreiten. Sie selbst kann nicht sehen, aber sie zeigt sich. Sie selbst kann nicht beten, aber sie treibt uns dazu an und gestattet nicht, dass Gott, den sie selbst nicht wahrnimmt, unbekannt bleibe.</p>
				<cite>Tanquerey 503</cite>
			</blockquote>
			<blockquote class="quote-scripture">
				<p>Die Himmel rühmen die Herrlichkeit Gottes, vom Werk seiner Hände kündet das Firmament.</p>
				<cite><ScriptureRef reference="Ps 19, 2" /></cite>
			</blockquote>
			<blockquote class="quote-scripture">
				<p>Froh leuchten die Sterne auf ihren Posten. Er ruft sie, und sie sprechen: „Hier sind wir!" Sie leuchten mit Freude für den, der sie schuf.</p>
				<cite><ScriptureRef reference="Bar 3, 34f." /></cite>
			</blockquote>
		</div>
	</section>

	<!-- ============ 3 — DIE BESTIMMUNG DES MENSCHEN ============ -->
	<section class="topic c-green" id="bestimmung">
		<div class="topic-head">
			<span class="topic-badge"><Target size={24} strokeWidth={1.9} /></span>
			<h2>Die Bestimmung des Menschen</h2>
		</div>
		<p>Wir sind auf Erden, um Gott zu erkennen, ihn zu lieben und ihm zu dienen und nach Vollendung des irdischen Lebens in den Himmel zu kommen.</p>

		<!-- Der Kreislauf: Heiligung und Ehre tragen einander -->
		<div class="cycle">
			<svg
				class="cycle-svg"
				viewBox="0 0 360 250"
				role="img"
				aria-label="Ein Kreislauf: Wir heiligen uns, um Gott zu ehren — und wir ehren Gott, um uns zu heiligen. In der Mitte steht: Seine Ehre ist unser Heil."
			>
				<defs>
					<marker id="cyclehead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
						<path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
					</marker>
				</defs>

				<text class="cycle-label c-up" x="180" y="22" text-anchor="middle">Wir heiligen uns, um Gott zu ehren</text>
				<path class="cycle-arc c-up" d="M102,125 A78,78 0 0 1 258,125" marker-end="url(#cyclehead)" />

				<text class="cycle-center-la" x="180" y="112" text-anchor="middle">Seine Ehre</text>
				<text class="cycle-center" x="180" y="137" text-anchor="middle">ist unser Heil!</text>

				<path class="cycle-arc c-down" d="M258,125 A78,78 0 0 1 102,125" marker-end="url(#cyclehead)" />
				<text class="cycle-label c-down" x="180" y="238" text-anchor="middle">Wir ehren Gott, um uns zu heiligen</text>
			</svg>
		</div>

		<div class="ledger">
			<div class="ledger-row bad">
				<span class="ledger-mark">&minus;</span>
				<p>Die <strong>Sünde</strong> entehrt den heiligen Namen Gottes.</p>
			</div>
			<div class="ledger-row good">
				<span class="ledger-mark">+</span>
				<p>Ein <strong>heiliges Leben</strong> aber ehrt ihn.</p>
			</div>
		</div>
		<p class="callout-key">Wenn man das zweite Gebot richtig versteht, schliesst es jede Sünde aus.</p>
		<blockquote class="quote-scripture">
			<p>Dieses Volk ehrt mich mit den Lippen, ihr Herz aber ist fern von mir.</p>
			<cite><ScriptureRef reference="Mt 15, 8" /></cite>
		</blockquote>

		<div class="part" id="babel">
			<span class="part-tag">1 &middot; Der Gegensatz zu Babel</span>
			<p>Das zweite Gebot steht im Kontrast zu Babel. Dort ging es um den eigenen Namen &mdash; hier um den Namen Gottes.</p>
			<div class="contrast">
				<div class="contrast-side babel">
					<span class="contrast-icon"><Building2 size={26} strokeWidth={1.7} /></span>
					<span class="contrast-title">Babel</span>
					<p class="contrast-quote">„Auf! Lasst uns eine Stadt und einen Turm bauen, dessen Spitze bis in den Himmel reicht! Wir wollen uns <strong>einen Namen machen</strong>, damit wir nicht in alle Welt zerstreut werden!"</p>
					<span class="contrast-cite"><ScriptureRef reference="Gen 11, 4" /></span>
					<span class="contrast-tag">weltliche Ambition, Karrierismus</span>
				</div>
				<div class="contrast-vs">statt</div>
				<div class="contrast-side vaterunser">
					<span class="contrast-icon"><Sun size={26} strokeWidth={1.7} /></span>
					<span class="contrast-title">Vaterunser</span>
					<p class="contrast-quote">„<strong>Geheiligt werde Dein Name!</strong>"</p>
					<span class="contrast-cite">Erste Bitte des Herrengebetes</span>
					<span class="contrast-tag">der Name Gottes vor dem eigenen</span>
				</div>
			</div>
			<p>Für die drei ersten Bitten des Vaterunser gilt als Massstab: <em>Sicut in caelo et in terra.</em> Wir wünschen, dass Gottes Name auf Erden ebenso geheiligt werde wie im Himmel, und bitten, <em>„dass er selbst die Heiligung seines Namens in die Hand nehme"</em> (Benedikt XVI., <em>Jesus von Nazareth</em>, S. 179).</p>
			<p class="callout-key">Zu beten „Geheiligt werde Dein Name!" bedeutet, im Licht wandeln zu wollen, um sich als Jünger Christi zu erweisen. Wer so betet, kann sich der Selbstheiligung nicht verweigern.</p>
		</div>

		<div class="part" id="zeugnis">
			<span class="part-tag">2 &middot; Das Zeugnis des Lebens</span>
			<p>Wie die Gläubigen leben, so urteilen die Menschen über den Glauben selbst. Der Name Gottes wird durch ein schlechtes Leben entweiht und durch ein gutes verherrlicht.</p>
			<blockquote class="quote-scripture">
				<p>So kamen sie zu den Heidenvölkern. Wohin sie aber kamen, da befleckten sie meinen heiligen Namen, weil man von ihnen sagte: Diese sind das Volk des Herrn, und doch mussten sie sein Land verlassen. … Nicht um euretwillen handle ich, Haus Israel, sondern um meines heiligen Namens willen, den ihr unter den Völkern, zu denen ihr gelangt seid, entweiht habt. … Ich gebe euch ein neues Herz und lege neuen Geist in eure Brust; ich entferne das Herz aus Stein aus eurem Leib und gebe euch ein Herz aus Fleisch.</p>
				<cite><ScriptureRef reference="Ez 36, 20-27" /></cite>
			</blockquote>
			<blockquote class="quote-scripture">
				<p>Der Sohn ehrt den Vater und der Knecht seinen Herrn. Doch wenn ich Vater bin, wo bleibt meine Ehre, wenn ich der Herr bin, wo bleibt die Furcht vor mir? … ihr Priester, die ihr meinen Namen verachtet. Ihr fragt: „Wodurch verachten wir deinen Namen?" Indem ihr auf meinem Altar befleckte Speise darbringt.</p>
				<cite><ScriptureRef reference="Mal 1, 6-9" /></cite>
			</blockquote>
			<blockquote class="quote-saint">
				<p>Wer schlecht lebt und sich Christ nennt, tut Christus Schmach an. Von solchen heisst es ja, dass durch sie der Name des Herrn gelästert wird. Wenn aber der Name Gottes durch solche gelästert wird, so wird durch die Guten der Name des Herrn verherrlicht.</p>
				<cite>Augustinus, In Ioann. 50, 9</cite>
			</blockquote>
			<blockquote class="quote-saint">
				<p>Wenn es aber zum Lob bei den Menschen gereicht, dass der Väter Zier widerglänzt in dem Sohne, um wieviel ruhmvoller ist es dann, wenn die aus Gott Geborenen das Bildnis ihres Urhebers widerstrahlen, und wenn sie jenen in sich zeigen, der sie gezeugt hat?</p>
				<cite>Leo I., sechste Rede zu Weihnachten (BKV S. 129)</cite>
			</blockquote>
			<blockquote class="quote-church">
				<p>Wie das Leben und die Sitten derer beschaffen sind, welche sich zu einer Religion bekennen, so pflegt auch die unerfahrene Menge über die Religion selbst und über den Stifter dieser Religion zu urteilen.</p>
				<cite>Cat Rom IV, 10, 9</cite>
			</blockquote>
			<blockquote class="quote-scripture">
				<p>So leuchte euer Licht vor den Menschen, damit sie eure guten Werke sehen und euren Vater preisen, der im Himmel ist.</p>
				<cite><ScriptureRef reference="Mt 5, 16" /></cite>
			</blockquote>
			<blockquote class="quote-scripture">
				<p>Daran sollen alle erkennen, dass ihr meine Jünger seid, wenn ihr untereinander Liebe habt.</p>
				<cite><ScriptureRef reference="Joh 13, 35" /></cite>
			</blockquote>
			<blockquote class="quote-scripture">
				<p>Kindlein, wir wollen nicht lieben mit Wort und Zunge, sondern in Tat und Wahrheit.</p>
				<cite><ScriptureRef reference="1 Joh 3, 18" /></cite>
			</blockquote>
			<p>Jede menschliche Ehrenbezeugung muss notwendig hinter dem Anspruch der Heiligkeit Gottes zurückbleiben. Deshalb vereinen wir unseren Lobpreis mit dem unendlich wertvollen Lobopfer des Sohnes: <em>Per ipsum et cum ipso et in ipso …</em></p>
			<p class="callout-key">Unser ganzes Leben soll ein <em>Gloria Patri</em> sein!</p>
		</div>
	</section>

	<KatecheseSeries gebot="Das zweite Gebot" parts={ZWEITES_GEBOT} current={1} />

	<p class="disclaimer">Diese Seite stellt eine freie Aufbereitung der erhaltenen Unterlagen dar und ist kein offizielles Angebot von P. Martin Ramm oder der FSSP. Etwaige Fehler oder Missverständnisse sind dem Verfasser dieser Seite anzulasten.</p>
</div>
</div>

<!-- Bible citations: the reader's peeks, with a link into the Bible. -->
<ReferencePeeks {lang} faithLang={page.url.pathname.split('/')[1]} bibleLang={bibleSlug(lang)} source={lang === 'en' ? 'Douay-Rheims' : 'Allioli'} />

<style>

	/* Zwei Wege, den Namen zu ehren */
	.two-ways {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75em;
		margin: 1.5em 0 0;
	}
	.way {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-areas: 'icon name' 'icon desc';
		column-gap: 0.7em;
		align-items: center;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.9em;
	}
	.way-icon {
		grid-area: icon;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: color-mix(in oklab, var(--color-primary) 15%, var(--color-surface));
		color: var(--color-primary);
		display: grid;
		place-items: center;
	}
	.way-name {
		grid-area: name;
		font-weight: 700;
		font-size: 0.95rem;
	}
	.way-desc a {
		color: var(--color-primary);
	}
	.way-desc {
		grid-area: desc;
		font-size: 0.82rem;
		color: var(--color-text-secondary);
		line-height: 1.35;
	}

	/* Das Tetragramm */
	.tetra {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.5em 1em 1.25em;
		text-align: center;
		margin: 1.25em 0;
	}
	.tetra-letters {
		display: flex;
		justify-content: center;
		gap: 0.75em;
	}
	.tetra-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15em;
		min-width: 3.25em;
		padding: 0.4em 0.3em;
		border-radius: var(--radius-md);
		background: var(--color-bg-tertiary);
	}
	.tetra-glyph {
		font-size: 2.4rem;
		line-height: 1.1;
		color: var(--color-text-primary);
	}
	.tetra-name {
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
	}
	.tetra-lat {
		font-family: serif;
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--color-primary);
	}
	.tetra-sr {
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
		margin: 0.75em 0 0;
	}
	.tetra-cap {
		display: block;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--color-text-tertiary);
		margin-bottom: 0.6em;
	}
	.tetra-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15em;
		margin-top: 0.9em;
		color: var(--color-text-tertiary);
		font-size: 0.78rem;
	}
	.tetra-pointed {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3em;
		margin-top: 0.5em;
		padding: 0.6em 0.8em;
		border-radius: var(--radius-md);
		background: var(--color-bg-tertiary);
	}
	.pointed-glyph {
		font-size: 2.6rem;
		line-height: 1.35;
	}
	.pointed-cap {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.c {
		font-weight: 700;
		color: var(--color-primary);
	}
	.v {
		font-weight: 700;
		color: var(--nord12);
	}
	.tetra-branch {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6em;
		margin-top: 0.9em;
		text-align: left;
	}
	.branch {
		display: flex;
		flex-direction: column;
		gap: 0.25em;
		border-radius: var(--radius-md);
		padding: 0.75em 0.85em;
		border: 1px solid var(--color-border);
		background: var(--color-bg-primary);
	}
	.branch.true {
		border-top: 3px solid var(--color-primary);
	}
	.branch.wrong {
		border-top: 3px solid var(--nord12);
	}
	.branch-tag {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-text-tertiary);
	}
	.branch-word {
		font-family: serif;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-primary);
		line-height: 1.2;
	}
	.merge {
		font-family: serif;
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: 0.02em;
	}
	.merge-sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.branch p {
		margin: 0.15em 0 0;
		font-size: 0.8rem;
		line-height: 1.4;
		color: var(--color-text-secondary);
	}

	.liturgy-list {
		padding-left: 1.4em;
		color: var(--color-text-secondary);
	}
	.liturgy-list li {
		margin-bottom: 0.3em;
	}

	/* Die zweifache Glorie */
	.glorie {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75em;
		align-items: start;
		margin: 1.25em 0;
	}
	.glorie-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1em;
	}
	.glorie-card.intrinseca {
		border-top: 3px solid var(--blue);
	}
	.glorie-card.extrinseca {
		border-top: 3px solid var(--green);
	}
	.glorie-la {
		display: block;
		font-style: italic;
		font-weight: 700;
		font-size: 1rem;
		margin-bottom: 0.35em;
	}
	.glorie-card.intrinseca .glorie-la {
		color: var(--blue);
	}
	.glorie-card.extrinseca .glorie-la {
		color: var(--green);
	}
	.glorie-lead {
		margin: 0 0 0.5em;
		font-size: 0.92rem;
	}
	.glorie-card ul {
		margin: 0;
		padding-left: 1.2em;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}
	.glorie-card ul li {
		margin-bottom: 0.25em;
	}
	.glorie-quote {
		margin: 0.75em 0 0;
		font-size: 0.82rem;
		font-style: italic;
		color: var(--color-text-secondary);
		border-top: 1px solid var(--color-border);
		padding-top: 0.6em;
	}
	.glorie-cite {
		font-style: normal;
		color: var(--color-text-tertiary);
	}
	.glorie-split {
		display: grid;
		gap: 0.5em;
		margin-top: 0.85em;
		padding-top: 0.75em;
		border-top: 1px dashed var(--color-border);
	}
	.glorie-sub {
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-sm);
		padding: 0.6em 0.7em;
	}
	.sub-la {
		display: block;
		font-style: italic;
		font-weight: 600;
		font-size: 0.85rem;
		color: var(--green);
		margin-bottom: 0.15em;
	}
	.glorie-sub p {
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.4;
		color: var(--color-text-secondary);
	}

	/* Kreislauf: Heiligung ↔ Ehre */
	.cycle {
		display: flex;
		justify-content: center;
		margin: 1.5em 0;
	}
	.cycle-svg {
		width: 100%;
		max-width: 420px;
		height: auto;
	}
	.cycle-arc {
		fill: none;
		stroke-width: 2.5;
	}
	.cycle-arc.c-up {
		stroke: var(--color-primary);
	}
	.cycle-arc.c-down {
		stroke: var(--green);
	}
	.cycle-label {
		font-size: 13px;
		font-weight: 600;
		fill: var(--color-text-secondary);
	}
	.cycle-label.c-up {
		fill: var(--color-primary);
	}
	.cycle-label.c-down {
		fill: var(--green);
	}
	.cycle-center-la,
	.cycle-center {
		font-size: 17px;
		font-weight: 700;
		fill: var(--color-text-primary);
	}

	/* Sünde entehrt / heiliges Leben ehrt */
	.ledger {
		display: grid;
		gap: 0.5em;
		margin: 1.25em 0;
	}
	.ledger-row {
		display: flex;
		align-items: center;
		gap: 0.75em;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.7em 0.9em;
	}
	.ledger-row p {
		margin: 0;
		font-size: 0.95rem;
	}
	.ledger-mark {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-weight: 700;
		color: #fff;
	}
	.ledger-row.bad {
		border-left: 3px solid var(--red);
	}
	.ledger-row.bad .ledger-mark {
		background: var(--red);
	}
	.ledger-row.good {
		border-left: 3px solid var(--green);
	}
	.ledger-row.good .ledger-mark {
		background: var(--green);
	}

	/* Babel vs. Vaterunser */
	.contrast {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 0.6em;
		margin: 1.25em 0;
	}
	.contrast-side {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.3em;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1em;
		height: 100%;
	}
	.contrast-side.babel {
		border-top: 3px solid var(--nord12);
	}
	.contrast-side.vaterunser {
		border-top: 3px solid var(--color-primary);
	}
	.contrast-icon {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--color-bg-tertiary);
	}
	.contrast-side.babel .contrast-icon {
		color: var(--nord12);
	}
	.contrast-side.vaterunser .contrast-icon {
		color: var(--color-primary);
	}
	.contrast-title {
		font-weight: 700;
	}
	.contrast-quote {
		margin: 0;
		font-size: 0.85rem;
		font-style: italic;
		line-height: 1.45;
	}
	.contrast-cite {
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
	}
	.contrast-tag {
		margin-top: auto;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		padding: 0.15em 0.6em;
	}
	.contrast-vs {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-text-tertiary);
	}

	/* Mobile */
	@media (max-width: 600px) {
		.two-ways,
		.glorie {
			grid-template-columns: 1fr;
		}
		.contrast {
			grid-template-columns: 1fr;
		}
		.contrast-vs {
			text-align: center;
		}
		.tetra-branch {
			grid-template-columns: 1fr;
		}
		.tetra-letters {
			gap: 0.4em;
		}
		.tetra-glyph {
			font-size: 1.9rem;
		}
		.tetra-cell {
			min-width: 2.6em;
		}
		}

</style>
