<script>
	import KatecheseArticle from '$lib/components/faith/KatecheseArticle.svelte';
	import ScriptureRef from '$lib/components/faith/bible/ScriptureRef.svelte';
	import CccRef from '$lib/components/faith/ccc/CccRef.svelte';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { page } from '$app/state';
	import Mountain from '@lucide/svelte/icons/mountain';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import ScrollText from '@lucide/svelte/icons/scroll-text';

	const faithLang = $derived(page.params.faithLang ?? 'glaube');

	const tocItems = [
		{ id: 'ursprung', short: 'Ursprung', href: '#ursprung' },
		{ id: 'warum', short: 'Warum die 10 Gebote?', href: '#warum' },
		{ id: 'biblischer-text', short: 'Biblischer Text', href: '#biblischer-text' }
	];
</script>

<KatecheseArticle
	slug="einfuehrung"
	title="Die Zehn Gebote: Einführung"
	metaDescription="Ursprung, Sinn und biblischer Text der Zehn Gebote Gottes. Katechese nach P. Martin Ramm FSSP"
	headline="Die Zehn Gebote: Ursprung und Sinn"
	description="Einführung in die Zehn Gebote Gottes — Ursprung am Sinai, Sinn der Gesetzgebung und der biblische Text. Aufbereitung des Glaubenskurses (3. Hauptteil) von P. Martin Ramm FSSP."
	about="Dekalog"
	crumbName="Einführung"
	eyebrow="Einführung"
	heading="Ursprung und Sinn"
	{tocItems}
>
	<section class="topic c-blue" id="ursprung">
		<div class="topic-head">
			<span class="topic-badge"><Mountain size={24} strokeWidth={1.9} /></span>
			<h2>Ursprung</h2>
		</div>
		<p>Die Zehn Gebote (Dekalog, von <em>deca-logos</em> = zehn Worte) haben Gott selbst zum Urheber. Er hat sie dem Moses am Sinai gegeben (Ex 19–20) und auf zwei steinerne Tafeln geschrieben:</p>
		<blockquote class="quote-scripture">
			<p>Der Herr redete zu euch mitten aus dem Feuer heraus. &hellip; Er verkündete euch seinen Bund, welchen er euch zu halten gebot, die zehn Worte; und er schrieb sie auf zwei steinerne Tafeln.</p>
			<cite><ScriptureRef reference="Dt 4, 12f." /></cite>
		</blockquote>
		<p>Jesus Christus hat die Gebote bestätigt:</p>
		<blockquote class="quote-scripture">
			<p>Denkt nicht, ich sei gekommen, das Gesetz oder die Propheten aufzuheben. Ich bin nicht gekommen aufzuheben, sondern zu erfüllen.</p>
			<cite><ScriptureRef reference="Mt 5, 17" /></cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Willst du aber zum Leben eingehen, so halte die Gebote!</p>
			<cite><ScriptureRef reference="Mt 19, 17" /></cite>
		</blockquote>
	</section>

	<section class="topic c-green" id="warum">
		<div class="topic-head">
			<span class="topic-badge"><Lightbulb size={24} strokeWidth={1.9} /></span>
			<h2>Warum hat Gott die 10 Gebote gegeben?</h2>
		</div>
		<blockquote class="quote-saint">
			<p>Gott schuf den Menschen auf das Gute hin, und der Mensch wird unglücklich, wenn er die Gesetze, die um seines Glückes willen aufgestellt sind, nicht hält.</p>
			<cite>Fulton Sheen, Zur Liebe gehören Drei</cite>
		</blockquote>
		<p>Eigentlich sollte das Gewissen genügen, um die göttliche Ordnung zu erkennen. Aber seit dem Sündenfall ist die Erkenntniskraft des Menschen getrübt. Was durch den Sündenfall verdunkelt war, wird durch die Gesetzgebung auf dem Sinai erhellt. Die 10 Gebote nehmen uns nicht die Freiheit, sondern garantieren sie &mdash; sie sind Wegweiser zum zeitlichen und ewigen Glück.</p>
		<blockquote class="quote-church">
			<p>Obwohl die Gebote des Dekalogs schon der Vernunft einsichtig sind, wurden sie geoffenbart. Um zu einer vollständigen und sicheren Erkenntnis der Forderungen des natürlichen Gesetzes zu gelangen, bedurfte die sündige Menschheit dieser Offenbarung.</p>
			<cite><CccRef n={2071} /></cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Wenn du nach Weisheit verlangst, halte die Gebote.</p>
			<cite><ScriptureRef reference="Sir 1, 26" /></cite>
		</blockquote>

		<h3>Befreiung aus der Knechtschaft</h3>
		<p>Am Sinai erinnert Gott an die Befreiung aus der Knechtschaft: Die Knechtschaft des Pharao ist ein Bild für die Knechtschaft der Sünde. Entweder wir beherrschen unsere Leidenschaften oder die Leidenschaften beherrschen uns. Durch die 10 Gebote führt Gott den Menschen heraus aus dieser Knechtschaft.</p>
		<blockquote class="quote-scripture">
			<p>O hättest du doch meine Gebote beachtet, so wäre dein Glück wie ein Strom und dein Heil wie die Wogen des Meeres.</p>
			<cite><ScriptureRef reference="Is 48, 18" /></cite>
		</blockquote>
		<p>Die Gebote sind nicht nur für den Einzelnen, sondern auch das Fundament jeglicher ziviler Gemeinschaft.</p>
		<blockquote class="quote-saint">
			<p>Wo die Zehn Gebote Gottes nicht mehr gehalten werden, da werden hunderttausend Staatsgesetze keine Rechtsordnung aufrichten.</p>
			<cite>Kardinal Faulhaber</cite>
		</blockquote>
	</section>

	<section class="topic c-purple" id="biblischer-text">
		<div class="topic-head">
			<span class="topic-badge"><ScrollText size={24} strokeWidth={1.9} /></span>
			<h2>Biblischer Text</h2>
		</div>
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

	{#snippet seriesNav()}
		<nav class="series" aria-label="Die Zehn Gebote">
			<a class="series-kicker" href={`/${faithLang}/katechese`}>
				<ArrowUp size={13} /> Die Zehn Gebote &middot; <strong>Einführung</strong>
			</a>
			<div class="series-prevnext">
				<a class="pn next" href={`/${faithLang}/katechese/erstes-gebot`}>
					<span class="pn-text"><span class="pn-dir">Weiter</span>Das erste Gebot</span>
					<ArrowRight size={16} />
				</a>
			</div>
		</nav>
	{/snippet}
</KatecheseArticle>

<style>

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

	/* Zurück zur Übersicht */
	.series {
		margin-top: 3rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border);
	}
	.series-kicker {
		display: inline-flex;
		align-items: center;
		gap: 0.35em;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-text-tertiary);
		text-decoration: none;
		transition: color var(--transition-fast);
	}
	.series-kicker:hover {
		color: var(--color-primary);
	}
	.series-kicker strong {
		color: var(--color-text-secondary);
		font-weight: 700;
	}
	.series-prevnext {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1rem;
	}
	.pn {
		display: inline-flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.55em 0.9em;
		border-radius: var(--radius-pill);
		text-decoration: none;
		color: var(--color-text-secondary);
		background: var(--color-bg-secondary);
		transition: var(--transition-normal);
	}
	.pn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.pn-text {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
		font-size: 0.9rem;
		font-weight: 600;
		text-align: right;
	}
	.pn-dir {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-text-tertiary);
		font-weight: 700;
	}
</style>
