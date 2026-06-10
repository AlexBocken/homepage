<script>
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Skull from '@lucide/svelte/icons/skull';
	import Flame from '@lucide/svelte/icons/flame';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Ban from '@lucide/svelte/icons/ban';
	import Clover from '@lucide/svelte/icons/clover';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Eye from '@lucide/svelte/icons/eye';
	import WandSparkles from '@lucide/svelte/icons/wand-sparkles';
	import Coins from '@lucide/svelte/icons/coins';
	import EqualNot from '@lucide/svelte/icons/equal-not';
	import ErstesGebotSeries from '$lib/components/faith/ErstesGebotSeries.svelte';
	import { page } from '$app/state';
	import ApologetikToc from '$lib/components/faith/ApologetikToc.svelte';
	import { m, langFromFaithSlug } from '$lib/js/faithI18n';

	const lang = $derived(langFromFaithSlug(page.url.pathname.split('/')[1]));
	const t = $derived(m[lang]);
	const isGerman = $derived(lang === 'de');

	const tocItems = [
		{ id: 'geluebde', short: 'Das Gelübde', href: '#geluebde' },
		{ id: 'geluebde-arten', short: 'Arten des Gelübdes', href: '#geluebde-arten', group: 'Das Gelübde' },
		{ id: 'evangelische-raete', short: 'Evangelische Räte', href: '#evangelische-raete', group: 'Das Gelübde' },
		{ id: 'suenden', short: 'Sünden gegen das 1. Gebot', href: '#suenden' },
		{ id: 'unglaube', short: 'Unglaube', href: '#unglaube', group: 'Sünden' },
		{ id: 'aberglaube', short: 'Aberglaube', href: '#aberglaube', group: 'Sünden' },
		{ id: 'wahrsagerei', short: 'Wahrsagerei', href: '#wahrsagerei', group: 'Sünden' },
		{ id: 'magie', short: 'Magie & Okkultismus', href: '#magie', group: 'Sünden' },
		{ id: 'goetzendienst', short: 'Götzendienst', href: '#goetzendienst', group: 'Sünden' },
		{ id: 'pendeln', short: 'Exkurs: Das Pendeln', href: '#pendeln' }
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

	// Wesensmerkmale eines Gelübdes (CIC 1191, KKK 2102)
	const geluebdeMerkmale = [
		{ label: 'An Gott gerichtet', desc: 'Es zielt auf seine Ehre.' },
		{ label: 'Freiwillig', desc: 'Unter Zwang oder aus schwerer Furcht abgelegt, wäre es ungültig.' },
		{ label: 'Verbindlich', desc: 'Ein bloßer Vorsatz ist noch kein Gelübde — es verpflichtet zur Erfüllung.' },
		{ label: 'Sittlich gut & möglich', desc: 'Etwas Unmoralisches oder Unmögliches kann nicht Gegenstand eines Gelübdes sein.' }
	];

	// Evangelische Räte
	const raete = [
		{ name: 'Armut', cite: 'Mt 19, 21', opfer: 'Bindung an zeitliche Güter', color: 'var(--nord14)' },
		{ name: 'Keuschheit', cite: 'Mt 19, 12', opfer: 'Geborgenheit einer Familie', color: 'var(--nord13)' },
		{ name: 'Gehorsam', cite: 'Joh 4, 34', opfer: 'der eigene Wille', color: 'var(--nord11)' }
	];

	// Sünden gegen das erste Gebot — Übersicht
	const suenden = [
		{ id: 'unglaube', name: 'Unglaube', kurz: 'Verweigerung des Gehorsams gegen die geoffenbarte Wahrheit.', Icon: EyeOff },
		{ id: 'aberglaube', name: 'Aberglaube', kurz: 'Geschaffenen Dingen eine höhere Kraft zuschreiben.', Icon: Clover },
		{ id: 'wahrsagerei', name: 'Wahrsagerei', kurz: 'Verborgenes auf unerlaubte Weise erforschen.', Icon: Eye },
		{ id: 'magie', name: 'Magie & Okkultismus', kurz: 'Kontakt zu Geistern und verborgenen Mächten suchen.', Icon: WandSparkles },
		{ id: 'goetzendienst', name: 'Götzendienst', kurz: 'Ein Geschöpf an die Stelle Gottes setzen.', Icon: Coins }
	];

	// Götzendienst im weiteren Sinn — ungeordnete Anhänglichkeit
	const falscheGoetter = [
		{ vice: 'Geiz & Habsucht', gott: 'der Besitz', cite: 'Eph 5, 5' },
		{ vice: 'Hoffart (Hochmut)', gott: 'die eigene Ehre', cite: '' },
		{ vice: 'Völlerei', gott: 'der Bauch', cite: 'Phil 3, 19' },
		{ vice: 'Unkeuschheit', gott: 'die Lust', cite: '1 Kor 6, 15' }
	];

	// Magie & Spiritismus — gesuchter Kontakt
	const okkultKontakt = [
		{ label: 'Anrufung von Toten', icon: 'skull' },
		{ label: 'Anrufung von Dämonen', icon: 'demon' },
		{ label: 'Kontakt mit Naturgeistern', icon: 'spirit', note: 'Elfen, Nixen, Zwerge …' }
	];
</script>

<svelte:head>
	<title>Gelübde & Sünden gegen das erste Gebot - Bocken</title>
	<meta name="description" content="Das Gelübde und die Sünden gegen das erste Gebot — Katechese nach P. Martin Ramm FSSP" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: 'Gelübde und Sünden gegen das erste Gebot',
		description: 'Katechese zum Gelübde und zu den Sünden gegen das erste Gebot (Unglaube, Aberglaube, Wahrsagerei, Magie, Götzendienst) — Aufbereitung des Glaubenskurses (3. Hauptteil) von P. Martin Ramm FSSP.',
		inLanguage: 'de',
		url: 'https://bocken.org/glaube/katechese/geluebde-und-suenden',
		mainEntityOfPage: 'https://bocken.org/glaube/katechese/geluebde-und-suenden',
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
			{ '@type': 'ListItem', position: 3, name: 'Katechese', item: 'https://bocken.org/glaube/katechese' },
			{ '@type': 'ListItem', position: 4, name: 'Gelübde und Sünden gegen das erste Gebot', item: 'https://bocken.org/glaube/katechese/geluebde-und-suenden' }
		]
	})}</script>`}
</svelte:head>

<div class="page-wrapper">
<ApologetikToc title="Inhalt" items={tocItems} {activeId} onItemClick={jumpTo} />
<div class="page">
	<header class="hero">
		<p class="eyebrow">Die Zehn Gebote &middot; Das erste Gebot</p>
		<h1>Gelübde &amp; Sünden gegen das erste Gebot</h1>
		<p class="subtitle">Glaubenskurs, 3. Hauptteil &mdash; P. Martin Ramm FSSP</p>
	</header>

	{#if !isGerman}
		<p class="lang-notice">{t.only_german_pre}<a href={resolve('/glaube/katechese/geluebde-und-suenden')}>{t.only_german_link}</a>{t.only_german_post}</p>
	{/if}

	<!-- ============ DAS GELÜBDE ============ -->
	<section id="geluebde">
		<h2>Das Gelübde</h2>
		<p>Etwas <em>geloben</em> heißt, etwas ernsthaft und feierlich zu versprechen. Ein <strong>Gelübde</strong> im eigentlichen Sinn ist ein Gott überlegt und frei gegebenes Versprechen, das kraft der Tugend der Gottesverehrung erfüllt werden muss (vgl. CIC can 1191).</p>
		<blockquote class="quote-church">
			<p>Das Gelübde ist ein Akt der Hingabe, durch den sich der Christ Gott weiht oder ihm ein gutes Werk verspricht. Durch die Erfüllung seiner Gelübde schenkt er Gott, was er ihm versprochen und geweiht hat.</p>
			<cite>KKK 2102</cite>
		</blockquote>

		<h3>Vier Wesensmerkmale</h3>
		<div class="merkmal-grid">
			{#each geluebdeMerkmale as merkmal, i (merkmal.label)}
				<div class="merkmal-card">
					<span class="merkmal-num">{i + 1}</span>
					<div>
						<span class="merkmal-label">{merkmal.label}</span>
						<p>{merkmal.desc}</p>
					</div>
				</div>
			{/each}
		</div>

		<blockquote class="quote-scripture">
			<p>Was du gelobt hast, erfülle! Besser ist, du gelobst nicht, als dass du gelobst und nicht erfüllst!</p>
			<cite>Pred 5, 3f.</cite>
		</blockquote>
		<p class="callout-warn">Wer in einer schwerwiegenden Sache ein Gelübde nicht hält, begeht eine schwere Sünde. Darum soll ein Gelübde nie leichtfertig, sondern nur nach reiflicher Überlegung abgelegt werden.</p>

		<!-- Arten des Gelübdes — zwei Achsen -->
		<div id="geluebde-arten">
			<h3>Zwei Achsen der Unterscheidung</h3>
			<p>Das Kirchenrecht unterscheidet ein Gelübde nach zwei voneinander unabhängigen Gesichtspunkten (CIC can 1192):</p>
			<div class="axis-grid">
				<div class="axis-pole strong a-geltung">
					<span class="pole-name">öffentlich</span>
					<span class="pole-desc">im Namen der Kirche von einem rechtmäßigen Oberen entgegengenommen</span>
				</div>
				<div class="axis-pole strong a-anerkennung">
					<span class="pole-name">feierlich</span>
					<span class="pole-desc">als solches von der Kirche anerkannt</span>
				</div>
				<div class="axis-pole soft a-geltung">
					<span class="pole-name">privat</span>
					<span class="pole-desc">andernfalls</span>
				</div>
				<div class="axis-pole soft a-anerkennung">
					<span class="pole-name">einfach</span>
					<span class="pole-desc">andernfalls</span>
				</div>
			</div>
			<p class="axis-note">Von <strong>privaten</strong> Gelübden kann ein Pfarrer aus gerechtem Grund dispensieren (CIC can 1196). Der Gelobende selbst kann die versprochene Leistung in ein besseres oder gleichwertiges Gut umwandeln (CIC can 1197).</p>
		</div>

		<details class="bible-examples">
			<summary>Gelübde in der Heiligen Schrift</summary>
			<blockquote class="quote-scripture">
				<p>Wenn jemand, Mann oder Frau, das besondere Gelübde des Nasiräates ablegt, sich dem Herrn zu weihen … darf er nichts von dem genießen, was vom Weinstock kommt … ein Schermesser darf nicht über sein Haupt kommen … er lasse sein Haupthaar frei wachsen.</p>
				<cite>Num 6, 2–5</cite>
			</blockquote>
			<blockquote class="quote-scripture">
				<p>Paulus … hatte sich in Kenchreä das Haupt scheren lassen, weil er ein Gelübde gemacht hatte.</p>
				<cite>Apg 18, 18</cite>
			</blockquote>
			<blockquote class="quote-scripture">
				<p>Jakob tat folgendes Gelübde: „Wenn Gott mit mir ist … und mich in Frieden in mein Vaterhaus heimkehren lässt, dann will ich den Herrn mir zum Schutzgott erwählen … Alles, was du mir schenken wirst, will ich dir zu Ehren gern verzehnten!"</p>
				<cite>Gen 28, 20–22</cite>
			</blockquote>
		</details>

		<!-- Evangelische Räte -->
		<div class="raete-block" id="evangelische-raete">
			<h3>Die Evangelischen Räte</h3>
			<p>Ordensleute bringen durch drei Gelübde je ein Gut zum Opfer dar:</p>
			<div class="raete-visual">
				{#each raete as rat (rat.name)}
					<div class="rat">
						<div class="rat-circle" style="border-color: {rat.color}; color: {rat.color}">
							<span class="rat-name">{rat.name}</span>
						</div>
						<span class="rat-cite">{rat.cite}</span>
						<p>opfert: {rat.opfer}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- ============ SÜNDEN GEGEN DAS ERSTE GEBOT ============ -->
	<section id="suenden">
		<h2>Sünden gegen das erste Gebot</h2>
		<p>Das erste Gebot fordert die rechte Verehrung des einen wahren Gottes. Gegen sie sündigt man durch <em>Zuwenig</em> ebenso wie durch ein <em>verkehrtes Zuviel</em> an Religiosität:</p>

		<!-- Divergierende Ausrichtung: zu wenig / richtig / verkehrtes Zuviel -->
		<div class="aim">
			<svg
				class="aim-svg"
				viewBox="0 0 400 282"
				role="img"
				aria-label="Die Verehrung kann zu wenig sein (Unglaube), richtig auf Gott ausgerichtet sein (wahre Gottesverehrung) oder ein verkehrtes Zuviel, das sich an ein Geschöpf richtet (Aberglaube)."
			>
				<defs>
					<marker id="aimhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
						<path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
					</marker>
				</defs>

				<!-- wahre Gottesverehrung — Beschriftung über der Sonne -->
				<text class="aim-title t-true" x="200" y="20" text-anchor="middle">Wahre Gottesverehrung</text>
				<text class="aim-sub" x="200" y="37" text-anchor="middle">Richtig auf Gott ausgerichtet</text>

				<!-- Gott — das Ziel (Sonne) -->
				<g class="aim-gott">
					<circle cx="200" cy="76" r="10" />
					<line x1="200" y1="54" x2="200" y2="61" />
					<line x1="176" y1="76" x2="183" y2="76" />
					<line x1="217" y1="76" x2="224" y2="76" />
					<line x1="184" y1="60" x2="189" y2="65" />
					<line x1="216" y1="60" x2="211" y2="65" />
					<line x1="184" y1="92" x2="189" y2="87" />
					<line x1="216" y1="92" x2="211" y2="87" />
				</g>

				<!-- Ursprung der Religiosität -->
				<circle class="aim-origin" cx="200" cy="238" r="4" />

				<!-- wahre Gottesverehrung: gerade hinauf zu Gott -->
				<path class="aim-true" d="M200,232 L200,92" marker-end="url(#aimhead)" />

				<!-- Unglaube: matt und kraftlos absinkend -->
				<path class="aim-under" d="M200,232 C180,206 150,212 108,220" marker-end="url(#aimhead)" />
				<text class="aim-title t-under" x="98" y="246" text-anchor="middle">Unglaube</text>
				<text class="aim-sub" x="98" y="261" text-anchor="middle">Zuwenig</text>

				<!-- Aberglaube: viel Schwung, aber verkehrt zum Geschöpf -->
				<path class="aim-over" d="M200,232 C204,150 258,102 330,106" marker-end="url(#aimhead)" />
				<g class="aim-creature" transform="translate(334,90)"><Clover size={20} strokeWidth={2} /></g>
				<text class="aim-sub" x="344" y="124" text-anchor="middle">Geschöpf</text>
				<text class="aim-title t-over" x="344" y="140" text-anchor="middle">Aberglaube</text>
				<text class="aim-sub" x="344" y="155" text-anchor="middle">Verkehrtes Zuviel</text>
			</svg>
		</div>
		<blockquote class="quote-church">
			<p>Der Aberglaube ist gewissermaßen ein abartiges Zuviel an Religiosität, der Unglaube ein Zuwenig.</p>
			<cite>KKK 2110</cite>
		</blockquote>

		<!-- Übersicht der Sünden -->
		<div class="sin-grid">
			{#each suenden as suende (suende.id)}
				{@const Icon = suende.Icon}
				<a class="sin-card" href={'#' + suende.id} onclick={(e) => jumpTo(e, suende.id)}>
					<span class="sin-badge"><Icon size={20} strokeWidth={2} /></span>
					<span class="sin-name">{suende.name}</span>
					<span class="sin-kurz">{suende.kurz}</span>
					<ArrowDown class="sin-arrow" size={16} />
				</a>
			{/each}
		</div>
	</section>

	<!-- A. Unglaube -->
	<section class="sub" id="unglaube">
		<div class="sub-header">
			<span class="sub-letter"><EyeOff size={24} strokeWidth={2} /></span>
			<h2>Unglaube</h2>
		</div>
		<p>Vorstufe des Unglaubens ist der freiwillige <strong>Glaubenszweifel</strong>. Wie eine Versuchung zur Unreinheit erst durch willentliche Zustimmung sündhaft wird, ist auch eine Schwierigkeit gegen den Glauben an sich noch keine Sünde — sie wird es erst, wenn man ihr bewusst und willentlich Raum gibt.</p>
		<blockquote class="quote-church">
			<p>Freiwilliger Glaubenszweifel besteht in der Vernachlässigung oder Weigerung, für wahr zu halten, was Gott geoffenbart hat und die Kirche zu glauben vorlegt.</p>
			<cite>KKK 2088</cite>
		</blockquote>
		<p><strong>Unglaube</strong> ist die Verweigerung des Gehorsams und die Auflehnung gegen Gott und seine Offenbarung sowie die bewusste Ablehnung der geoffenbarten Wahrheit.</p>
		<blockquote class="quote-church">
			<p>Unglaube besteht in der Missachtung der geoffenbarten Wahrheit oder in der willentlichen Weigerung, ihr zuzustimmen.</p>
			<cite>KKK 2089</cite>
		</blockquote>
	</section>

	<!-- B. Aberglaube -->
	<section class="sub" id="aberglaube">
		<div class="sub-header">
			<span class="sub-letter"><Clover size={24} strokeWidth={2} /></span>
			<h2>Aberglaube</h2>
		</div>
		<p>Aberglaube besteht darin, dass man geschaffenen Dingen eine höhere Kraft zuschreibt,</p>
		<ul class="neg-list">
			<li>die sie weder von Natur besitzen,</li>
			<li>noch durch kirchliche Weihe empfangen haben,</li>
			<li>noch durch göttliche Einsetzung in sich tragen.</li>
		</ul>
		<p>Abergläubisch ist etwa, wer einem Hufeisen, Kleeblatt, Talisman oder Amulett Schutz zuschreibt — oder wer sich auf Kartenlegen, Handlesen, Astrologie, Horoskope oder Pendeln einlässt und sein Handeln davon abhängig macht.</p>
		<blockquote class="quote-scripture">
			<p>Sie fanden aber bei allen Gefallenen unter den Kleidern Abbilder von den Götzen aus Jamnia, deren Gebrauch das Gesetz den Juden verbietet. Da wurde allen klar, dass sie wegen dieser Verfehlung gefallen waren.</p>
			<cite>2 Makk 12, 39–41</cite>
		</blockquote>
		<p>Aberglaube kann sich auch in die rechte Gottesverehrung einschleichen, wenn man die Wirksamkeit von Gebet oder Sakramenten allein dem äußeren Vollzug zuschreibt und die innere Haltung vernachlässigt.</p>
		<blockquote class="quote-church">
			<p>Wer die Wirksamkeit von Gebeten oder von sakramentalen Zeichen dem bloß äußerlichen Verrichten zuschreibt und dabei von den inneren Haltungen, die sie erfordern, absieht, verfällt dem Aberglaube.</p>
			<cite>KKK 2111</cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Mein Volk befragt ein Holzstück. Sein Stab soll ihm Auskunft geben. Der Geist der Hurerei hat es betört.</p>
			<cite>Hos 4, 12</cite>
		</blockquote>
	</section>

	<!-- C. Wahrsagerei -->
	<section class="sub" id="wahrsagerei">
		<div class="sub-header">
			<span class="sub-letter"><Eye size={24} strokeWidth={2} /></span>
			<h2>Wahrsagerei</h2>
		</div>
		<p>Wahrsagerei betreibt, wer Verborgenes oder Zukünftiges auf unerlaubte Weise zu erforschen sucht. Schon der <em>Baum der Erkenntnis</em> (Gen 3) ist ein Bild des unberechtigten Zugriffs auf verborgenes Wissen.</p>
		<blockquote class="quote-church">
			<p>Sämtliche Formen der Wahrsagerei sind zu verwerfen … Hinter Horoskopen, Astrologie, Handlesen, Deuten von Vorzeichen und Orakeln, Hellseherei und dem Befragen eines Mediums verbirgt sich der Wille zur Macht … sowie der Wunsch, sich die geheimen Mächte geneigt zu machen.</p>
			<cite>KKK 2116</cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Ihr aber, hört doch nicht auf eure Propheten, eure Wahrsager, eure Träumer, auf eure Zeichendeuter und Zauberer … denn Lüge verkünden sie euch.</p>
			<cite>Jer 27, 9f.</cite>
		</blockquote>
		<blockquote class="quote-saint">
			<p>Die Jahre unseres Lebens und die Beschaffenheit irdischen Tuns hängen nicht ab von der Natur der Elemente und nicht von dem Einfluss der Gestirne, sie stehen vielmehr in der Macht des höchsten und wahren Gottes.</p>
			<cite>Leo I., 6. Rede über die Passion</cite>
		</blockquote>
	</section>

	<!-- D. Magie und Okkultismus -->
	<section class="sub" id="magie">
		<div class="sub-header">
			<span class="sub-letter"><WandSparkles size={24} strokeWidth={2} /></span>
			<h2>Magie &amp; Okkultismus</h2>
		</div>
		<p>In <em>Magie</em> und <em>Spiritismus</em> sucht man Kontakt zu Geistern oder verborgenen Mächten, oft mit Hilfe sogenannter Medien:</p>
		<div class="okkult-grid">
			{#each okkultKontakt as k (k.label)}
				<div class="okkult-card">
					<div class="okkult-icon">
						{#if k.icon === 'skull'}
							<Skull size={40} strokeWidth={1.6} />
						{:else if k.icon === 'demon'}
							<Flame size={40} strokeWidth={1.6} />
						{:else}
							<Sparkles size={40} strokeWidth={1.6} />
						{/if}
					</div>
					<span class="okkult-label">{k.label}</span>
					{#if k.note}<span class="okkult-note">{k.note}</span>{/if}
				</div>
			{/each}
		</div>
		<blockquote class="quote-church">
			<p>Sämtliche Praktiken der Magie und Zauberei, mit denen man sich geheime Mächte untertan machen will … verstoßen schwer gegen die Tugend der Gottesverehrung … Auch das Tragen von Amuletten ist verwerflich. Spiritismus ist oft mit Wahrsagerei oder Magie verbunden. Darum warnt die Kirche die Gläubigen davor.</p>
			<cite>KKK 2117</cite>
		</blockquote>
		<p class="callout-warn">Die sog. „weiße Magie" ist ebenso zu verwerfen wie die „schwarze Magie" — sie verfolgt nur angeblich gute Zwecke. Auch Tische- oder Gläserrücken darf man keinesfalls als harmlos betrachten; häufig tarnen sich solche okkulten Praktiken als Party-Gag.</p>
		<blockquote class="quote-scripture">
			<p>Niemand finde sich bei dir, der … einen Totengeist oder Wahrsagegeist befragt oder Auskunft bei den Toten sucht. Denn ein Gräuel für den Herrn ist jeder, der solches tut.</p>
			<cite>Dt 18, 10–12</cite>
		</blockquote>
		<p class="aside-note">1 Sam 28 berichtet, wie Saul die Totenbeschwörerin von En-Dor aufsucht und sie den Propheten Samuel befragen lässt.</p>
	</section>

	<!-- E. Götzendienst -->
	<section class="sub" id="goetzendienst">
		<div class="sub-header">
			<span class="sub-letter"><Coins size={24} strokeWidth={2} /></span>
			<h2>Götzendienst</h2>
		</div>
		<p>Götzendienst oder Abgötterei besteht darin, ein Geschöpf an die Stelle Gottes zu setzen und es an seiner Stelle zu verehren oder anzubeten.</p>
		<blockquote class="quote-church">
			<p>Es ist Götzendienst, wenn der Mensch anstelle Gottes etwas Geschaffenes ehrt und verehrt, ob es sich nun um Götter oder Dämonen … oder um Macht, Vergnügen, Rasse, Ahnen, Staat, Geld oder ähnliches handelt.</p>
			<cite>KKK 2113</cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Ihr könnt nicht Gott dienen und dem Mammon.</p>
			<cite>Mt 6, 24</cite>
		</blockquote>

		<h3>1. Heidnischer Götzendienst</h3>
		<p>Die Heiden „vertauschten die Herrlichkeit des unvergänglichen Gottes mit der Nachbildung eines vergänglichen Menschen" (Röm 1, 23). Auch Himmelskörper, Naturkräfte, Pflanzen und Tiere wurden als göttlich verehrt.</p>
		<blockquote class="quote-scripture">
			<p>Ihre Götzen sind Silber und Gold, das Machwerk von Menschenhänden. Sie haben einen Mund und können nicht reden, haben Augen und können nicht sehen … Ihnen gleich sollen werden, die sie verfertigten, jeder, der auf sie vertraut! Haus Israel, vertraue auf den Herrn!</p>
			<cite>Ps 115, 4–9</cite>
		</blockquote>

		<h3>2. Götzendienst im weiteren Sinn</h3>
		<p>Auch jede Form ungeordneter Anhänglichkeit an geschaffene Güter kann als eine Art Götzendienst verstanden werden — der Mensch macht sich einen falschen Gott:</p>
		<div class="goetzen-grid">
			{#each falscheGoetter as g (g.vice)}
				<div class="goetze-card">
					<span class="goetze-vice">{g.vice}</span>
					<span class="goetze-arrow">↳ Gott wird</span>
					<span class="goetze-gott">{g.gott}</span>
					{#if g.cite}<span class="goetze-cite">{g.cite}</span>{/if}
				</div>
			{/each}
		</div>
		<blockquote class="quote-scripture">
			<p>Offenkundig sind die Werke des Fleisches … Unzucht, Götzendienst, Zauberei, Feindschaften, Zank, Eifersucht … die solches treiben, werden das Reich Gottes nicht erben.</p>
			<cite>Gal 5, 19–21</cite>
		</blockquote>
	</section>

	<!-- ============ EXKURS: DAS PENDELN ============ -->
	<section class="exkurs" id="pendeln">
		<p class="exkurs-tag">Exkurs</p>
		<h2>Das Pendeln</h2>
		<p>Divinatorisches Pendeln ist eine esoterische Praxis, bei der ein Pendel genutzt wird, um Antworten auf Ja/Nein-Fragen zu erhalten oder das Unterbewusstsein anzusprechen. Der Katechismus weist alle Formen der Wahrsagerei zurück (KKK 2116) — sachlich gehört dazu auch das Pendeln.</p>

		<p>In seinem Buch <em>„Helfen und Heilen"</em> wollte P. Thomas Häberle (1912–1997, Mönch des Benediktinerklosters Disentis) das Pendeln rechtfertigen — und liefert dabei ungewollt ein Beispiel, wie es innerhalb esoterischer Kreise gedeutet wird: als paranormale Fähigkeit, sich mit jedem Punkt der Erde zu verbinden und „Strahlen" zu empfangen.</p>

		<!-- Die fehlerhafte Analogie -->
		<div class="analogie">
			<div class="analogie-side">
				<span class="analogie-label">Behauptung</span>
				<span class="analogie-thing">Pendel</span>
				<span class="analogie-sub">empfängt „Strahlen"</span>
			</div>
			<div class="analogie-link">
				<span class="analogie-eq"><EqualNot size={26} strokeWidth={2.5} /></span>
				<span class="analogie-broken">Analogieschluss<br />ohne Grundlage</span>
			</div>
			<div class="analogie-side">
				<span class="analogie-label">Vergleich</span>
				<span class="analogie-thing">Elektrizität</span>
				<span class="analogie-sub">naturwissenschaftlich messbar</span>
			</div>
		</div>
		<p class="analogie-note">Das Material des Pendels spielt nach Häberle keine Rolle — das Pendel „arbeitet" nur, wenn „der Geist" fragt. Genau das entlarvt es: Es ist kein physikalischer Apparat, sondern eine Form okkult konnotierter Kausalinterpretation.</p>

		<blockquote class="quote-source">
			<p>„Das Pendeln ist eine Gabe, die Gott dem Menschen geschenkt hat … Der Pendler kann sich mit irgendeinem Punkt auf Erden in Verbindung setzen … Mit Hilfe des Pendels ist es auch möglich, jedes beliebige Medikament … sowie die richtige Dosierung zu überprüfen."</p>
			<cite>P. Thomas Häberle, <em>Helfen und Heilen</em> (zitiert als Beispiel der <strong>abzulehnenden</strong> Deutung)</cite>
		</blockquote>

		<div class="verdict">
			<Ban size={28} strokeWidth={2.2} />
			<p>Das Pendeln ist als esoterische Praxis klar <strong>abzulehnen</strong>.</p>
		</div>
	</section>

	<ErstesGebotSeries current={3} />

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
		font-size: 2.3rem;
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
		margin-bottom: 0.25em;
	}

	/* Blockquotes — base + source colors */
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
	blockquote.quote-source {
		border-left-color: var(--color-text-tertiary);
		background: var(--color-bg-tertiary);
	}

	.callout-warn {
		background: color-mix(in oklab, var(--nord12) 12%, var(--color-surface));
		border-left: 3px solid var(--nord12);
		padding: 0.75em 1em;
		border-radius: 0 6px 6px 0;
	}
	.aside-note {
		font-size: 0.88rem;
		color: var(--color-text-secondary);
	}

	/* Gelübde — Wesensmerkmale */
	.merkmal-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75em;
		margin: 1em 0;
	}
	.merkmal-card {
		display: flex;
		gap: 0.75em;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.9em;
	}
	.merkmal-num {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		font-size: 0.9rem;
	}
	.merkmal-label {
		font-weight: 600;
		display: block;
	}
	.merkmal-card p {
		margin: 0.25em 0 0;
		font-size: 0.88rem;
		color: var(--color-text-secondary);
		line-height: 1.45;
	}

	/* Arten — zwei Achsen */
	.axis-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6em;
		margin: 1em 0;
		align-items: stretch;
	}
	.axis-pole {
		border-radius: var(--radius-md);
		padding: 0.75em;
		text-align: center;
		border: 1px solid var(--color-border);
	}
	/* one hue per axis */
	.a-geltung {
		--ac: var(--blue);
	}
	.a-anerkennung {
		--ac: var(--green);
	}
	.axis-pole.strong {
		background: color-mix(in oklab, var(--ac) 16%, var(--color-surface));
		border-color: var(--ac);
	}
	.axis-pole.soft {
		background: color-mix(in oklab, var(--ac) 6%, var(--color-surface));
		border: 1px dashed color-mix(in oklab, var(--ac) 45%, var(--color-border));
	}
	.pole-name {
		display: block;
		font-weight: 700;
		font-size: 1.05em;
		color: var(--ac);
	}
	.axis-pole.soft .pole-name {
		color: color-mix(in oklab, var(--ac) 72%, var(--color-text-primary));
	}
	.pole-desc {
		display: block;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		margin-top: 0.25em;
		line-height: 1.35;
	}
	.axis-note {
		font-size: 0.9rem;
	}

	/* Bibel-Beispiele */
	.bible-examples {
		margin: 1.5em 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.5em 1em;
		background: var(--color-bg-secondary);
	}
	.bible-examples summary {
		cursor: pointer;
		font-weight: 600;
		padding: 0.5em 0;
	}

	/* Evangelische Räte */
	.raete-visual {
		display: flex;
		justify-content: center;
		gap: 1.5em;
		flex-wrap: wrap;
		margin-top: 1em;
	}
	.rat {
		text-align: center;
		flex: 0 1 150px;
	}
	.rat-circle {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		border: 3px solid;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 0.5em;
	}
	.rat-name {
		font-weight: 700;
		font-size: 1.05em;
	}
	.rat-cite {
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
	}
	.rat p {
		margin: 0.25em 0 0;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}

	/* Spektrum Zuwenig — Zuviel */
	.aim {
		margin: 1.5em 0 0.5em;
	}
	.aim-svg {
		display: block;
		width: 100%;
		max-width: 420px;
		height: auto;
		margin: 0 auto;
	}
	.aim-svg path {
		fill: none;
		stroke-width: 3.5;
		stroke-linecap: round;
	}
	.aim-true {
		stroke: var(--green);
	}
	.aim-under {
		stroke: var(--color-text-secondary);
		stroke-width: 2.5;
		opacity: 0.75;
	}
	.aim-over {
		stroke: var(--nord12);
	}
	.aim-gott {
		stroke: var(--green);
		stroke-width: 2.5;
		stroke-linecap: round;
		fill: none;
	}
	.aim-gott circle {
		fill: color-mix(in oklab, var(--green) 18%, transparent);
	}
	.aim-origin {
		fill: var(--color-text-secondary);
		stroke: none;
	}
	.aim-creature {
		color: var(--nord12);
	}
	.aim-title {
		font-size: 13px;
		font-weight: 700;
	}
	.aim-sub {
		fill: var(--color-text-tertiary);
		font-size: 11px;
	}
	.t-true {
		fill: var(--green);
	}
	.t-under {
		fill: var(--color-text-secondary);
	}
	.t-over {
		fill: var(--nord12);
	}

	/* Sünden-Übersicht */
	.sin-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6em;
		margin-top: 1.25em;
	}
	.sin-card {
		display: grid;
		grid-template-columns: auto 1fr auto;
		grid-template-areas: 'nr name arrow' 'nr kurz arrow';
		column-gap: 0.6em;
		align-items: center;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.8em;
		text-decoration: none;
		color: inherit;
		transition: var(--transition-normal);
	}
	.sin-card:hover {
		border-color: var(--nord12);
		scale: 1.02;
		box-shadow: var(--shadow-sm);
	}
	.sin-badge {
		grid-area: nr;
		align-self: center;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: var(--nord12);
		color: #fff;
		display: grid;
		place-items: center;
	}
	.sin-name {
		grid-area: name;
		font-weight: 700;
	}
	.sin-kurz {
		grid-area: kurz;
		font-size: 0.82rem;
		color: var(--color-text-secondary);
		line-height: 1.35;
	}
	:global(.sin-arrow) {
		grid-area: arrow;
		color: var(--color-text-tertiary);
	}

	/* Sub-sections A–E */
	.sub {
		border-top: 1px solid var(--color-border);
		padding-top: 2rem;
	}
	.sub-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}
	.sub-letter {
		width: 44px;
		height: 44px;
		flex-shrink: 0;
		border-radius: 50%;
		background: var(--nord12);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 1.3rem;
		font-family: serif;
	}
	.sub-header h2 {
		margin: 0;
	}
	.neg-list {
		padding-left: 1.5em;
	}
	.neg-list li {
		color: var(--color-text-secondary);
	}

	/* Okkult — Kontakt-Karten */
	.okkult-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.6em;
		margin: 1em 0;
	}
	.okkult-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 1em 0.5em;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4em;
	}
	.okkult-icon {
		color: var(--nord12);
	}
	.okkult-label {
		font-weight: 600;
		font-size: 0.9rem;
		line-height: 1.25;
	}
	.okkult-note {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		font-style: italic;
	}

	/* Götzendienst — falsche Götter */
	.goetzen-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6em;
		margin: 1em 0;
	}
	.goetze-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--nord12);
		border-radius: var(--radius-md);
		padding: 0.8em;
		display: flex;
		flex-direction: column;
		gap: 0.1em;
	}
	.goetze-vice {
		font-weight: 700;
	}
	.goetze-arrow {
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
		margin-top: 0.25em;
	}
	.goetze-gott {
		font-style: italic;
		color: var(--nord12);
		font-weight: 600;
	}
	.goetze-cite {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		margin-top: 0.25em;
	}

	/* Exkurs */
	.exkurs {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.5em;
	}
	.exkurs-tag {
		text-transform: uppercase;
		letter-spacing: 0.16em;
		font-size: 0.7rem;
		color: var(--color-text-tertiary);
		margin: 0;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
	}
	.exkurs h2 {
		margin-top: 0.25em;
	}

	.analogie {
		display: flex;
		align-items: stretch;
		justify-content: center;
		gap: 0.5em;
		margin: 1.25em 0;
		flex-wrap: wrap;
	}
	.analogie-side {
		flex: 1 1 0;
		min-width: 140px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.9em;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 0.2em;
	}
	.analogie-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-text-tertiary);
	}
	.analogie-thing {
		font-weight: 700;
		font-size: 1.1em;
	}
	.analogie-sub {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.analogie-link {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25em;
		flex: 0 0 auto;
	}
	.analogie-eq {
		display: flex;
		justify-content: center;
		color: var(--nord11);
	}
	.analogie-broken {
		font-size: 0.7rem;
		color: var(--nord11);
		text-align: center;
		line-height: 1.2;
	}
	.analogie-note {
		font-size: 0.9rem;
		color: var(--color-text-secondary);
	}

	.verdict {
		display: flex;
		align-items: center;
		gap: 0.75em;
		background: color-mix(in oklab, var(--nord11) 14%, var(--color-surface));
		border: 1px solid var(--nord11);
		border-radius: var(--radius-md);
		padding: 0.9em 1.1em;
		margin-top: 1.25em;
		color: var(--nord11);
	}
	.verdict p {
		margin: 0;
		color: var(--color-text-primary);
	}

	/* Mobile */
	@media (max-width: 600px) {
		h1 {
			font-size: 1.6rem;
		}
		.merkmal-grid,
		.sin-grid,
		.goetzen-grid {
			grid-template-columns: 1fr;
		}
		.analogie-link {
			flex-direction: row;
			width: 100%;
		}
	}
</style>
