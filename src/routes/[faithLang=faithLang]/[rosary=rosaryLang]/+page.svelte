<script>
import { onMount, tick } from "svelte";
import { createLanguageContext } from "$lib/contexts/languageContext.js";
import { createPip } from "$lib/js/pip.svelte";
import PipImage from "$lib/components/faith/PipImage.svelte";
import "$lib/css/action_button.css";
import Kreuzzeichen from "$lib/components/faith/prayers/Kreuzzeichen.svelte";
import Credo from "$lib/components/faith/prayers/Credo.svelte";
import Paternoster from "$lib/components/faith/prayers/Paternoster.svelte";
import AveMaria from "$lib/components/faith/prayers/AveMaria.svelte";
import GloriaPatri from "$lib/components/faith/prayers/GloriaPatri.svelte";
import FatimaGebet from "$lib/components/faith/prayers/FatimaGebet.svelte";
import SalveRegina from "$lib/components/faith/prayers/SalveRegina.svelte";
import ReginaCaeli from "$lib/components/faith/prayers/ReginaCaeli.svelte";
import RosaryFinalPrayer from "$lib/components/faith/prayers/RosaryFinalPrayer.svelte";
import MichaelGebet from "$lib/components/faith/prayers/MichaelGebet.svelte";
import CounterButton from "$lib/components/CounterButton.svelte";
import BibleModal from "$lib/components/faith/BibleModal.svelte";
import { theologicalVirtueVerseDataDe, theologicalVirtueVerseDataEn } from "$lib/data/mysteryVerseData";
import Toggle from "$lib/components/Toggle.svelte";
import LanguageToggle from "$lib/components/faith/LanguageToggle.svelte";
import StreakCounter from "$lib/components/faith/StreakCounter.svelte";
import RosarySvg from "./RosarySvg.svelte";
import MysterySelector from "./MysterySelector.svelte";
import MysteryImageColumn from "./MysteryImageColumn.svelte";
import { mysteries, mysteriesLatin, mysteriesEnglish, mysteryTitles, mysteryTitlesEnglish, allMysteryImages, getLabels, getMysteryForWeekday, BEAD_SPACING, DECADE_OFFSET, sectionPositions } from "./rosaryData.js";
import { isEastertide, getLiturgicalSeason } from "$lib/js/easter.svelte";
import { setupScrollSync } from "./rosaryScrollSync.js";
let { data } = $props();

// Toggle for including Luminous mysteries (initialized from URL param or default)
let includeLuminous = $state(data.initialLuminous);

// Toggle for showing mystery images (initialized from URL param or default)
let showImages = $state(data.initialShowImages);

// Flag to prevent saving before we've loaded from localStorage
let hasLoadedFromStorage = $state(false);

// Create language context for prayer components (LanguageToggle will use this)
const langContext = createLanguageContext({ urlLang: data.lang, initialLatin: data.initialLatin });

// Update lang store when data.lang changes (e.g., after navigation)
$effect(() => {
	langContext.lang.set(data.lang);
});

// UI labels based on URL language (reactive)
const isEnglish = $derived(data.lang === 'en');
const labels = $derived(getLabels(isEnglish));

// Save toggle states to localStorage whenever they change (but only after initial load)
$effect(() => {
	if (typeof localStorage !== 'undefined' && hasLoadedFromStorage) {
		localStorage.setItem('rosary_includeLuminous', includeLuminous.toString());
	}
});
$effect(() => {
	if (typeof localStorage !== 'undefined' && hasLoadedFromStorage) {
		localStorage.setItem('rosary_showImages', showImages.toString());
	}
});

// Use server-computed initial values (supports no-JS via URL params)
let selectedMystery = $state(data.initialMystery);
let todaysMystery = $state(data.todaysMystery);

// Derive these values from selectedMystery so they update automatically
let currentMysteries = $derived(mysteries[selectedMystery]);
let currentMysteriesLatin = $derived(mysteriesLatin[selectedMystery]);
let currentMysteriesEnglish = $derived(mysteriesEnglish[selectedMystery]);
let currentMysteryTitles = $derived(isEnglish ? mysteryTitlesEnglish[selectedMystery] : mysteryTitles[selectedMystery]);
let currentMysteryDescriptions = $derived(data.mysteryDescriptions[selectedMystery] || []);

// Function to switch mysteries
function selectMystery(mysteryType) {
	selectedMystery = mysteryType;
	lastMysteryTarget = 'before';
}

// Build URLs preserving full state (for no-JS fallback)
function buildHref({ mystery = selectedMystery, luminous = includeLuminous, latin = data.initialLatin, images = showImages } = {}) {
	const params = new URLSearchParams();
	params.set('mystery', mystery);
	if (!luminous) params.set('luminous', '0');
	if (!latin) params.set('latin', '0');
	if (!images) params.set('images', '0');
	return `?${params.toString()}`;
}

function mysteryHref(mystery) {
	return buildHref({ mystery });
}

// Toggle hrefs navigate to opposite state (for no-JS self-submit)
let luminousToggleHref = $derived(buildHref({ luminous: !includeLuminous }));
let latinToggleHref = $derived(buildHref({ latin: !data.initialLatin }));
let imagesToggleHref = $derived(buildHref({ images: !showImages }));

// When luminous toggle changes, update today's mystery and fix invalid selection
$effect(() => {
	todaysMystery = getMysteryForWeekday(new Date(), includeLuminous);
	if (!includeLuminous && selectedMystery === 'lichtreichen') {
		const season = getLiturgicalSeason();
		const seasonalMap = { eastertide: 'glorreichen', lent: 'schmerzhaften' };
		selectedMystery = (season ? seasonalMap[season] : null) ?? todaysMystery;
	}
});

// Active section tracking
let activeSection = $state("cross");
let sectionElements = {};
let svgContainer;

// Map pater sections to the large bead they share (so SVG highlights correctly)
const svgActiveSection = $derived(
	activeSection === 'secret1_pater' ? 'lbead2' :
	activeSection.endsWith('_pater') ? `secret${parseInt(activeSection[6]) - 1}_transition` :
	activeSection
);

// Whether the rosary has mystery images (stable, doesn't change during scroll)
const hasMysteryImages = $derived(showImages && (allMysteryImages[selectedMystery]?.size ?? 0) > 0);

// Mystery image scroll target based on active section (returns decade number 1-5, or 'before'/'after')
function getMysteryScrollTarget(section) {
	if (section === 'lbead2') return 1;
	const secretMatch = section.match(/^secret(\d)/);
	if (secretMatch) {
		const num = parseInt(secretMatch[1]);
		// _transition (Gloria + Fatima) stays on the current mystery image;
		// _pater and plain decade both show the mystery they belong to
		return num;
	}
	if (section === 'final_transition') return 5;
	if (section.startsWith('final_')) return 'after';
	return 'before';
}

// Mobile PiP: which image src to show (null = hide)
function getMysteryImage(mystery, section) {
	const images = allMysteryImages[mystery];
	if (!images || images.size === 0) return null;
	const target = getMysteryScrollTarget(section);
	if (target === 'before' || target === 'after') return null;
	return images.get(target)?.src ?? null;
}
const mysteryPipSrc = $derived(getMysteryImage(selectedMystery, activeSection));

// Mobile PiP drag/enlarge
const pip = createPip({ fullscreenEnabled: true });
let rosaryPipEl = $state(null);
let lastPipSrc = $state(null);

function isMobilePip() {
	return !window.matchMedia('(min-width: 1200px)').matches;
}

$effect(() => {
	if (mysteryPipSrc) lastPipSrc = mysteryPipSrc;
});

$effect(() => {
	if (!rosaryPipEl || !isMobilePip()) return;
	if (mysteryPipSrc) {
		// Wait for DOM update so the <img> has rendered with dimensions
		tick().then(() => {
			if (rosaryPipEl) pip.show(rosaryPipEl);
		});
	} else {
		pip.hide();
	}
});

let mysteryImageContainer;
let mysteryScrollRaf = null;
let lastMysteryTarget = 'before';

function scrollMysteryImage(targetY, duration = 1200) {
	if (!mysteryImageContainer) return;
	if (mysteryScrollRaf) cancelAnimationFrame(mysteryScrollRaf);
	const startY = mysteryImageContainer.scrollTop;
	const distance = targetY - startY;
	if (Math.abs(distance) < 1) return;
	const startTime = performance.now();
	const ease = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
	const step = (now) => {
		const progress = Math.min((now - startTime) / duration, 1);
		mysteryImageContainer.scrollTop = startY + distance * ease(progress);
		if (progress < 1) mysteryScrollRaf = requestAnimationFrame(step);
		else mysteryScrollRaf = null;
	};
	mysteryScrollRaf = requestAnimationFrame(step);
}

// Scroll the mystery image column to the relevant image
const IMAGE_COL_HEADER_OFFSET = 6; // rem — keep images below the sticky header
$effect(() => {
	if (!mysteryImageContainer || !hasMysteryImages) return;
	const targetName = getMysteryScrollTarget(activeSection);
	const targetEl = mysteryImageContainer.querySelector(`[data-target="${targetName}"]`);
	if (targetEl) {
		const isEdge = targetName === 'before' || targetName === 'after';
		const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
		// Edge pads (before/after): scroll flush so previous image hides behind the header
		const offset = isEdge ? 0 : rem * IMAGE_COL_HEADER_OFFSET;
		const target = Math.max(0, targetEl.offsetTop - offset);
		// Smooth-scroll the last image away when naturally transitioning from decade 5 to 'after'
		const isNaturalEnd = targetName === 'after' && lastMysteryTarget === 5;
		if (isEdge && !isNaturalEnd) {
			// Snap instantly when jumping to top/bottom (not a natural scroll)
			if (mysteryScrollRaf) cancelAnimationFrame(mysteryScrollRaf);
			mysteryScrollRaf = null;
			mysteryImageContainer.scrollTop = target;
		} else {
			scrollMysteryImage(target);
		}
		lastMysteryTarget = targetName;
	}
});

// Counter for tracking Ave Maria progress in each decade (0-10 for each)
let decadeCounters = $state({
	secret1: 0,
	secret2: 0,
	secret3: 0,
	secret4: 0,
	secret5: 0
});

// Modal state for displaying Bible citations
let showModal = $state(false);
let selectedReference = $state('');
let selectedTitle = $state('');
let selectedVerseData = $state(null);

// Function to advance the counter for a specific decade
function advanceDecade(decadeNum) {
	const key = `secret${decadeNum}`;
	if (decadeCounters[key] < 10) {
		decadeCounters[key] += 1;

		// When we reach 10, auto-scroll to next section after a brief delay
		// and reset the counter
		if (decadeCounters[key] === 10) {
			setTimeout(() => {
				// Reset counter to clear highlighting
				decadeCounters[key] = 0;

				// Determine next section
				let nextSection;
				if (decadeNum < 5) {
					nextSection = `secret${decadeNum}_transition`;
				} else {
					nextSection = 'final_transition';
				}

				// Scroll to next section
				const nextElement = sectionElements[nextSection];
				if (nextElement) {
					const elementTop = nextElement.getBoundingClientRect().top + window.scrollY;
					const offset = parseFloat(getComputedStyle(document.documentElement).fontSize) * 3;
					window.scrollTo({ top: elementTop - offset, behavior: 'smooth' });
				}
			}, 500);
		}
	}
}

// Function to handle citation click
function handleCitationClick(reference, title = '', verseData = null) {
	selectedReference = reference;
	selectedTitle = title;
	selectedVerseData = verseData;
	showModal = true;
}

// 1 Cor 13 reference for the three theological virtue Ave Marias
const theologicalVirtueData = $derived(isEnglish ? theologicalVirtueVerseDataEn : theologicalVirtueVerseDataDe);

const pos = sectionPositions;

onMount(() => {
	// Load toggle states from localStorage only if not overridden by URL params
	if (!data.hasUrlLuminous) {
		const savedIncludeLuminous = localStorage.getItem('rosary_includeLuminous');
		if (savedIncludeLuminous !== null) {
			includeLuminous = savedIncludeLuminous === 'true';
		}
	}
	if (!data.hasUrlImages) {
		const savedShowImages = localStorage.getItem('rosary_showImages');
		if (savedShowImages !== null) {
			showImages = savedShowImages === 'true';
		}
	}

	// If no mystery was specified in URL, recompute based on loaded preferences
	if (!data.hasUrlMystery) {
		todaysMystery = getMysteryForWeekday(new Date(), includeLuminous);
		const season = getLiturgicalSeason();
		const seasonalMap = { eastertide: 'glorreichen', lent: 'schmerzhaften' };
		selectMystery(season ? seasonalMap[season] ?? todaysMystery : todaysMystery);
	}

	// Clean up URL params after hydration (state is now in component state)
	if (window.location.search) {
		history.replaceState({}, '', window.location.pathname);
	}

	// Now allow saving to localStorage
	hasLoadedFromStorage = true;

	// Mark JS as active so no-JS fallback images hide
	document.documentElement.classList.add('js-enabled');

	// PiP resize handler — show/hide when crossing the breakpoint
	const onPipResize = () => {
		if (!rosaryPipEl) return;
		if (isMobilePip() && mysteryPipSrc) {
			pip.show(rosaryPipEl);
		} else if (!isMobilePip()) {
			pip.hide();
		}
	};
	window.addEventListener('resize', onPipResize);

	// Bidirectional scroll sync between prayers, SVG, and image column
	const cleanupScrollSync = setupScrollSync({
		getSvgContainer: () => svgContainer,
		getSectionElements: () => sectionElements,
		getMysteryImageContainer: () => mysteryImageContainer,
		getActiveSection: () => activeSection,
		setActiveSection: (s) => { activeSection = s; },
	});

	return () => {
		cleanupScrollSync();
		window.removeEventListener('resize', onPipResize);
		document.documentElement.classList.remove('js-enabled');
	};
});
</script>
<style>
.page-container {
	max-width: 1400px;
	margin: 0 auto;
	padding: 2rem 1rem;
}
.page-container:has(.has-mystery-image) {
	max-width: calc(1400px + 25vw + 3rem);
}

.rosary-layout {
	position: relative;
	display: grid;
	grid-template-columns: 1fr;
	gap: 2rem;
}

@media (min-width: 900px) {
	.rosary-layout {
		grid-template-columns: clamp(250px, 30vw, 400px) 1fr;
		gap: 3rem;
	}
}

/* Sidebar with rosary visualization */
.rosary-sidebar {
	position: relative;
}

/* Mobile layout: fixed left sidebar for visualization */
@media (max-width: 900px) {
	.rosary-layout {
		grid-template-columns: clamp(20px, 10vw, 80px) 1fr;
		gap: 0;
	}

	.rosary-sidebar {
		position: sticky;
		top: 0;
		height: 100vh;
		overflow: hidden;
	}

	.rosary-visualization {
		height: 100%;
		padding: 1rem 0;
		display: flex;
		align-items: flex-start;
		justify-content: center;
	}

	/* Make SVG beads larger on mobile by scaling up and center it */
	.rosary-visualization :global(svg) {
		transform: scale(3.5);
		transform-origin: center top;
	}

	/* Disable mask on mobile to show full visualization */
	.rosary-visualization {
		-webkit-mask-image: none;
		mask-image: none;
	}

	.prayers-content {
		max-width: 100%;
		padding-left: 1rem;
	}

	/* Reduce padding in prayer cards for mobile */
	.prayer-section {
		padding: 10rem;
	}
}

.rosary-visualization {
	padding: 2rem 0;
	position: sticky;
	top: 2rem;
	max-height: calc(100vh - 2rem);
	overflow-y: auto;
	overflow-x: hidden;
	scrollbar-width: none; /* Firefox */
	-ms-overflow-style: none; /* IE and Edge */
}

/* Hide scrollbar completely */
.rosary-visualization::-webkit-scrollbar {
	display: none;
}

/* Main content area with prayers */
.prayers-content {
	scroll-snap-type: y proximity;
	max-width: 700px;
}

.prayer-section {
	scroll-snap-align: start;
	scroll-margin-top: 3rem;
	padding: 2rem;
	margin-bottom: 2rem;
	background: var(--accent-dark);
	border-radius: 8px;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	position: relative;
}

/* No-JS: highlight SVG beads when a prayer section is :target */
.rosary-layout:has(#start1:target) :global(.bead[data-section="start1"]),
.rosary-layout:has(#start2:target) :global(.bead[data-section="start2"]),
.rosary-layout:has(#start3:target) :global(.bead[data-section="start3"]),
.rosary-layout:has(#secret1:target) :global(.bead[data-section="secret1"]),
.rosary-layout:has(#secret2:target) :global(.bead[data-section="secret2"]),
.rosary-layout:has(#secret3:target) :global(.bead[data-section="secret3"]),
.rosary-layout:has(#secret4:target) :global(.bead[data-section="secret4"]),
.rosary-layout:has(#secret5:target) :global(.bead[data-section="secret5"]),
.rosary-layout:has(#final_salve:target) :global(.bead[data-section="final_salve"]),
.rosary-layout:has(#final_schlussgebet:target) :global(.bead[data-section="final_schlussgebet"]),
.rosary-layout:has(#final_michael:target) :global(.bead[data-section="final_michael"]) {
	fill: var(--nord11) !important;
	filter: drop-shadow(0 0 8px var(--nord11));
}

.rosary-layout:has(#lbead1:target) :global(.large-bead[data-section="lbead1"]),
.rosary-layout:has(#lbead2:target) :global(.large-bead[data-section="lbead2"]),
.rosary-layout:has(#secret1_pater:target) :global(.large-bead[data-section="lbead2"]),
.rosary-layout:has(#secret1_transition:target) :global(.large-bead[data-section="secret1_transition"]),
.rosary-layout:has(#secret2_pater:target) :global(.large-bead[data-section="secret1_transition"]),
.rosary-layout:has(#secret2_transition:target) :global(.large-bead[data-section="secret2_transition"]),
.rosary-layout:has(#secret3_pater:target) :global(.large-bead[data-section="secret2_transition"]),
.rosary-layout:has(#secret3_transition:target) :global(.large-bead[data-section="secret3_transition"]),
.rosary-layout:has(#secret4_pater:target) :global(.large-bead[data-section="secret3_transition"]),
.rosary-layout:has(#secret4_transition:target) :global(.large-bead[data-section="secret4_transition"]),
.rosary-layout:has(#secret5_pater:target) :global(.large-bead[data-section="secret4_transition"]),
.rosary-layout:has(#final_transition:target) :global(.large-bead[data-section="final_transition"]),
.rosary-layout:has(#final_paternoster:target) :global(.large-bead[data-section="final_paternoster"]) {
	fill: var(--nord13) !important;
	filter: drop-shadow(0 0 10px var(--nord13));
}

.rosary-layout:has(#cross:target) :global([data-section="cross"] .cross-symbol),
.rosary-layout:has(#final_cross:target) :global([data-section="final_cross"] .cross-symbol) {
	fill: var(--nord11) !important;
	filter: drop-shadow(0 0 10px var(--nord11));
}

@media (prefers-color-scheme: light) {
	.prayer-section {
		background: var(--nord5);
	}
}

.prayer-section.decade {
	scroll-snap-align: start;
	min-height: 50vh; /* Only decades need minimum height for scroll-snap */
	padding-bottom: 2rem;
}

/* Reduce min-height in monolingual mode since content is shorter */
.prayer-section.decade:has(:global(.prayer-wrapper.monolingual)) {
	min-height: 30vh;
}

@media (max-width: 900px) {
	.prayer-section.decade {
		padding-bottom: 1.5rem;
	}
	.prayer-section.decade:has(:global(.prayer-wrapper.monolingual)) {
		min-height: 20vh;
	}
	.prayer-section {
		padding: 0.5rem;
	}
}

.prayer-section h2 {
	color: var(--nord10);
	margin-bottom: 1rem;
	font-size: 1.8rem;
}

.eastertide-badge {
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	padding: 0.25em 0.6em;
	font-size: 0.75rem;
	font-weight: 600;
	border-radius: 999px;
	background-color: var(--nord14);
	color: var(--nord0);
	z-index: 1;
}

.prayer-section h3 {
	color: var(--nord11);
	margin-top: 1.5rem;
	margin-bottom: 0.75rem;
	font-size: 1.3rem;
}

/* Prayer component bilingual styling */
.prayer-section :global(p) {
	text-align: center;
	font-size: 1.25em;
}


.repeat-count {
	color: var(--nord9);
	font-style: italic;
	font-size: 0.95rem;
}

h1 {
	text-align: center;
	font-size: 3em;
	margin-bottom: 2rem;
}

/* Controls row: toggles + streak counter */
.controls-row {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1.5rem;
	margin: 0 auto 2rem auto;
}

@media (min-width: 900px) {
	.controls-row {
		flex-direction: row;
		justify-content: center;
		gap: 3rem;
	}
}

/* Toggle controls container */
.toggle-controls {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 0.5rem;
}

/* Mystery description styling */
.decade-buttons {
	display: flex;
	flex-direction: row;
	gap: 1rem;
	justify-content: flex-end;
	align-items: center;
	margin-top: 1.5rem;
}

.bible-reference-text {
	color: var(--nord8);
	font-size: 0.9rem;
	font-weight: 600;
}

@media(prefers-color-scheme: light) {
	.bible-reference-text {
		color: var(--nord10);
	}
}

.bible-reference-button {
	background: var(--nord3);
	border: 2px solid var(--nord2);
	color: var(--nord6);
	font-size: 1.2rem;
	cursor: pointer;
	padding: 0;
	width: 3rem;
	height: 3rem;
	border-radius: 50%;
	transition: all 0.2s;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.bible-reference-button:hover {
	background: var(--nord8);
	border-color: var(--nord9);
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.bible-reference-button:active {
	transform: translateY(0);
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

@media(prefers-color-scheme: light) {
	.bible-reference-button {
		background: var(--nord5);
		border-color: var(--nord4);
		color: var(--nord0);
	}

	.bible-reference-button:hover {
		background: var(--nord4);
		border-color: var(--nord3);
	}
}

/* Footnote styles */
.footnotes-section {
	margin-top: 1.5rem;
	font-size: 0.85rem;
	color: var(--nord4);
}

@media(prefers-color-scheme: light) {
	.footnotes-section {
		color: var(--nord0);
	}
}

.footnotes-section p {
	margin: 0.25rem 0;
	text-align: left;
}

.footnotes-section .symbol {
	font-weight: bold;
	margin-right: 0.5em;
	color: var(--nord11);
}

.scroll-top-button {
	margin: 2rem auto 0;
	width: fit-content;
	text-decoration: none;
}

.scroll-padding {
	height: 50vh;
}

/* Inline mystery images: visible without JS, hidden when JS takes over */
.decade-inline-image {
	margin: 1rem auto;
	text-align: center;
}

.decade-inline-image img {
	max-width: 100%;
	max-height: 40vh;
	border-radius: 8px;
}

.decade-inline-image figcaption {
	font-size: 0.85rem;
	color: var(--nord4);
	margin-top: 0.5rem;
}

:global(html.js-enabled) .decade-inline-image {
	display: none;
}

/* Mystery images: third grid column (desktop), PiP (mobile) */
.mystery-image-column {
	display: none;
}

@media (min-width: 1200px) {
	.rosary-layout.has-mystery-image {
		grid-template-columns: clamp(250px, 30vw, 400px) 1fr auto;
	}
	.mystery-image-column {
		display: block;
		position: sticky;
		top: 0;
		align-self: start;
		max-height: 100vh;
		overflow-y: hidden;
		overflow-x: hidden;
	}
}

</style>
<svelte:head>
	<title>{labels.pageTitle}</title>
	<meta name="description" content={labels.pageDescription}>
</svelte:head>

<div class="page-container" id="top">
	<h1>{labels.pageTitle}</h1>


	<h2 style="text-align:center;">{labels.mysteries}</h2>
	<!-- Mystery Selector (links for no-JS, enhanced with onclick for JS) -->
	<MysterySelector {selectedMystery} {todaysMystery} {includeLuminous} {labels} {mysteryHref} {selectMystery} season={getLiturgicalSeason()} />

	<!-- Toggle Controls & Streak Counter -->
	<div class="controls-row">
		<StreakCounter streakData={data.streakData} lang={data.lang} isLoggedIn={data.isLoggedIn} />
		<div class="toggle-controls">
			<!-- Luminous Mysteries Toggle (link for no-JS, enhanced with onclick for JS) -->
			<Toggle
				bind:checked={includeLuminous}
				label={labels.includeLuminous}
				href={luminousToggleHref}
			/>

			<Toggle
				bind:checked={showImages}
				label={labels.showImages}
				href={imagesToggleHref}
			/>

			<!-- Language Toggle (link for no-JS, enhanced with onclick for JS) -->
			<LanguageToggle
				initialLatin={data.initialLatin}
				hasUrlLatin={data.hasUrlLatin}
				href={latinToggleHref}
			/>
		</div>
	</div>

	<div class="rosary-layout" class:has-mystery-image={hasMysteryImages}>
		<!-- Sidebar: Rosary Visualization -->
		<div class="rosary-sidebar">
			<div class="rosary-visualization" bind:this={svgContainer}>
				<RosarySvg {pos} {BEAD_SPACING} {DECADE_OFFSET} activeSection={svgActiveSection} {decadeCounters} />
			</div>
		</div>

		<!-- Main Content: Prayer Sections -->
		<div class="prayers-content">
			<!-- Cross & Credo -->
			<div
				class="prayer-section"
				id="cross"
				bind:this={sectionElements.cross}
				data-section="cross"
			>
				<h2>{labels.beginning}</h2>
				<h3>{labels.signOfCross}</h3>
				<Kreuzzeichen />
				<h3>Credo</h3>
				<Credo />
				<div class="footnotes-section">
					<p><span class="symbol">♱</span>{labels.footnoteSign}</p>
					<p><span class="symbol">⚬</span>{labels.footnoteBow}</p>
				</div>
			</div>

			<!-- First Large Bead -->
			<div
				class="prayer-section"
				id="lbead1"
				bind:this={sectionElements.lbead1}
				data-section="lbead1"
			>
				<h3>{labels.ourFather}</h3>
				<Paternoster />
			</div>

			<!-- First Ave Maria (Faith) -->
			<div
				class="prayer-section"
				id="start1"
				bind:this={sectionElements.start1}
				data-section="start1"
			>
				<h3>{labels.hailMary}: {labels.faith}</h3>
				<AveMaria
					mysteryLatin="Jesus, qui adáugeat nobis fidem"
					mystery="Jesus, der in uns den Glauben vermehre"
					mysteryEnglish="Jesus, who may increase our faith"
				/>
				<div class="decade-buttons">
					<span class="bible-reference-text">{theologicalVirtueData.reference}</span>
					<button
						class="bible-reference-button"
						onclick={() => handleCitationClick(theologicalVirtueData.reference, theologicalVirtueData.title, theologicalVirtueData.verseData)}
						aria-label={labels.showBibleVerse}
					>📖</button>
				</div>
			</div>

			<!-- Second Ave Maria (Hope) -->
			<div
				class="prayer-section"
				id="start2"
				bind:this={sectionElements.start2}
				data-section="start2"
			>
				<h3>{labels.hailMary}: {labels.hope}</h3>
				<AveMaria
					mysteryLatin="Jesus, qui corróboret nobis spem"
					mystery="Jesus, der in uns die Hoffnung stärke"
					mysteryEnglish="Jesus, who may strengthen our hope"
				/>
				<div class="decade-buttons">
					<span class="bible-reference-text">{theologicalVirtueData.reference}</span>
					<button
						class="bible-reference-button"
						onclick={() => handleCitationClick(theologicalVirtueData.reference, theologicalVirtueData.title, theologicalVirtueData.verseData)}
						aria-label={labels.showBibleVerse}
					>📖</button>
				</div>
			</div>

			<!-- Third Ave Maria (Love) -->
			<div
				class="prayer-section"
				id="start3"
				bind:this={sectionElements.start3}
				data-section="start3"
			>
				<h3>{labels.hailMary}: {labels.love}</h3>
				<AveMaria
					mysteryLatin="Jesus, qui perficiat in nobis caritátem"
					mystery="Jesus, der in uns die Liebe entzünde"
					mysteryEnglish="Jesus, who may kindle our love"
				/>
				<div class="decade-buttons">
					<span class="bible-reference-text">{theologicalVirtueData.reference}</span>
					<button
						class="bible-reference-button"
						onclick={() => handleCitationClick(theologicalVirtueData.reference, theologicalVirtueData.title, theologicalVirtueData.verseData)}
						aria-label={labels.showBibleVerse}
					>📖</button>
				</div>
			</div>

			<!-- Gloria Patri before decades -->
			<div
				class="prayer-section"
				id="lbead2"
				bind:this={sectionElements.lbead2}
				data-section="lbead2"
			>
				<h3>{labels.gloriaPatri}</h3>
				<GloriaPatri />
			</div>

			<!-- 5 Decades -->
			{#each [1, 2, 3, 4, 5] as decadeNum}
				<!-- Mystery title + Pater Noster (start of decade) -->
				<div
					class="prayer-section"
					id={`secret${decadeNum}_pater`}
					bind:this={sectionElements[`secret${decadeNum}_pater`]}
					data-section={`secret${decadeNum}_pater`}
				>
					<h2>{decadeNum}. {labels.decade}: {currentMysteryTitles[decadeNum - 1]}</h2>
					<h3>{labels.ourFather}</h3>
					<Paternoster />
				</div>

				<!-- Ave Maria decade (Gesätz) -->
				<div
					class="prayer-section decade"
					id={`secret${decadeNum}`}
					bind:this={sectionElements[`secret${decadeNum}`]}
					data-section={`secret${decadeNum}`}
				>
					{#if showImages && allMysteryImages[selectedMystery]?.get(decadeNum)}
						{@const img = allMysteryImages[selectedMystery].get(decadeNum)}
						<figure class="decade-inline-image">
							<img src={img.src} alt={isEnglish ? img.title : img.titleDe} loading="lazy" />
							<figcaption>{img.artist ? `${img.artist}, ` : ''}<em>{isEnglish ? img.title : img.titleDe}</em>{img.year ? `, ${img.year}` : ''}</figcaption>
						</figure>
					{/if}

					<h3>{labels.hailMary} <span class="repeat-count">(10×)</span></h3>
					<AveMaria
						mysteryLatin={currentMysteriesLatin[decadeNum - 1]}
						mystery={currentMysteries[decadeNum - 1]}
						mysteryEnglish={currentMysteriesEnglish[decadeNum - 1]}
					/>

					<div class="decade-buttons">
						{#if currentMysteryDescriptions[decadeNum - 1]}
							{@const description = currentMysteryDescriptions[decadeNum - 1]}
							<span class="bible-reference-text">{description.reference}</span>
							<button
								class="bible-reference-button"
								onclick={() => handleCitationClick(description.reference, description.title, description.verseData)}
								aria-label={labels.showBibleVerse}
							>
								📖
							</button>
						{/if}
						<CounterButton onclick={() => advanceDecade(decadeNum)} />
					</div>
				</div>

				<!-- Transition prayers (Gloria, Fatima) -->
				{#if decadeNum < 5}
					<div
						class="prayer-section"
						id={`secret${decadeNum}_transition`}
						bind:this={sectionElements[`secret${decadeNum}_transition`]}
						data-section={`secret${decadeNum}_transition`}
					>
						<h3>{labels.gloriaPatri}</h3>
						<GloriaPatri />

						<h3>{labels.fatimaPrayer} <span class="repeat-count">({labels.optional})</span></h3>
						<FatimaGebet />
					</div>
				{/if}
			{/each}

			<!-- Final prayers after 5th decade -->
			<div
				class="prayer-section"
				id="final_transition"
				bind:this={sectionElements.final_transition}
				data-section="final_transition"
			>
				<h2>{labels.conclusion}</h2>

				<h3>{labels.gloriaPatri}</h3>
				<GloriaPatri />

				<h3>{labels.fatimaPrayer} <span class="repeat-count">({labels.optional})</span></h3>
				<FatimaGebet />
			</div>

			<div
				class="prayer-section"
				id="final_salve"
				bind:this={sectionElements.final_salve}
				data-section="final_salve"
			>
				{#if isEastertide()}
					<span class="eastertide-badge">{labels.eastertide}</span>
					<h3>Regína Cæli</h3>
					<ReginaCaeli />
				{:else}
					<h3>Salve Regina</h3>
					<SalveRegina />
				{/if}
			</div>

			<div
				class="prayer-section"
				id="final_schlussgebet"
				bind:this={sectionElements.final_schlussgebet}
				data-section="final_schlussgebet"
			>
				<h3>{labels.finalPrayer}</h3>
				<RosaryFinalPrayer />
			</div>

			<div
				class="prayer-section"
				id="final_michael"
				bind:this={sectionElements.final_michael}
				data-section="final_michael"
			>
				<h3>{labels.saintMichael}</h3>
				<MichaelGebet />
			</div>

			<div
				class="prayer-section"
				id="final_paternoster"
				bind:this={sectionElements.final_paternoster}
				data-section="final_paternoster"
			>
				<h3>{labels.ourFather}</h3>
				<Paternoster />
			</div>

			<div
				class="prayer-section"
				id="final_cross"
				bind:this={sectionElements.final_cross}
				data-section="final_cross"
			>
				<h3>{labels.signOfCross}</h3>
				<Kreuzzeichen />
				<div class="footnotes-section">
					<p><span class="symbol">♱</span>{labels.footnoteSign}</p>
				</div>
			</div>
			<a class="scroll-top-button action_button" href="#top" onclick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Scroll to top">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
			</a>
			<div class="scroll-padding"></div>
		</div>

		<!-- Third column: Mystery images (desktop scrollable sticky) -->
		<div class="mystery-image-column" bind:this={mysteryImageContainer}>
			{#if hasMysteryImages}
				<MysteryImageColumn images={allMysteryImages[selectedMystery]} {isEnglish} />
			{/if}
		</div>
	</div>

	<!-- Mobile PiP for mystery images -->
	{#if hasMysteryImages}
		<PipImage {pip} src={lastPipSrc} visible={!!mysteryPipSrc} onload={() => pip.reposition()} bind:el={rosaryPipEl} />
	{/if}
</div>

<!-- Bible citation modal -->
{#if showModal}
	<BibleModal reference={selectedReference} title={selectedTitle} verseData={selectedVerseData} lang={data.lang} onClose={() => showModal = false} />
{/if}
