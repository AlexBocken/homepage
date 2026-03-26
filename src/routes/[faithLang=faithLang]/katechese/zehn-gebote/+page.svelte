<script>
	import { ArrowDown, ArrowLeft, EyeOff, LightbulbIcon, Bird } from 'lucide-svelte';
	let expanded = $state(null);

	function toggle(id) {
		expanded = expanded === id ? null : id;
	}

	const gebote = [
		{ nr: 1, text: 'Du sollst keine anderen Götter neben mir haben.', active: true },
		{ nr: 2, text: 'Du sollst den Namen Gottes nicht verunehren.', active: false },
		{ nr: 3, text: 'Du sollst den Sonntag heiligen.', active: false },
		{ nr: 4, text: 'Du sollst Vater und Mutter ehren, auf dass es dir wohl ergehe und du lange lebst auf Erden.', active: false },
		{ nr: 5, text: 'Du sollst nicht töten.', active: false },
		{ nr: 6, text: 'Du sollst nicht Unkeuschheit treiben.', active: false },
		{ nr: 7, text: 'Du sollst nicht stehlen.', active: false },
		{ nr: 8, text: 'Du sollst kein falsches Zeugnis geben wider deinen Nächsten.', active: false },
		{ nr: 9, text: 'Du sollst nicht Unkeusches begehren.', active: false },
		{ nr: 10, text: 'Du sollst nicht begehren deines Nächsten Hab und Gut.', active: false },
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

<div class="page">
	<header class="hero">
		<div class="tablets">
			<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="tablets-svg">
				<rect x="8" y="20" width="38" height="55" rx="12" ry="12" fill="none" stroke="currentColor" stroke-width="3"/>
				<rect x="54" y="20" width="38" height="55" rx="12" ry="12" fill="none" stroke="currentColor" stroke-width="3"/>
				<line x1="18" y1="35" x2="36" y2="35" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
				<line x1="18" y1="43" x2="36" y2="43" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
				<line x1="18" y1="51" x2="36" y2="51" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
				<line x1="64" y1="35" x2="82" y2="35" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
				<line x1="64" y1="43" x2="82" y2="43" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
				<line x1="64" y1="51" x2="82" y2="51" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
				<line x1="64" y1="59" x2="82" y2="59" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
			</svg>
		</div>
		<h1>Die Zehn Gebote Gottes</h1>
		<p class="subtitle">Glaubenskurs, 3. Hauptteil &mdash; P. Martin Ramm FSSP</p>
	</header>

	<!-- Ursprung section -->
	<section class="origin">
		<h2>Ursprung</h2>
		<div class="origin-points">
			<div class="origin-card">
				<p>Die Zehn Gebote (Dekalog, von <em>deca-logos</em> = zehn Worte) haben <strong>Gott selbst</strong> zum Urheber.</p>
			</div>
			<div class="origin-card">
				<p>Gott hat sie dem <strong>Moses am Sinai</strong> gegeben (Ex 19-20) und auf zwei steinerne Tafeln geschrieben.</p>
			</div>
			<div class="origin-card">
				<p><strong>Jesus Christus</strong> hat sie bestätigt: <q>Ich bin nicht gekommen, das Gesetz aufzuheben, sondern zu erfüllen.</q> <cite>(Mt 5, 17)</cite></p>
			</div>
		</div>
	</section>

	<!-- Warum section -->
	<section class="why">
		<h2>Warum hat Gott die 10 Gebote gegeben?</h2>
		<blockquote>
			<p>Gott schuf den Menschen auf das Gute hin, und der Mensch wird unglücklich, wenn er die Gesetze, die um seines Glückes willen aufgestellt sind, nicht hält.</p>
			<cite>Fulton Sheen, Zur Liebe gehören Drei</cite>
		</blockquote>
		<div class="why-grid">
			<div class="why-card">
				<EyeOff class="why-icon" size={40} />
				<p>Seit dem Sündenfall ist die <strong>Erkenntniskraft</strong> des Menschen getrübt.</p>
			</div>
			<div class="why-card">
				<LightbulbIcon class="why-icon" size={40} />
				<p>Was durch den Sündenfall <strong>verdunkelt</strong> war, wird durch die Gesetzgebung auf dem Sinai <strong>erhellt</strong>.</p>
			</div>
			<div class="why-card">
				<Bird class="why-icon" size={40} />
				<p>Die 10 Gebote nehmen uns nicht die <strong>Freiheit</strong>, sondern <strong>garantieren</strong> sie.</p>
			</div>
		</div>

		<p>Eigentlich sollte das Gewissen genügen, um sicher die göttliche Ordnung zu erkennen. Aber seit dem Sündenfall ist die Erkenntniskraft des Menschen getrübt.</p>
		<ul>
			<li>Damit alle sicher, leicht und ohne Irrtum die göttliche Ordnung erkennen, hat Gott sein Gesetz geoffenbart.</li>
			<li>Was durch den Sündenfall verdunkelt war, wird durch die Gesetzgebung auf dem Sinai erhellt.</li>
		</ul>
		<blockquote>
			<p>Obwohl die Gebote des Dekalogs schon der Vernunft einsichtig sind, wurden sie geoffenbart. Um zu einer vollständigen und sicheren Erkenntnis der Forderungen des natürlichen Gesetzes zu gelangen, bedurfte die sündige Menschheit dieser Offenbarung.</p>
			<cite>KKK 2071</cite>
		</blockquote>
		<blockquote>
			<p>Wenn du nach Weisheit verlangst, halte die Gebote.</p>
			<cite>Sir 1, 26</cite>
		</blockquote>

		<h3>Befreiung aus der Knechtschaft</h3>
		<p>Am Sinai erinnert Gott an die Befreiung aus der Knechtschaft:</p>
		<blockquote>
			<p>Ich bin der Herr, dein Gott, der dich aus dem Lande Ägypten, dem Hause der Knechtschaft, geführt hat.</p>
			<cite>Ex 20, 2</cite>
		</blockquote>
		<ul>
			<li>Die Knechtschaft des Pharao ist ein Bild für die <strong>Knechtschaft der Sünde</strong>. Entweder wir beherrschen unsere Leidenschaften oder die Leidenschaften beherrschen uns.</li>
			<li>Durch die 10 Gebote führt Gott den Menschen heraus aus der Knechtschaft der Sünde.</li>
		</ul>
		<p>Die 10 Gebote nehmen uns nicht die <strong>Freiheit</strong>, sondern garantieren sie. Sie sind Wegweiser sowohl zum zeitlichen als auch zum ewigen Glück.</p>
		<blockquote>
			<p>O hättest du doch meine Gebote beachtet, so wäre dein Glück wie ein Strom und dein Heil wie die Wogen des Meeres.</p>
			<cite>Is 48, 18</cite>
		</blockquote>
		<p>Sie sind nicht nur für den Einzelnen, sondern sind auch das Fundament jeglicher ziviler Gemeinschaft.</p>
		<blockquote>
			<p>Wo die Zehn Gebote Gottes nicht mehr gehalten werden, da werden hunderttausend Staatsgesetze keine Rechtsordnung aufrichten.</p>
			<cite>Kardinal Faulhaber</cite>
		</blockquote>
	</section>

	<!-- Biblischer Text -->
	<section class="biblical-text">
		<h2>Biblischer Text</h2>
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
		<p class="exodus-cite">Ex 20, 1-17</p>
	</section>

	<!-- Gebote overview -->
	<section class="commandments-overview">
		<h2>Katechetische Überlieferung</h2>
		<p class="intro-text">Ich bin der Herr, dein Gott:</p>
		<div class="commandments-list">
			{#each gebote as gebot (gebot.nr)}
				{#if gebot.active}
					<a href="#erstes-gebot" class="commandment-item active">
						<span class="commandment-nr">{gebot.nr}</span>
						<span class="commandment-text">{gebot.text}</span>
						<ArrowDown class="commandment-arrow" size={18} />
					</a>
				{:else}
					<div class="commandment-item inactive">
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

		<div class="essence">
			<p class="essence-lead">Das erste Gebot ist <strong>grundlegend</strong>. In ihm sind alle weiteren Gebote enthalten und begründet.</p>
			<div class="essence-two">
				<div class="essence-card">
					<h3>Anerkennung Gottes</h3>
					<p>Es geht um die Anerkennung Gottes und um das rechte Verhältnis des Menschen zu Gott.</p>
				</div>
				<div class="essence-card">
					<h3>Verstand &amp; Wille</h3>
					<p>Sache des <em>Verstandes</em> ist es, Gott zu <strong>erkennen</strong>. Der <em>Wille</em> muss hinzukommen, um Gott tatsächlich <strong>anzuerkennen</strong>.</p>
				</div>
			</div>
		</div>

		<!-- Drei Pflichten -->
		<div class="three-duties">
			<h3>Das erste Gebot befiehlt</h3>
			<div class="duties-visual">
				<div class="duty">
					<div class="duty-circle">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/><path d="M12 6v6l4 2"/></svg>
					</div>
					<span class="duty-label">glauben</span>
					<p>An den einen wahren Gott fest glauben</p>
				</div>
				<div class="duty-connector"></div>
				<div class="duty">
					<div class="duty-circle">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
					</div>
					<span class="duty-label">hoffen</span>
					<p>Fest auf ihn hoffen</p>
				</div>
				<div class="duty-connector"></div>
				<div class="duty">
					<div class="duty-circle">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
					</div>
					<span class="duty-label">lieben</span>
					<p>Ihn über alles lieben</p>
				</div>
			</div>
		</div>

		<!-- Tugend der Religion -->
		<div class="religion-virtue">
			<h3>Die Tugend der Religion</h3>
			<div class="etymologie">
				<span class="latin">religio</span>
				<ArrowLeft class="arrow" size={20} />
				<span class="latin">religare</span>
				<span class="equals">=</span>
				<span class="meaning">anbinden</span>
			</div>
			<p class="religion-desc">Was man liebt, daran bindet man sich. Die Religion gibt Orientierung und festen „Halt nach oben.</p>

			<div class="inner-outer">
				<div class="side-card inner">
					<h4>Die innere Seite</h4>
					<p>Die Tugend der Religion macht das Herz geneigt, Gott anzuerkennen, sich ihm anzuvertrauen, ihn über alles zu lieben und ihm zu geben, <em>„was wir ihm als Geschöpfe rechtmässig schulden</em> (KKK 2095).</p>
					<p>Die <em>religio</em> ist Teil der Kardinaltugend der <strong>Gerechtigkeit</strong>: Gott zu geben, was ihm gebührt.</p>
					<blockquote>
						<p>Gebt also dem Kaiser, was des Kaisers ist, und Gott, was Gottes ist!</p>
						<cite>Mt 22, 21</cite>
					</blockquote>
				</div>
				<div class="side-card outer">
					<h4>Die äussere Seite</h4>
					<p>Innere Haltung und äussere Übung der Religion bedingen einander &mdash; wie Seele und Leib.</p>
					<p>Wir schulden Gott nicht nur die Huldigung unserer <strong>Seele</strong>, sondern auch die unseres <strong>Leibes</strong>.</p>
					<blockquote>
						<p>Wovon das Herz voll ist, davon redet der Mund.</p>
						<cite>Mt 12, 34</cite>
					</blockquote>
				</div>
			</div>
		</div>

		<!-- Vier Akte der religio -->
		<div class="four-acts">
			<h3>Die vier Akte der <em>religio</em></h3>
			<p class="acts-intro">Aus vier elementaren Regeln des Anstandes lassen sich die vier Akte der Tugend der <em>religio</em> ableiten:</p>
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
			<blockquote class="acts-quote">
				<p>Den Herrn, deinen Gott, sollst du anbeten und ihm allein dienen.</p>
				<cite>Mt 4, 10</cite>
			</blockquote>
		</div>

		<!-- Warnung -->
		<div class="warning-section">
			<h3>Warnung vor Veräusserlichung</h3>
			<p>Die äusseren Akte der Gottesverehrung haben ihren vollen Wert nur dann, wenn sie von der rechten inneren Gesinnung getragen sind.</p>
			<blockquote>
				<p>Dieses Volk ehrt mich mit den Lippen, ihr Herz aber ist fern von mir.</p>
				<cite>Mt 15, 8</cite>
			</blockquote>
		</div>
	</section>
</div>

<style>
	.page {
		max-width: 1000px;
		margin: 0 auto;
		padding: var(--space-md);
	}

	/* Hero */
	.hero {
		text-align: center;
		padding: var(--space-xl) 0 var(--space-md);
	}
	.tablets-svg {
		width: 120px;
		color: var(--color-primary);
	}
	h1 {
		font-size: var(--text-2xl);
		margin: var(--space-sm) 0 var(--space-xs);
	}
	.subtitle {
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
	}

	/* Sections */
	section {
		margin: var(--space-2xl) 0;
	}
	h2 {
		font-size: var(--text-xl);
		margin-bottom: var(--space-md);
	}
	h3 {
		font-size: 1.3em;
		margin: var(--space-lg) 0 var(--space-sm);
		color: var(--color-primary);
	}
	h4 {
		font-size: var(--text-lg);
		margin: 0 0 var(--space-sm);
	}

	/* Origin */
	.origin-points {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-md);
	}
	.origin-card {
		background: var(--color-surface);
		padding: var(--space-lg);
		border-radius: var(--radius-md);
	}
	.origin-card p {
		margin: 0;
		line-height: 1.5;
	}

	/* Blockquotes */
	blockquote {
		border-left: 3px solid var(--color-primary);
		margin: var(--space-md) 0;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-surface);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	}
	blockquote p {
		margin: 0;
		font-style: italic;
		line-height: 1.5;
	}
	blockquote cite {
		display: block;
		margin-top: var(--space-xs);
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		font-style: normal;
	}

	/* Why */
	.why-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}
	.why-card {
		padding: var(--space-md);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		text-align: center;
	}
	:global(.why-icon) {
		color: var(--color-primary);
		margin-bottom: var(--space-sm);
	}
	.why-card p {
		margin: 0;
		line-height: 1.5;
	}
	.why ul {
		margin: var(--space-sm) 0;
		padding-left: var(--space-lg);
	}
	.why li {
		line-height: 1.6;
		margin-bottom: var(--space-xs);
	}
	.why p {
		line-height: 1.6;
		margin: var(--space-sm) 0;
	}

	/* Biblical text */
	.biblical-intro {
		font-style: italic;
		line-height: 1.6;
	}
	.exodus-list {
		padding-left: var(--space-lg);
	}
	.exodus-list li {
		line-height: 1.6;
		margin-bottom: var(--space-sm);
		font-style: italic;
	}
	.exodus-cite {
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
		margin-top: var(--space-sm);
		text-align: right;
	}

	/* Commandments overview */
	.intro-text {
		font-size: var(--text-lg);
		font-weight: bold;
		margin-bottom: var(--space-sm);
	}
	.commandments-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}
	.commandment-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-sm);
		text-decoration: none;
		color: inherit;
		transition: var(--transition-normal) ease;
	}
	.commandment-item.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-weight: 600;
		cursor: pointer;
	}
	.commandment-item.active:hover {
		background: var(--color-primary-hover);
	}
	.commandment-item.inactive {
		background: var(--color-surface);
		opacity: 0.55;
		cursor: default;
	}
	.commandment-nr {
		font-weight: bold;
		font-size: 1.2em;
		min-width: var(--space-lg);
		text-align: center;
	}
	.commandment-text {
		flex: 1;
	}
	.commandment-arrow {
		flex-shrink: 0;
	}

	/* First commandment detail */
	.first-commandment {
		scroll-margin-top: var(--space-xl);
	}
	.gebot-header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-lg);
		margin-bottom: var(--space-lg);
	}
	.gebot-nr {
		font-size: 3.5em;
		font-weight: bold;
		color: var(--color-primary);
		line-height: 1;
		font-family: serif;
	}
	.gebot-header h2 {
		border: none;
		padding: 0;
		margin: 0;
	}
	.gebot-text-full {
		font-size: var(--text-lg);
		font-style: italic;
		color: var(--color-text-secondary);
		margin-top: var(--space-xs);
	}

	/* Essence */
	.essence-lead {
		font-size: var(--text-lg);
		text-align: center;
		margin-bottom: var(--space-md);
	}
	.essence-two {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
	}
	.essence-card {
		padding: var(--space-lg);
		background: var(--color-surface);
		border-radius: var(--radius-md);
	}
	.essence-card h3 {
		margin: 0 0 var(--space-sm);
		font-size: var(--text-lg);
	}
	.essence-card p {
		margin: 0;
		line-height: 1.5;
	}

	/* Three duties */
	.duties-visual {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		gap: 0;
		flex-wrap: wrap;
		margin-top: var(--space-md);
	}
	.duty {
		text-align: center;
		flex: 0 1 160px;
		padding: var(--space-sm);
	}
	.duty-circle {
		width: 70px;
		height: 70px;
		border-radius: 50%;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto var(--space-sm);
	}
	.duty-circle svg {
		width: 36px;
		height: 36px;
	}
	.duty-label {
		display: block;
		font-weight: bold;
		font-size: 1.15em;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-primary);
	}
	.duty p {
		margin: var(--space-xs) 0 0;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.duty-connector {
		width: 40px;
		height: 2px;
		background: var(--color-primary);
		margin-top: 35px;
		flex-shrink: 0;
		opacity: 0.4;
	}

	/* Religion virtue */
	.etymologie {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		font-size: 1.2em;
		margin: var(--space-md) 0;
		flex-wrap: wrap;
	}
	.latin {
		font-style: italic;
		font-weight: bold;
		color: var(--color-primary);
	}
	.arrow, .equals {
		color: var(--color-text-tertiary);
	}
	.meaning {
		font-weight: 600;
	}
	.religion-desc {
		text-align: center;
		font-size: var(--text-base);
		color: var(--color-text-secondary);
	}

	.inner-outer {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
		margin-top: var(--space-md);
	}
	.side-card {
		padding: var(--space-lg);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}
	.side-card h4 {
		color: var(--color-primary);
	}
	.side-card p {
		line-height: 1.5;
		margin: var(--space-sm) 0;
	}
	.side-card blockquote {
		margin: var(--space-sm) 0 0;
	}

	/* Four acts */
	.acts-intro {
		margin-bottom: var(--space-md);
	}
	.acts-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-sm);
	}
	.act-card {
		background: var(--color-surface);
		border: 2px solid transparent;
		border-radius: var(--radius-md);
		padding: var(--space-md);
		cursor: pointer;
		transition: var(--transition-normal) ease;
		text-align: left;
		font: inherit;
		color: inherit;
		width: 100%;
	}
	.act-card:hover, .act-card.open {
		border-color: var(--color-primary);
	}
	.act-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}
	.act-number {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		font-size: var(--text-sm);
		flex-shrink: 0;
	}
	.act-header h4 {
		margin: 0;
		font-size: var(--text-base);
	}
	.act-desc {
		margin: var(--space-sm) 0 0;
		font-size: var(--text-sm);
		line-height: 1.4;
	}
	.act-rule {
		margin: var(--space-sm) 0 0;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		max-height: 0;
		overflow: hidden;
		transition: max-height 0.3s ease;
	}
	.act-card.open .act-rule {
		max-height: 6em;
	}

	.acts-quote {
		margin-top: var(--space-lg);
		text-align: center;
	}

	/* Warning */
	.warning-section {
		background: var(--color-surface);
		border-left: 4px solid var(--color-accent);
		padding: var(--space-lg);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		margin: var(--space-xl) 0;
	}
	.warning-section h3 {
		color: var(--color-accent);
		margin-top: 0;
	}
	.warning-section p {
		line-height: 1.5;
	}
	.warning-section blockquote {
		border-left-color: var(--color-accent);
	}

	/* Mobile */
	@media (max-width: 600px) {
		h1 { font-size: var(--text-xl); }
		.essence-two,
		.inner-outer,
		.acts-grid {
			grid-template-columns: 1fr;
		}
		.duty-connector {
			display: none;
		}
		.duties-visual {
			gap: var(--space-sm);
		}
		.gebot-header {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}
		.etymologie {
			font-size: var(--text-base);
		}
	}
</style>
