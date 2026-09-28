<script>
	import KatecheseArticle from '$lib/components/faith/KatecheseArticle.svelte';
	import { jumpTo } from '$lib/js/scrollSpy.svelte';
	import ScriptureRef from '$lib/components/faith/bible/ScriptureRef.svelte';
	import CccRef from '$lib/components/faith/ccc/CccRef.svelte';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Flame from '@lucide/svelte/icons/flame';
	import Zap from '@lucide/svelte/icons/zap';
	import Ban from '@lucide/svelte/icons/ban';
	import Church from '@lucide/svelte/icons/church';
	import Users from '@lucide/svelte/icons/users';
	import Cross from '@lucide/svelte/icons/cross';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import VenetianMask from '@lucide/svelte/icons/venetian-mask';
	import Crown from '@lucide/svelte/icons/crown';
	import Languages from '@lucide/svelte/icons/languages';
	import HandHeart from '@lucide/svelte/icons/hand-heart';
	import { page } from '$app/state';
	import { ZWEITES_GEBOT } from '$lib/components/faith/KatecheseSeries.svelte';

	const faithLang = $derived(page.params.faithLang ?? 'glaube');

	const tocItems = [
		{ id: 'leiter', short: 'Die Leiter der Verstösse', href: '#leiter' },
		{ id: 'unbedacht', short: 'Unbedachtes Aussprechen', href: '#unbedacht' },
		{ id: 'fluchen', short: 'Fluchen & Verfluchen', href: '#fluchen' },
		{ id: 'verhuellt', short: 'Verhüllte Flüche', href: '#verhuellt' },
		{ id: 'blasphemie', short: 'Blasphemie', href: '#blasphemie' },
		{ id: 'sakrileg', short: 'Sakrileg', href: '#sakrileg' }
	];

	// Verstösse gegen den Namen Gottes — aufsteigend nach Schwere.
	const verstoesse = [
		{
			id: 'unbedacht',
			name: 'Unbedachtes Aussprechen',
			kurz: 'oberflächlich, banal, gedankenlos',
			Icon: Megaphone,
			stufe: 1
		},
		{
			id: 'fluchen',
			name: 'Fluchen',
			kurz: 'heilige Namen im Ausbruch des Zorns',
			Icon: Flame,
			stufe: 2
		},
		{
			id: 'fluchen',
			name: 'Verfluchen',
			kurz: 'den Fluch Gottes auf jemanden herabwünschen',
			Icon: Zap,
			stufe: 3
		},
		{
			id: 'blasphemie',
			name: 'Blasphemie',
			kurz: 'Schmähung und Verhöhnung Gottes',
			Icon: Ban,
			stufe: 4
		},
		{
			id: 'sakrileg',
			name: 'Sakrileg',
			kurz: 'vorsätzliche Entweihung des Heiligen',
			Icon: Church,
			stufe: 5
		}
	];

	// Verhüllte Flüche: der heilige Name, bis zur Unkenntlichkeit verschliffen.
	const verhuellt = [
		{
			wurzel: 'Gott',
			sprache: 'Deutschschweiz',
			Icon: Crown,
			items: [
				{ form: '„Gopf!", „Gopferdammi", „Gopfertami", „Gopferteli", „Gopferdeckel"', quelle: 'Gott verdamm mich — die milderen Formen tauschen nur die Endsilbe aus, der Anfang bleibt Gott' },
				{ form: '„Gopfridstutz", „Gottfriedstutz"', quelle: 'Der Vorname Gottfried als Deckname für Gott' },
				{ form: '„Potz!", „Potz tuusig", „Potzblitz"', quelle: '„Potz" ist verschliffenes „Gotts" (Gottes)' },
				{ form: '„Herrschaftszeiten!"', quelle: 'Verhüllung von „Herrgott"' },
				{ form: '„Grundgütiger!", „Ach du lieber Himmel"', quelle: 'Der grundgütige Gott, dessen Name weggelassen wurde' }
			]
		},
		{
			wurzel: 'Jesus',
			sprache: 'Deutschschweiz',
			Icon: Cross,
			items: [
				{ form: '„Oje", „Ojemine", „Jemine"', quelle: 'Jesu Domine — „Herr Jesus" (Anruf)' },
				{ form: '„Herrje", „Herrjemine", „Herrjeh"', quelle: 'Herr Jesus' },
				{ form: '„Jesses", „Jesses Gott", „Jesses Maria"', quelle: 'Jesus — kaum verändert, nur schnell gesprochen' },
				{ form: '„Chrüzifixnomal", „Chrüzdonnerwetter"', quelle: 'Das Kreuz Christi als Verstärkungswort' },
				{ form: '„Heilandsack", „Heiland Zack"', quelle: 'Der Heiland — und dahinter noch das Sakrament' }
			]
		},
		{
			wurzel: 'Das Allerheiligste',
			sprache: 'Deutschschweiz',
			Icon: Church,
			items: [
				{ form: '„Sackzement!", „Sack Zement"', quelle: 'Sakrament — der Zement ist reine Tarnung' },
				{ form: '„Sackerment", „Sapperment", „Sapperlot"', quelle: 'Sakrament' },
				{ form: '„Himmelsakrament", „Himmelherrgottsakrament"', quelle: 'Der Himmel, der Herrgott und das Altarsakrament in einem Atemzug' }
			]
		},
		{
			wurzel: 'Romandie',
			sprache: 'Französisch',
			Icon: Languages,
			items: [
				{ form: '„sacrebleu", „parbleu", „morbleu", „palsambleu"', quelle: '„bleu" steht für „Dieu": sacré Dieu, par Dieu, mort de Dieu, par le sang de Dieu' },
				{ form: '„bon sang!"', quelle: 'Das Blut Gottes — „sang de Dieu"' },
				{ form: '„jarnidieu", „jarnibleu"', quelle: '„je renie Dieu" — „ich verleugne Gott"' }
			]
		},
		{
			wurzel: 'Tessin',
			sprache: 'Italienisch',
			Icon: Languages,
			items: [
				{ form: '„perdinci", „perdiana", „perbacco"', quelle: 'per Dio — bei Gott; „perbacco" tauscht Gott gegen Bacchus aus' },
				{ form: '„cribbio", „cristallo!"', quelle: 'Cristo' },
				{ form: '„zio cane", „zio porco"', quelle: 'Dio cane, Dio porco — die italienische bestemmia, um zwei Buchstaben verstellt' }
			]
		},
		{
			wurzel: 'Englisch',
			sprache: 'Alltag & Netz',
			Icon: Languages,
			items: [
				{ form: '„Oh my God", „OMG"', quelle: 'Gar nicht verhüllt, nur abgekürzt und darum unhörbar geworden' },
				{ form: '„gosh", „golly"', quelle: 'God' },
				{ form: '„gee", „geez", „jeepers"', quelle: 'Jesus' },
				{ form: '„cripes", „crikey"', quelle: 'Christ' }
			]
		}
	];

	// Dieselbe Herkunft, umgekehrtes Vorzeichen: der Name als Segenswunsch.
	const segensformeln = [
		{ form: '„Grüezi", „Grüess Gott"', quelle: '„Gott grüez i" — Gott grüsse Euch' },
		{ form: '„Adie", „Ade", „Adieu"', quelle: '„à Dieu" — Gott befohlen' },
		{ form: '„Tschüss"', quelle: 'Über das Niederdeutsche aus spanisch „adiós" — zu Gott' },
		{ form: '„Bhüetdi", „Bhüetis"', quelle: '„Gott behüte dich"' },
		{ form: '„Vergälts Gott"', quelle: '„Gott vergelte es dir"' }
	];

	// Wogegen sich ein Sakrileg richten kann.
	const sakrilegZiele = [
		{ ziel: 'gegen Gott', beispiel: 'unwürdiger Sakramentsempfang, Hostienraub …', Icon: Cross },
		{ ziel: 'gegen gottgeweihte Personen', beispiel: 'Priester, Ordensleute, Bischöfe, Papst', Icon: Users },
		{ ziel: 'gegen heilige Orte oder Sachen', beispiel: 'Kirchen, Kapellen, Friedhöfe', Icon: Church }
	];
</script>

<KatecheseArticle
	slug="verstoesse-gegen-den-namen"
	title="Verstösse gegen den heiligen Namen"
	metaDescription="Unbedachtes Aussprechen, Fluchen, Verfluchen, Blasphemie und Sakrileg — die Verstösse gegen das zweite Gebot, mit den verhüllten Flüchen der Schweiz (Gopf, Sackzement, Ojemine). Katechese nach P. Martin Ramm FSSP"
	headline="Verstösse gegen den heiligen Namen"
	description="Katechese zu den Verstössen gegen das zweite Gebot — unbedachtes Aussprechen, Fluchen und Verfluchen, Blasphemie und Sakrileg, dazu die verhüllten Flüche der Deutschschweiz, der Romandie und des Tessins. Aufbereitung des Glaubenskurses (3. Hauptteil) von P. Martin Ramm FSSP."
	about="Gotteslästerung"
	crumbName="Verstösse gegen den heiligen Namen"
	eyebrow="Zweites Gebot"
	heading="Verstösse gegen den heiligen Namen"
	{tocItems}
	series={{ gebot: 'Das zweite Gebot', parts: ZWEITES_GEBOT, current: 2 }}
>
	<p class="lead">Wer <a href={`/${faithLang}/katechese/zweites-gebot`}>den Namen Gottes</a> ehrt, kann ihn auch verunehren. Die Verstösse reichen von der blossen Gedankenlosigkeit bis zur bewussten Entweihung des Heiligen.</p>

	<section class="topic c-red" id="leiter">
		<div class="topic-head">
			<span class="topic-badge"><TriangleAlert size={24} strokeWidth={1.9} /></span>
			<h2>Die Leiter der Verstösse</h2>
		</div>
		<p>Die Ehrfurcht vor der Majestät Gottes gestattet nicht, dass wir seinen Namen leichtsinnig aussprechen. Von der Gedankenlosigkeit bis zur bewussten Entweihung führt eine Leiter, die immer schwerer wiegt:</p>

		<ol class="ladder">
			{#each verstoesse as v (v.name)}
				{@const Icon = v.Icon}
				<li class="ladder-item" style="--stufe: {v.stufe}">
					<a class="ladder-link" href={'#' + v.id} onclick={(e) => jumpTo(e, v.id)}>
						<span class="ladder-badge"><Icon size={18} strokeWidth={2} /></span>
						<span class="ladder-body">
							<span class="ladder-name">{v.name}</span>
							<span class="ladder-kurz">{v.kurz}</span>
						</span>
						<span class="ladder-bar" aria-hidden="true"></span>
					</a>
				</li>
			{/each}
		</ol>
		<p class="ladder-note">Die Balken zeigen das wachsende Gewicht der Verfehlung, nicht ein kirchliches Mass.</p>
	</section>

	<section class="topic c-red" id="unbedacht">
		<div class="topic-head">
			<span class="topic-badge"><Megaphone size={22} strokeWidth={2} /></span>
			<h2>Unbedachtes Aussprechen</h2>
		</div>
		<blockquote class="quote-saint">
			<p>Diese Bitte ist freilich immer auch eine grosse Gewissenserforschung für uns: Wie gehe ich mit dem heiligen Namen Gottes um?</p>
			<cite>Benedikt XVI., Jesus von Nazareth, S. 179</cite>
		</blockquote>
		<p>Der Name Gottes darf nicht oberflächlich, banal oder gedankenlos gebraucht werden.</p>
		<blockquote class="quote-church">
			<p>Die Heiligkeit des Namens Gottes verlangt, dass man ihn nicht um belangloser Dinge willen benutzt.</p>
			<cite><CccRef n={2155} /></cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Du sollst den Namen des Herrn, deines Gottes, nicht unnütz aussprechen; denn der Herr lässt denjenigen nicht ungestraft, der seinen Namen unnütz ausspricht!</p>
			<cite><ScriptureRef reference="Ex 20, 7" /></cite>
		</blockquote>
		<p class="aside-note">Zur Gewissenserforschung gehört auch der Gebrauch sprachlich verblasster Christus-Anrufungen, die zum alltäglichen Ausdruck von Bedauern oder Überraschung geworden sind: „O Je", „Herr Je", „Jemine" (von <em>Jesu Domine</em>), „mein Gott", „Sapperlot" … &mdash; <a href="#verhuellt" onclick={(e) => jumpTo(e, 'verhuellt')}>eine Liste der verhüllten Flüche</a> folgt weiter unten.</p>
		<blockquote class="quote-church">
			<p>Der Name des Herrn ist heilig. Darum darf der Mensch ihn nicht missbrauchen. Er soll ihn in schweigender, liebender Anbetung im Gedächtnis behalten. Er darf ihn nur gebrauchen, um Gott zu preisen, zu loben und zu verherrlichen.</p>
			<cite><CccRef n={2143} /></cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Darum hat Gott ihn erhöht und ihm den Namen gegeben, der über alle Namen ist, auf dass im Namen Jesu jedes Knie sich beuge im Himmel, auf der Erde und unter der Erde, und jede Zunge bekenne: Jesus Christus ist der Herr, zur Verherrlichung Gottes, des Vaters.</p>
			<cite><ScriptureRef reference="Phil 2, 9-11" /></cite>
		</blockquote>
	</section>

	<section class="topic c-red" id="fluchen">
		<div class="topic-head">
			<span class="topic-badge"><Flame size={22} strokeWidth={2} /></span>
			<h2>Fluchen &amp; Verfluchen</h2>
		</div>
		<div class="def-grid">
			<div class="def-card">
				<span class="def-icon"><Flame size={22} strokeWidth={1.8} /></span>
				<span class="def-term">Fluchen</span>
				<p>Mehr als nur „schlimme Wörter" sagen: Man versteht darunter das Aussprechen heiliger Namen bei Ausbrüchen von Zorn.</p>
			</div>
			<div class="def-card">
				<span class="def-icon"><Zap size={22} strokeWidth={1.8} /></span>
				<span class="def-term">Verfluchen</span>
				<p>Das Herabwünschen des Fluches Gottes auf eine Person oder Sache &mdash; verbunden mit dem Wunsch, dass jemandem etwas Schlechtes zustösst.</p>
			</div>
		</div>
		<p class="aside-note">Vgl. das Beispiel des heiligen Pfarrers von Ars.</p>
	</section>

	<section class="topic c-red" id="verhuellt">
		<div class="topic-head">
			<span class="topic-badge"><VenetianMask size={22} strokeWidth={2} /></span>
			<h2>Verhüllte Flüche</h2>
		</div>
		<p>Die meisten Flüche im Mund eines Schweizers sind <em>verhüllte</em> Flüche: Der heilige Name steckt noch darin, aber so verschliffen, dass man ihn nicht mehr hört. Wer „Gopf!" sagt, meint nicht mehr, was er sagt &mdash; gesagt hat er es trotzdem. Das ist der Regelfall des unbedachten Aussprechens: keine Lästerung, aber auch keine Ehrfurcht.</p>
		<blockquote class="quote-church">
			<p>Beteuerungen, die den Namen Gottes missbräuchlich anrufen, ohne jedoch die Absicht zu lästern, sind ein Zeichen mangelnder Ehrfurcht gegenüber dem Herrn.</p>
			<cite><CccRef n={2149} /></cite>
		</blockquote>

		<div class="verh-grid">
			{#each verhuellt as g (g.wurzel)}
				{@const Icon = g.Icon}
				<div class="verh-card">
					<div class="verh-head">
						<span class="verh-icon"><Icon size={18} strokeWidth={1.9} /></span>
						<span class="verh-title">
							<span class="verh-wurzel">{g.wurzel}</span>
							<span class="verh-sprache">{g.sprache}</span>
						</span>
					</div>
					<ul class="verh-list">
						{#each g.items as it (it.form)}
							<li>
								<span class="verh-form">{it.form}</span>
								<span class="verh-quelle">{it.quelle}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<p class="aside-note">Die Reihe liesse sich verlängern: „Zum Kuckuck", „potz tuusig", „meiner Treu" &mdash; wo ein Ausruf besonders alt klingt und niemand mehr sagen kann, was er bedeutet, steht die Wahrscheinlichkeit gut, dass ein heiliger Name darunter liegt.</p>

		<div class="segen">
			<div class="verh-head">
				<span class="verh-icon"><HandHeart size={18} strokeWidth={1.9} /></span>
				<span class="verh-title">
					<span class="verh-wurzel">Derselbe Name, als Segen</span>
					<span class="verh-sprache">Nicht jede Nennung ist Missbrauch</span>
				</span>
			</div>
			<p class="segen-lead">Die Umgangssprache trägt auch das Gegenteil in sich. Der Schweizer Gruss ist ein Gebet, das man bloss verlernt hat zu hören:</p>
			<ul class="verh-list">
				{#each segensformeln as f (f.form)}
					<li>
						<span class="verh-form">{f.form}</span>
						<span class="verh-quelle">{f.quelle}</span>
					</li>
				{/each}
			</ul>
			<p class="segen-lead">Wer den Namen wieder mitmeint, macht aus der Floskel ein kurzes Gebet.</p>
		</div>

		<blockquote class="quote-scripture">
			<p>Mit ihr preisen wir Gott und den Vater; und mit ihr verfluchen wir die Menschen, die nach dem Ebenbilde Gottes gemacht sind. Aus einem und demselben Munde geht Segen und Fluch hervor. Nicht ziemt sich, meine Brüder, dass dies also geschehe.</p>
			<cite><ScriptureRef reference="Jak 3, 9-10" /></cite>
		</blockquote>

		<p class="aside-note">Es geht nicht um Silbenjagd. Wer „Gopf" sagt, ohne die Herkunft zu kennen, lästert nicht &mdash; die Unwissenheit entschuldigt. Aber was man einmal weiss, spricht man nicht mehr unbedacht aus; von da an ist es eine Entscheidung. Das Weglassen ist dabei das Mindeste; der ganze Weg ist das Umdrehen: statt der verhüllten Anrufung eine wirkliche. Bei den Jesus-Formen liegt sie besonders nah &mdash; aus „Jesses!" wird „Jesus, hilf mir", fast dieselbe Silbe. Entscheidend ist nicht die Lautstärke oder die Gemütslage, sondern ob der Name Anrede ist oder blosser Ausruf: ob ich zu ihm spreche oder nur Luft ablasse.</p>
	</section>

	<section class="topic c-red" id="blasphemie">
		<div class="topic-head">
			<span class="topic-badge"><Ban size={22} strokeWidth={2} /></span>
			<h2>Blasphemie</h2>
		</div>
		<div class="etymologie">
			<span class="latin">blasphēmía</span>
			<span class="equals">=</span>
			<span class="meaning">Schmährede, Verunglimpfung</span>
		</div>
		<p>Im christlichen Sprachgebrauch ist die Blasphemie eine Schmähung oder Verhöhnung Gottes durch Worte oder Gebärden. Die bewusste Gotteslästerung ist eine der schwersten Sünden; im Alten Bund wurde sie mit dem Tod bestraft (<ScriptureRef reference="Lev 24, 16" />).</p>
		<blockquote class="quote-church">
			<p>Gotteslästerung widerspricht der Ehrfurcht, die man Gott und seinem heiligen Namen schuldet. Sie ist in sich eine schwere Sünde.</p>
			<cite><CccRef n={2148} /> (vgl. CIC can. 1369)</cite>
		</blockquote>
	</section>

	<section class="topic c-red" id="sakrileg">
		<div class="topic-head">
			<span class="topic-badge"><Church size={22} strokeWidth={2} /></span>
			<h2>Sakrileg</h2>
		</div>
		<p>Das Sakrileg (Gottesraub) bezeichnet ursprünglich den Raub heiliger Dinge. Daraus hat sich die Bedeutung entwickelt, vorsätzlich etwas Heiliges zu entweihen. Es kann sich gegen dreierlei richten:</p>
		<div class="trio">
			{#each sakrilegZiele as z (z.ziel)}
				{@const Icon = z.Icon}
				<div class="trio-card">
					<span class="trio-icon"><Icon size={24} strokeWidth={1.8} /></span>
					<span class="trio-name">{z.ziel}</span>
					<span class="trio-note">{z.beispiel}</span>
				</div>
			{/each}
		</div>
		<p>Aus der Ehrfurcht vor Gott und seinem heiligen Namen kommt wie von selbst die Ehrfurcht vor allem, was von Gott kommt oder zu seinem Dienst bestimmt ist.</p>
		<blockquote class="quote-scripture">
			<p>Ehre Gott und achte seine Priester.</p>
			<cite><ScriptureRef reference="Sir 7, 31" /></cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Wer euch hört, der hört mich; und wer euch verachtet, der verachtet mich; wer aber mich verachtet, der verachtet den, der mich gesandt hat.</p>
			<cite><ScriptureRef reference="Lk 10, 16" /></cite>
		</blockquote>
		<p class="aside-note">Sünden gegen die Keuschheit von Personen oder mit Personen, die durch die heiligen Weihen oder die Ordensprofess Gott geweiht sind, haben zusätzlich den Charakter eines Sakrilegs.</p>
	</section>
</KatecheseArticle>

<style>
	/* Leiter der Verstösse */
	.ladder {
		list-style: none;
		margin: 1.25em 0 0.5em;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4em;
	}
	.ladder-item {
		--tint: color-mix(in oklab, var(--nord11) calc((var(--stufe) - 1) * 25%), var(--nord12));
	}
	.ladder-link {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-areas: 'badge body' 'bar bar';
		column-gap: 0.7em;
		row-gap: 0.5em;
		align-items: center;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.75em 0.9em;
		text-decoration: none;
		color: inherit;
		transition: var(--transition-normal);
	}
	.ladder-link:hover {
		border-color: var(--tint);
		scale: 1.01;
		box-shadow: var(--shadow-sm);
	}
	.ladder-badge {
		grid-area: badge;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--tint);
		color: #fff;
	}
	.ladder-body {
		grid-area: body;
		display: flex;
		flex-direction: column;
	}
	.ladder-name {
		font-weight: 700;
		font-size: 0.95rem;
	}
	.ladder-kurz {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		line-height: 1.35;
	}
	.ladder-bar {
		grid-area: bar;
		height: 4px;
		border-radius: var(--radius-pill);
		background: var(--tint);
		width: calc(var(--stufe) / 5 * 100%);
	}
	/* Verhüllte Flüche: Ausdruck und der Name, der darunter liegt. */
	.verh-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(255px, 1fr));
		gap: 0.7em;
		margin: 1.25em 0;
	}
	.verh-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-top: 3px solid var(--vc);
		border-radius: var(--radius-md);
		padding: 0.85em 0.9em;
	}
	.verh-head {
		display: flex;
		align-items: center;
		gap: 0.55em;
		margin-bottom: 0.6em;
	}
	.verh-icon {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: color-mix(in oklab, var(--vc) 16%, var(--color-surface));
		color: var(--vc);
	}
	.verh-title {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.verh-wurzel {
		display: block;
		font-weight: 700;
		font-size: 0.95rem;
		line-height: 1.2;
	}
	.verh-sprache {
		display: block;
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
	}
	.verh-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5em;
	}
	.verh-form {
		display: block;
		font-weight: 600;
		font-size: 0.87rem;
		line-height: 1.35;
	}
	.verh-quelle {
		display: block;
		position: relative;
		padding-left: 1em;
		font-size: 0.79rem;
		line-height: 1.4;
		color: var(--color-text-secondary);
	}
	.verh-quelle::before {
		content: '\21b3';
		position: absolute;
		left: 0;
		color: var(--vc);
	}

	/* Die Kehrseite: dieselben Namen als Segenswunsch. */
	.segen {
		--vc: var(--green);
		background: color-mix(in oklab, var(--green) 8%, var(--color-surface));
		border: 1px solid color-mix(in oklab, var(--green) 30%, var(--color-border));
		border-radius: var(--radius-md);
		padding: 0.9em 1em;
		margin: 1.25em 0;
	}
	.segen-lead {
		font-size: 0.87rem;
		color: var(--color-text-secondary);
		margin: 0 0 0.6em;
	}
	.segen-lead:last-child {
		margin: 0.7em 0 0;
	}
	.ladder-note {
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
		font-style: italic;
	}
</style>
