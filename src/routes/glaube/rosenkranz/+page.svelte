<script>
import { onMount } from "svelte";
import "$lib/css/christ.css";
import "$lib/css/rosenkranz.css";
import Kreuzzeichen from "$lib/components/prayers/Kreuzzeichen.svelte";
import Credo from "$lib/components/prayers/Credo.svelte";
import Paternoster from "$lib/components/prayers/Paternoster.svelte";
import AveMaria from "$lib/components/prayers/AveMaria.svelte";
import GloriaPatri from "$lib/components/prayers/GloriaPatri.svelte";
import FatimaGebet from "$lib/components/prayers/FatimaGebet.svelte";

// Mystery variations for each type of rosary
const mysteries = {
	freudenreich: [
		"Jesus, den du, o Jungfrau, vom Heiligen Geist empfangen hast.",
		"Jesus, den du, o Jungfrau, zu Elisabet getragen hast.",
		"Jesus, den du, o Jungfrau, in Betlehem geboren hast.",
		"Jesus, den du, o Jungfrau, im Tempel geopfert hast.",
		"Jesus, den du, o Jungfrau, im Tempel wiedergefunden hast."
	],
	schmerzhaften: [
		"Jesus, der für uns Blut geschwitzt hat.",
		"Jesus, der für uns gegeißelt worden ist.",
		"Jesus, der für uns mit Dornen gekrönt worden ist.",
		"Jesus, der für uns das schwere Kreuz getragen hat.",
		"Jesus, der für uns gekreuzigt worden ist."
	],
	glorreichen: [
		"Jesus, der von den Toten auferstanden ist.",
		"Jesus, der in den Himmel aufgefahren ist.",
		"Jesus, der uns den Heiligen Geist gesandt hat.",
		"Jesus, der dich, o Jungfrau, in den Himmel aufgenommen hat.",
		"Jesus, der dich, o Jungfrau, im Himmel gekrönt hat."
	],
	lichtreichen: [
		"Jesus, der von Johannes getauft worden ist.",
		"Jesus, der sich bei der Hochzeit in Kana geoffenbart hat.",
		"Jesus, der uns das Reich Gottes verkündet hat.",
		"Jesus, der auf dem Berg verklärt worden ist.",
		"Jesus, der uns die Eucharistie geschenkt hat."
	]
};

const mysteriesLatin = {
	freudenreich: [
		"Jesus, quem tu, Virgo, de Spiritu Sancto concepisti.",
		"Jesus, quem tu, Virgo, ad Elisabeth portasti.",
		"Jesus, quem tu, Virgo, Bethlehemi peperisti.",
		"Jesus, quem tu, Virgo, in templo praesentasti.",
		"Jesus, quem tu, Virgo, in templo invenisti."
	],
	schmerzhaften: [
		"Jesus, qui pro nobis sanguinem sudavit.",
		"Jesus, qui pro nobis flagellatus est.",
		"Jesus, qui pro nobis spinis coronatus est.",
		"Jesus, qui pro nobis crucem baiulavit.",
		"Jesus, qui pro nobis crucifixus est."
	],
	glorreichen: [
		"Jesus, qui resurrexit a mortuis.",
		"Jesus, qui in caelum ascendit.",
		"Jesus, qui Spiritum Sanctum misit.",
		"Jesus, qui te, Virgo, in caelum assumpsit.",
		"Jesus, qui te, Virgo, in caelis coronavit."
	],
	lichtreichen: [
		"Jesus, qui a Ioanne baptizatus est.",
		"Jesus, qui in Cana se manifestavit.",
		"Jesus, qui regnum Dei proclamavit.",
		"Jesus, qui in monte transfiguratus est.",
		"Jesus, qui Eucharistiam donavit."
	]
};

// Determine which mystery to use (for now using schmerzhaften)
let currentMysteries = mysteries.schmerzhaften;
let currentMysteriesLatin = mysteriesLatin.schmerzhaften;

// Active section tracking
let activeSection = "cross";
let sectionElements = {};
let svgContainer;

// Map sections to their vertical positions in the SVG
const sectionPositions = {
	cross: 35,
	lbead1: 80,
	start1: 110,
	start2: 135,
	start3: 160,
	lbead2: 200,
	secret1: 280,
	secret1_transition: 520,
	secret2: 560,
	secret2_transition: 800,
	secret3: 840,
	secret3_transition: 1080,
	secret4: 1120,
	secret4_transition: 1360,
	secret5: 1400,
	final_transition: 1640
};

onMount(() => {
	// Set up Intersection Observer for scroll tracking
	const options = {
		root: null,
		rootMargin: "-20% 0px -60% 0px", // Trigger when section is near top
		threshold: 0
	};

	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				activeSection = entry.target.dataset.section;

				// Scroll SVG to keep active section visible at top
				if (svgContainer && sectionPositions[activeSection] !== undefined) {
					const svg = svgContainer.querySelector('svg');
					if (!svg) return;

					const svgYPosition = sectionPositions[activeSection];
					const viewBox = svg.viewBox.baseVal;
					const svgHeight = svg.clientHeight;
					const viewBoxHeight = viewBox.height;

					// Convert SVG coordinates to pixel coordinates
					const scale = svgHeight / viewBoxHeight;
					const pixelPosition = svgYPosition * scale;

					// Position with some padding to show context above
					const targetScroll = pixelPosition - 100;

					svgContainer.scrollTo({
						top: Math.max(0, targetScroll),
						behavior: 'smooth'
					});
				}
			}
		});
	}, options);

	// Observe all prayer sections
	Object.values(sectionElements).forEach((el) => {
		if (el) observer.observe(el);
	});

	return () => observer.disconnect();
});
</script>
<style>
.page-container {
	max-width: 1400px;
	margin: 0 auto;
	padding: 2rem 1rem;
}

.rosary-layout {
	display: grid;
	grid-template-columns: 1fr;
	gap: 2rem;
}

@media (min-width: 1024px) {
	.rosary-layout {
		grid-template-columns: 400px 1fr;
		gap: 3rem;
	}
}

/* Sidebar with rosary visualization */
.rosary-sidebar {
	position: relative;
}

.rosary-visualization {
	padding: 2rem 0;
	position: sticky;
	top: 2rem;
	max-height: calc(100vh - 4rem);
	overflow-y: auto;
	overflow-x: hidden;
	scroll-behavior: smooth;
	scrollbar-width: none; /* Firefox */
	-ms-overflow-style: none; /* IE and Edge */
}

/* Hide scrollbar completely */
.rosary-visualization::-webkit-scrollbar {
	display: none;
}

.linear-rosary {
	width: 100%;
	height: auto;
	display: block;
}

/* Main content area with prayers */
.prayers-content {
	scroll-snap-type: y proximity;
	max-width: 700px;
}

.prayer-section {
	min-height: 50vh;
	scroll-snap-align: start;
	padding: 2rem;
	margin-bottom: 2rem;
	background: var(--accent-dark);
	border-radius: 8px;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

@media(prefers-color-scheme: light) {
	.prayer-section {
		background: var(--accent-light);
	}
}

.prayer-section.decade {
	scroll-snap-align: start;
}

.prayer-section h2 {
	color: var(--nord10);
	margin-bottom: 1rem;
	font-size: 1.8rem;
}

.prayer-section h3 {
	color: var(--nord11);
	margin-top: 1.5rem;
	margin-bottom: 0.75rem;
	font-size: 1.3rem;
}

.prayer-text {
	font-size: 1.15rem;
	line-height: 1.8;
	color: var(--nord4);
}

@media(prefers-color-scheme: light) {
	.prayer-text {
		color: var(--nord0);
	}
}

/* Prayer component bilingual styling */
.prayer-section :global(p) {
	text-align: center;
	font-size: 1.25em;
}

.prayer-section :global(v) {
	margin: 0;
	display: block;
}

.prayer-section :global(v:lang(la)) {
	color: var(--nord6);
}

.prayer-section :global(v:lang(de)) {
	color: grey;
}

.prayer-section :global(i) {
	font-style: normal;
	color: var(--nord11);
	font-weight: 900;
}

@media(prefers-color-scheme: light) {
	.prayer-section :global(v:lang(la)) {
		color: black;
	}
}

.prayer-section :global(v.mystery-text:lang(la)) {
	color: var(--nord11) !important;
	font-weight: 700;
	font-size: 1.1em;
}

.prayer-section :global(v.mystery-text:lang(de)) {
	color: var(--nord12) !important;
	font-weight: 700;
	font-size: 0.95em;
}

.repeat-count {
	color: var(--nord9);
	font-style: italic;
	font-size: 0.95rem;
}

/* Linear rosary bead styles */
.rosary-visualization :global(.bead) {
	fill: var(--nord10);
	transition: all 0.3s ease;
}

.rosary-visualization :global(.large-bead) {
	fill: var(--nord12);
	transition: all 0.3s ease;
}

.rosary-visualization :global(.chain) {
	stroke: var(--nord4);
	stroke-width: 2;
	fill: none;
	opacity: 0.5;
}

.rosary-visualization :global(.cross-symbol) {
	fill: var(--nord4);
	transition: all 0.3s ease;
}

/* Active states */
.rosary-visualization :global(.active-bead) {
	fill: var(--nord11) !important;
	filter: drop-shadow(0 0 8px var(--nord11));
}

.rosary-visualization :global(.active-large-bead) {
	fill: var(--nord13) !important;
	filter: drop-shadow(0 0 10px var(--nord13));
}

.rosary-visualization :global(.cross-symbol.active-cross) {
	fill: var(--nord11) !important;
	filter: drop-shadow(0 0 10px var(--nord11));
}

h1 {
	text-align: center;
	font-size: 3em;
	margin-bottom: 2rem;
}
</style>
<svelte:head>
	<title>Rosenkranz - Interaktiv</title>
	<meta name="description" content="Interaktive digitale Version des Rosenkranzes zum Mitbeten. Scrolle durch die Gebete und folge der Visualisierung.">
</svelte:head>

<div class="page-container">
	<h1>Interaktiver Rosenkranz</h1>

	<div class="rosary-layout">
		<!-- Sidebar: Rosary Visualization -->
		<div class="rosary-sidebar">
			<div class="rosary-visualization" bind:this={svgContainer}>
				<svg class="linear-rosary" viewBox="0 0 100 1700" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMin meet" style="overflow:visible" >					<!-- Vertical chain -->
					<line x1="50" y1="34" x2="50" y2="1640" class="chain" />

					<!-- Circular connection: from last bead to medal (bezier curve) -->
					<path d="M 50 1640 Q -3000 4000, -100 940 Q -1500 600, 50 235"
						class="chain"
						fill="none"
						stroke="5,5"
						opacity="0.4" />

					<!-- Cross (at top) -->
					<g id="cross-section">
						<text x="50" y="35" text-anchor="middle" font-size="50"
							class="cross-symbol" class:active-cross={activeSection === 'cross'}>♱</text>
					</g>

					<!-- First large bead (Paternoster) -->
					<circle cx="50" cy="80" r="15" class="large-bead" class:active-large-bead={activeSection === 'lbead1'} />

					<!-- Three small beads -->
					<circle cx="50" cy="110" r="10" class="bead" class:active-bead={activeSection === 'start1'} />
					<circle cx="50" cy="135" r="10" class="bead" class:active-bead={activeSection === 'start2'} />
					<circle cx="50" cy="160" r="10" class="bead" class:active-bead={activeSection === 'start3'} />

					<!-- Large bead before decades -->
					<circle cx="50" cy="200" r="15" class="large-bead" class:active-large-bead={activeSection === 'lbead2'} />

					<!-- Benedictus Medal (inline) -->
					<g id="benedictus-medal">
						<!-- Medal circle -->
						<circle cx="50" cy="240" r="20" class="medal" fill="var(--nord9)" stroke="var(--nord4)" stroke-width="2"/>

						<!-- Cross on medal (bar cross) -->
						<line x1="50" y1="228" x2="50" y2="252" stroke="var(--nord4)" stroke-width="2.5"/>
						<line x1="38" y1="240" x2="62" y2="240" stroke="var(--nord4)" stroke-width="2.5"/>

						<!-- Letters around the medal: C S S M -->
						<text x="50" y="223" text-anchor="middle" font-size="8" fill="var(--nord4)" font-weight="bold">C</text>
						<text x="50" y="260" text-anchor="middle" font-size="8" fill="var(--nord4)" font-weight="bold">S</text>
						<text x="35" y="244" text-anchor="middle" font-size="8" fill="var(--nord4)" font-weight="bold">S</text>
						<text x="65" y="244" text-anchor="middle" font-size="8" fill="var(--nord4)" font-weight="bold">M</text>
					</g>

					<!-- Decade 1: Ave Maria (10 beads) -->
					{#each Array(10) as _, i}
						<circle cx="50" cy={280 + i * 22} r="10" class="bead" class:active-bead={activeSection === 'secret1'} />
					{/each}
					<!-- Transition 1: Gloria + Fatima + Paternoster (large bead) -->
					<circle cx="50" cy="520" r="15" class="large-bead" class:active-large-bead={activeSection === 'secret1_transition'} />

					<!-- Decade 2: Ave Maria (10 beads) -->
					{#each Array(10) as _, i}
						<circle cx="50" cy={560 + i * 22} r="10" class="bead" class:active-bead={activeSection === 'secret2'} />
					{/each}
					<!-- Transition 2: Gloria + Fatima + Paternoster (large bead) -->
					<circle cx="50" cy="800" r="15" class="large-bead" class:active-large-bead={activeSection === 'secret2_transition'} />

					<!-- Decade 3: Ave Maria (10 beads) -->
					{#each Array(10) as _, i}
						<circle cx="50" cy={840 + i * 22} r="10" class="bead" class:active-bead={activeSection === 'secret3'} />
					{/each}
					<!-- Transition 3: Gloria + Fatima + Paternoster (large bead) -->
					<circle cx="50" cy="1080" r="15" class="large-bead" class:active-large-bead={activeSection === 'secret3_transition'} />

					<!-- Decade 4: Ave Maria (10 beads) -->
					{#each Array(10) as _, i}
						<circle cx="50" cy={1120 + i * 22} r="10" class="bead" class:active-bead={activeSection === 'secret4'} />
					{/each}
					<!-- Transition 4: Gloria + Fatima + Paternoster (large bead) -->
					<circle cx="50" cy="1360" r="15" class="large-bead" class:active-large-bead={activeSection === 'secret4_transition'} />

					<!-- Decade 5: Ave Maria (10 beads) -->
					{#each Array(10) as _, i}
						<circle cx="50" cy={1400 + i * 22} r="10" class="bead" class:active-bead={activeSection === 'secret5'} />
					{/each}
					<!-- Final transition: Gloria + Fatima -->
					<circle cx="50" cy="1640" r="15" class="large-bead" class:active-large-bead={activeSection === 'final_transition'} />
				</svg>
			</div>
		</div>

		<!-- Main Content: Prayer Sections -->
		<div class="prayers-content">
			<!-- Cross & Credo -->
			<div
				class="prayer-section"
				bind:this={sectionElements.cross}
				data-section="cross"
			>
				<h2>♱ Das Kreuzzeichen</h2>
				<Kreuzzeichen />
				<h3>Credo</h3>
				<Credo />
			</div>

			<!-- First Large Bead -->
			<div
				class="prayer-section"
				bind:this={sectionElements.lbead1}
				data-section="lbead1"
			>
				<h2>Vater unser</h2>
				<Paternoster />
			</div>

			<!-- First Ave Maria (Faith) -->
			<div
				class="prayer-section"
				bind:this={sectionElements.start1}
				data-section="start1"
			>
				<h2>Gegrüßet seist du Maria</h2>
				<AveMaria
					mysteryLatin="Jesus, qui fidem in nobis augeat"
					mystery="Jesus, der in uns den Glauben vermehre"
				/>
			</div>

			<!-- Second Ave Maria (Hope) -->
			<div
				class="prayer-section"
				bind:this={sectionElements.start2}
				data-section="start2"
			>
				<h2>Gegrüßet seist du Maria</h2>
				<AveMaria
					mysteryLatin="Jesus, qui spem in nobis firmet"
					mystery="Jesus, der in uns die Hoffnung stärke"
				/>
			</div>

			<!-- Third Ave Maria (Love) -->
			<div
				class="prayer-section"
				bind:this={sectionElements.start3}
				data-section="start3"
			>
				<h2>Gegrüßet seist du Maria</h2>
				<AveMaria
					mysteryLatin="Jesus, qui caritatem in nobis accendat"
					mystery="Jesus, der in uns die Liebe entzünde"
				/>
			</div>

			<!-- Gloria Patri before decades -->
			<div
				class="prayer-section"
				bind:this={sectionElements.lbead2}
				data-section="lbead2"
			>
				<h2>Gloria Patri</h2>
				<GloriaPatri />
				<h3>Vater unser</h3>
				<Paternoster />
			</div>

			<!-- 5 Decades -->
			{#each [1, 2, 3, 4, 5] as decadeNum}
				<!-- Ave Maria decade (Gesätz) -->
				<div
					class="prayer-section decade"
					bind:this={sectionElements[`secret${decadeNum}`]}
					data-section="secret{decadeNum}"
				>
					<h2>{decadeNum}. Gesätz</h2>
					<h3>Gegrüßet seist du Maria <span class="repeat-count">(10×)</span></h3>
					<AveMaria
						mysteryLatin={currentMysteriesLatin[decadeNum - 1]}
						mystery={currentMysteries[decadeNum - 1]}
					/>
				</div>

				<!-- Transition prayers (Gloria, Fatima, Paternoster) -->
				{#if decadeNum < 5}
					<div
						class="prayer-section"
						bind:this={sectionElements[`secret${decadeNum}_transition`]}
						data-section="secret{decadeNum}_transition"
					>
						<h2>Gloria Patri</h2>
						<GloriaPatri />

						<h3>Das Fatima Gebet <span class="repeat-count">(optional)</span></h3>
						<FatimaGebet />

						<h3>Vater unser</h3>
						<Paternoster />
					</div>
				{/if}
			{/each}

			<!-- Final transition after 5th decade -->
			<div
				class="prayer-section"
				bind:this={sectionElements.final_transition}
				data-section="final_transition"
			>
				<h2>Gloria Patri</h2>
				<GloriaPatri />

				<h3>Das Fatima Gebet <span class="repeat-count">(optional)</span></h3>
				<FatimaGebet />
			</div>

			<!-- Closing Prayer -->
			<div class="prayer-section">
				<h2>Abschluss</h2>
				<h3>Salve Regina</h3>
				<p class="prayer-text">
					Sei gegrüßt, o Königin, Mutter der Barmherzigkeit, unser Leben, unsre Wonne und unsere Hoffnung, sei gegrüßt...
				</p>
			</div>
		</div>
	</div>

	<!-- Information Section Below -->
	<div style="margin-top: 4rem; max-width: 800px; margin-left: auto; margin-right: auto;">
		<h2>Die verschiedenen Geheimnisse</h2>
<p>
Die verschiedenen Geheimnisse werden zu verschiedenen Anlässen gebetet.
Dabei handelt es sich hier aber um keine strikten Regeln die eingehalten werden müssen.
Es gibt auch einen Wochenplan welcher je nach Wochentag andere Geheimnisse vorschlägt.
Dieser Plan ist wie folgt:
</p>
<div class=table >
<table>
	<tbody>
	<tr>
		<td>Mo</td>
		<td>Di</td>
		<td>Mi</td>
		<td>Do</td>
		<td>Fr</td>
		<td>Sa</td>
		<td>So</td>
	</tr>
	<tr>
		<td>freudenreich</td>
		<td>schmerzhaft</td>
		<td>glorreich</td>
		<td>lichtreich</td>
		<td>schmerzhaft</td>
		<td>freudenreich</td>
		<td>glorreich</td>
	</tr>
	</tbody>
</table>
</div>
<p>
Generell überschreiben natürlich wichtige Feiertage diesen Kalender. Zum Beispiel wird regulär während der Fastenzeit stets der Rosenkranz mit den schmerzhaften Geheimnissen gebetet.
</p>

<p>
Die Integration der lichtreichen Geheimnisse hat einige Kontroversen um sich.
Ohne diese 5 Dekaden sind die 150 Gebete der drei Sätzen an Geheimnissen eine direkte Parallele zu den 150 Psalmen der Bibel.
Die Gottgegebenheit der lichtreichen Geheimnisse ist auch umstritten.
</p>
Der Plan ohne lichtreiche Geheimnisse ist wie folgt:
<p>
<div class=table>
<table>
	<tbody>
	<tr>
		<td>Mo</td>
		<td>Di</td>
		<td>Mi</td>
		<td>Do</td>
		<td>Fr</td>
		<td>Sa</td>
		<td>So</td>
	</tr>
	<tr>
		<td>freudenreich</td>
		<td>schmerzhaft</td>
		<td>glorreich</td>
		<td>freudenreich</td>
		<td>schmerzhaft</td>
		<td>glorreich</td>
		<td>glorreich</td>
	</tr>
	</tbody>
</table>
</div>



<h3>Die freudenreichen Geheimnisse <i>(über die Geburt und Kindheit Jesu)</i></h3>
<ol><!-- gaudiosa -->
	<li>... Jesus, den du, o Jungfrau, vom Heiligen Geist empfangen hast.</li>
	<li>... Jesus, den du, o Jungfrau, zu Elisabet getragen hast.</li>
	<li>... Jesus, den du, o Jungfrau, in Betlehem geboren hast.</li>
	<li>... Jesus, den du, o Jungfrau, im Tempel geopfert hast.</li>
	<li>... Jesus, den du, o Jungfrau, im Tempel wiedergefunden hast.</li>
</ol>

<h3>Die lichtreichen Geheimnisse <i>(über das Wirken Jesu)</i></h3>
<ol>
	<li>... Jesus, der von Johannes getauft worden ist.</li>
	<li>... Jesus, der sich bei der Hochzeit in Kana geoffenbart hat.</li>
	<li>... Jesus, der uns das Reich Gottes verkündet hat.</li>
	<li>... Jesus, der auf dem Berg verklärt worden ist.</li>
	<li>... Jesus, der uns die Eucharistie geschenkt hat.</li>
</ol>

<h3>Die schmerzhaften Geheimnisse <i>(über das Leiden und Sterben Jesu)</i></h3>
<ol><!-- dolorosa -->
	<li>... Jesus, der für uns Blut geschwitzt hat.</li>
	<li>... Jesus, der für uns gegeißelt worden ist.</li>
	<li>... Jesus, der für uns mit Dornen gekrönt worden ist.</li>
	<li>... Jesus, der für uns das schwere Kreuz getragen hat.</li>
	<li>... Jesus, der für uns gekreuzigt worden ist.</li>
</ol>


<h3>Die glorreichen Geheimnisse <i>(über die Auferstehung Jesu)</i></h3>
<ol><!-- gloriosa -->
	<li>... Jesus, der von den Toten auferstanden ist.</li>
	<li>... Jesus, der in den Himmel aufgefahren ist.</li>
	<li>... Jesus, der uns den Heiligen Geist gesandt hat.</li>
	<li>... Jesus, der dich, o Jungfrau, in den Himmel aufgenommen hat.</li>
	<li>... Jesus, der dich, o Jungfrau, im Himmel gekrönt hat.</li>
</ol>

<h2>Lateinische Geheimnisse</h2>
<p>
Anders als die Geheimnisse in Deutsch ist es üblich beim beten des Rosenkranzes in Latein die Geheimnisse am Anfang der Dekade einmal zu sagen und dann während den Ave Marias diese nur still zu reflektieren.
</p>

<h3>Mystéria gaudiósa (freudenreich)</h3>
<ol lang=la>
	<li>Mystérium gaudiósum prímum: annúntiátió</li>
	<li>Mystérium gaudiósum secundum: vísitátió</li>
	<li>Mystérium gaudiósum tertium: nátívitás Jésú</li>
	<li>Mystérium gaudiósum quártum: præsentátió ínfantis Jésú in templó</li>
	<li>Mystérium gaudiósum quíntum: inventió puerí Jésú in templó</li>
</ol>

<h3>Mystéria dolórósa (schmerzhaft)</h3>
<ol lang=la>
	<li>Mystérium dolórósum prímum: agónía in hortó et sūdor sanguinis</li>
	<li>Mystérium dolórósum secundum: flagellátió</li>
	<li>Mystérium dolórósum tertium: corónátió spínea</li>
	<li>Mystérium dolórósum quártum: via crucis</li>
	<li>Mystérium dolórósum quíntum: mors in cruc</li>
</ol>

<h3>Mystéria glóriósa (glorreich)</h3>
<ol lang=la>
	<li>Mystérium glóriósum prímum: resurréctió</li>
	<li>Mystérium glóriósum secundum: ascénsió</li>
	<li>Mystérium glóriósum tertium: déscénsus spíritūs sánctí</li>
	<li>Mystérium glóriósum quártum: assūmptió beátæ virginis maríæ in cælum</li>
	<li>Mystérium glóriósum quíntum: mundí régnum beátæ virginí maríæ in cælís délátu</li>
</ol>
	</div>
</div>
