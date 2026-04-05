<script>
	import { ArrowDown, ArrowLeft } from 'lucide-svelte';
	import { page } from '$app/stores';
	let expanded = $state(null);
	const isEnglish = $derived($page.url.pathname.startsWith('/faith'));

	function toggle(id) {
		expanded = expanded === id ? null : id;
	}

	const gebote = [
		{ nr: 1, text: 'Du sollst keine anderen Götter neben mir haben.', active: true, tablet: 'god' },
		{ nr: 2, text: 'Du sollst den Namen Gottes nicht verunehren.', active: false, tablet: 'god' },
		{ nr: 3, text: 'Du sollst den Sonntag heiligen.', active: false, tablet: 'god' },
		{ nr: 4, text: 'Du sollst Vater und Mutter ehren, auf dass es dir wohl ergehe und du lange lebst auf Erden.', active: false, tablet: 'neighbor' },
		{ nr: 5, text: 'Du sollst nicht töten.', active: false, tablet: 'neighbor' },
		{ nr: 6, text: 'Du sollst nicht Unkeuschheit treiben.', active: false, tablet: 'neighbor' },
		{ nr: 7, text: 'Du sollst nicht stehlen.', active: false, tablet: 'neighbor' },
		{ nr: 8, text: 'Du sollst kein falsches Zeugnis geben wider deinen Nächsten.', active: false, tablet: 'neighbor' },
		{ nr: 9, text: 'Du sollst nicht Unkeusches begehren.', active: false, tablet: 'neighbor' },
		{ nr: 10, text: 'Du sollst nicht begehren deines Nächsten Hab und Gut.', active: false, tablet: 'neighbor' },
	];

	const akteReligio = [
		{ name: 'Anbetung', desc: 'Ich anerkenne Gottes als meinen höchsten Herrn.', icon: '1' },
		{ name: 'Dank', desc: 'Ich anerkenne Gott als meinen Schöpfer, dem ich alles verdanke.', icon: '2' },
		{ name: 'Bitte', desc: 'Ich anerkenne Gott als meinen Vater, von dem ich alles erwarte.', icon: '3' },
		{ name: 'Sühne', desc: 'Ich anerkenne Gott als meinen gütigen Erlöser.', icon: '4' },
	];
</script>

<svelte:head>
	<title>Die 10 Gebote Gottes - Bocken</title>
	<meta name="description" content="Die Zehn Gebote Gottes - Katechese nach P. Martin Ramm FSSP" />
</svelte:head>

<div class="page-wrapper">
<nav class="toc">
	<ul>
		<li><a href="#ursprung">Ursprung</a></li>
		<li><a href="#warum">Warum die 10 Gebote?</a></li>
		<li><a href="#biblischer-text">Biblischer Text</a></li>
		<li><a href="#ueberlieferung">Katechetische Überlieferung</a></li>
		<li>
			<a href="#erstes-gebot">Das Erste Gebot</a>
			<ul>
				<li><a href="#drei-pflichten">Drei Pflichten</a></li>
				<li><a href="#tugend-der-religion">Tugend der Religion</a></li>
				<li><a href="#vier-akte">Vier Akte der <i>religio</i></a></li>
				<li><a href="#warnung">Warnung</a></li>
			</ul>
		</li>
	</ul>
</nav>
<div class="page">
	<header class="hero">
		<h1>Die Zehn Gebote Gottes</h1>
		<p class="subtitle">Glaubenskurs, 3. Hauptteil &mdash; P. Martin Ramm FSSP</p>
	</header>

	{#if isEnglish}
		<p class="lang-notice">This catechesis is only available in German.</p>
	{/if}

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

	<!-- Biblischer Text -->
	<section id="biblischer-text">
		<h2>Biblischer Text</h2>
		<div class="scripture-block">
			<p class="biblical-intro">„Ich bin der Herr, dein Gott, der dich aus dem Lande Ägypten, dem Hause der Knechtschaft, geführt hat.</p>
			<ol class="exodus-list">
				<li>Du sollst keine anderen Götter neben mir haben! Du sollst dir kein Schnitzbild machen, noch irgendein Abbild von dem, was droben im Himmel oder auf der Erde unten oder im Wasser unter der Erde ist! Du sollst dich vor ihnen nicht niederwerfen und sollst sie nicht verehren; denn ich, der Herr, dein Gott, bin ein eifersüchtiger Gott, der die Schuld der Väter an den Kindern, am dritten und vierten Geschlecht, nachprüft bei denen, die mich hassen. Ich erweise aber meine Gnade bis ins tausendste Geschlecht denen, die mich lieben und meine Gebote halten.</li>
				<li>Du sollst den Namen des Herrn, deines Gottes, nicht unnütz aussprechen; denn der Herr lässt denjenigen nicht ungestraft, der seinen Namen unnütz ausspricht!</li>
				<li>Gedenke des Sabbattages, um ihn heilig zu halten. Sechs Tage lang sollst du arbeiten und all deine Geschäfte verrichten. Doch der siebte Tag ist ein Ruhetag für den Herrn, deinen Gott. Du sollst an ihm keinerlei Arbeit tun, weder du selbst noch dein Sohn, noch deine Tochter, noch dein Knecht, noch deine Magd, noch dein Vieh, noch dein Fremdling, der sich in deinen Toren befindet. Denn in sechs Tagen hat der Herr den Himmel, die Erde, das Meer und alles, was in ihnen ist, erschaffen; doch am siebten Tage ruhte er. Darum segnete der Herr den Sabbat und erklärte ihn für heilig.</li>
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

	<!-- Gebote overview -->
	<section id="ueberlieferung">
		<h2>Katechetische Überlieferung</h2>
		<p class="intro-text">Ich bin der Herr, dein Gott:</p>
		<div class="commandments-list">
			{#each gebote as gebot (gebot.nr)}
				{#if gebot.active}
					<a href="#erstes-gebot" class="commandment-item active" class:tablet-god={gebot.tablet === 'god'} class:tablet-neighbor={gebot.tablet === 'neighbor'}>
						<span class="commandment-nr">{gebot.nr}</span>
						<span class="commandment-text">{gebot.text}</span>
						<ArrowDown class="commandment-arrow" size={18} />
					</a>
				{:else}
					<div class="commandment-item inactive" class:tablet-god={gebot.tablet === 'god'} class:tablet-neighbor={gebot.tablet === 'neighbor'}>
						<span class="commandment-nr">{gebot.nr}</span>
						<span class="commandment-text">{gebot.text}</span>
					</div>
				{/if}
			{/each}
		</div>
	</section>

	<!-- 1. Gebot detail -->
	<section class="first-commandment" id="erstes-gebot">
		<div class="gebot-header">
			<span class="gebot-nr">I</span>
			<div>
				<h2>Das Erste Gebot</h2>
				<p class="gebot-text-full">Ich bin der Herr, dein Gott. Du sollst keine fremden Götter neben mir haben.</p>
			</div>
		</div>

		<p>Das erste Gebot ist grundlegend. In ihm sind alle weiteren Gebote enthalten und begründet. Es geht um die Anerkennung Gottes und um das rechte Verhältnis des Menschen zu Gott. Sache des <em>Verstandes</em> ist es, Gott zu erkennen. Der <em>Wille</em> muss hinzukommen, um Gott tatsächlich anzuerkennen und sich ihm gänzlich zu unterwerfen.</p>

		<!-- Drei Pflichten -->
		<div class="three-duties" id="drei-pflichten">
			<h3>Das erste Gebot befiehlt</h3>
			<div class="duties-visual">
				<div class="duty">
					<div class="duty-circle" style="background: var(--nord14)">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/><path d="M12 6v6l4 2"/></svg>
					</div>
					<span class="duty-label" style="color: var(--nord14)">glauben</span>
					<p>An den einen wahren Gott fest glauben</p>
				</div>
				<div class="duty-connector"></div>
				<div class="duty">
					<div class="duty-circle" style="background: var(--nord13)">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
					</div>
					<span class="duty-label" style="color: var(--nord13)">hoffen</span>
					<p>Fest auf ihn hoffen</p>
				</div>
				<div class="duty-connector"></div>
				<div class="duty">
					<div class="duty-circle" style="background: var(--nord11)">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
					</div>
					<span class="duty-label" style="color: var(--nord11)">lieben</span>
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
	.disclaimer {
		text-align: center;
		color: var(--color-text-tertiary);
		font-size: 0.75rem;
		font-style: italic;
		margin-top: 3rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border);
	}
	.toc {
		display: none;
	}
	@media (min-width: 1200px) {
		.toc {
			display: block;
			position: fixed;
			top: 4rem;
			left: max(1rem, calc((100vw - 700px) / 2 - 220px));
			width: 190px;
			font-size: 0.8rem;
			line-height: 1.4;
		}
		.toc ul {
			list-style: none;
			padding: 0;
			margin: 0;
		}
		.toc ul ul {
			padding-left: 0.75em;
			border-left: 1px solid var(--color-border);
			margin-top: 0.25em;
		}
		.toc li {
			margin-bottom: 0.3em;
		}
		.toc a {
			color: var(--color-text-tertiary);
			text-decoration: none;
			transition: color 0.15s;
		}
		.toc a:hover {
			color: var(--color-text-primary);
		}
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
	ul {
		padding-left: 1.5em;
		margin: 0.5em 0;
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

	/* Commandments overview */
	.intro-text {
		font-size: 1.1em;
		font-weight: bold;
		margin-bottom: 0.5em;
	}
	.commandments-list {
		display: flex;
		flex-direction: column;
		gap: 0.25em;
	}
	.commandment-item {
		display: flex;
		align-items: center;
		gap: 0.75em;
		padding: 0.5em 0.75em;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s ease;
	}
	.commandment-item.active {
		font-weight: 600;
		cursor: pointer;
	}
	.commandment-item.active:hover {
		filter: brightness(1.1);
	}
	.commandment-item.inactive {
		opacity: 0.6;
		cursor: default;
	}
	.commandment-item.tablet-god {
		border-left: 3px solid var(--nord12);
	}
	.commandment-item.tablet-neighbor {
		border-left: 3px solid var(--nord10);
	}
	.commandment-nr {
		font-weight: bold;
		font-size: 1.1em;
		min-width: 1.5em;
		text-align: center;
	}
	.commandment-text {
		flex: 1;
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
	.duty-circle svg {
		width: 32px;
		height: 32px;
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
