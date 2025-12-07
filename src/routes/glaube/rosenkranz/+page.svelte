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
import SalveRegina from "$lib/components/prayers/SalveRegina.svelte";
import BenedictusMedal from "$lib/components/BenedictusMedal.svelte";
import CounterButton from "$lib/components/CounterButton.svelte";

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

// Toggle for including Luminous mysteries
let includeLuminous = true;

// Function to get the appropriate mystery for a given weekday
function getMysteryForWeekday(date, includeLuminous) {
	const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

	if (includeLuminous) {
		// With Luminous mysteries schedule
		const schedule = {
			0: 'glorreichen',    // Sunday
			1: 'freudenreich',   // Monday
			2: 'schmerzhaften',  // Tuesday
			3: 'glorreichen',    // Wednesday
			4: 'lichtreichen',   // Thursday
			5: 'schmerzhaften',  // Friday
			6: 'freudenreich'    // Saturday
		};
		return schedule[dayOfWeek];
	} else {
		// Without Luminous mysteries schedule
		const schedule = {
			0: 'glorreichen',    // Sunday
			1: 'freudenreich',   // Monday
			2: 'schmerzhaften',  // Tuesday
			3: 'glorreichen',    // Wednesday
			4: 'freudenreich',   // Thursday
			5: 'schmerzhaften',  // Friday
			6: 'glorreichen'     // Saturday
		};
		return schedule[dayOfWeek];
	}
}

// Determine which mystery to use based on current weekday
let selectedMystery = getMysteryForWeekday(new Date(), includeLuminous);
let currentMysteries = mysteries[selectedMystery];
let currentMysteriesLatin = mysteriesLatin[selectedMystery];

// Function to switch mysteries
function selectMystery(mysteryType) {
	selectedMystery = mysteryType;
	currentMysteries = mysteries[mysteryType];
	currentMysteriesLatin = mysteriesLatin[mysteryType];
}

// Function to handle toggle change
function handleToggleChange() {
	// Recalculate the default mystery for today
	const todaysMystery = getMysteryForWeekday(new Date(), includeLuminous);
	// Update to today's mystery
	selectMystery(todaysMystery);
}

// Active section tracking
let activeSection = "cross";
let sectionElements = {};
let svgContainer;

// Counter for tracking Ave Maria progress in each decade (0-10 for each)
let decadeCounters = {
	secret1: 0,
	secret2: 0,
	secret3: 0,
	secret4: 0,
	secret5: 0
};

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

// Map sections to their vertical positions in the SVG
const sectionPositions = {
	cross: 35,
	lbead1: 80,
	start1: 110,
	start2: 135,
	start3: 160,
	lbead2: 200,
	secret1: 270,
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
	let scrollLock = null; // Track which side initiated the scroll: 'prayer', 'svg', or 'click'
	let scrollLockTimeout = null;

	const setScrollLock = (source, duration = 1000) => {
		scrollLock = source;
		clearTimeout(scrollLockTimeout);
		scrollLockTimeout = setTimeout(() => {
			scrollLock = null;
		}, duration);
	};

	// Check if browser supports smooth scrolling
	// Test both CSS property and actual scrollTo API support
	const supportsNativeSmoothScroll = (() => {
		if (!('scrollBehavior' in document.documentElement.style)) {
			return false;
		}
		// Additional check: some browsers have the CSS property but not the JS API
		try {
			const testElement = document.createElement('div');
			testElement.scrollTo({ top: 0, behavior: 'smooth' });
			return true;
		} catch (e) {
			return false;
		}
	})();

	// Smooth scroll polyfill for window scrolling
	const smoothScrollTo = (targetY, duration = 500) => {
		if (supportsNativeSmoothScroll) {
			try {
				window.scrollTo({ top: targetY, behavior: 'smooth' });
				return;
			} catch (e) {
				// Fall through to polyfill
			}
		}

		const startY = window.scrollY || window.pageYOffset;
		const distance = targetY - startY;
		const startTime = performance.now();

		const easeInOutQuad = (t) => {
			return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
		};

		const scroll = (currentTime) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const ease = easeInOutQuad(progress);
			window.scrollTo(0, startY + distance * ease);

			if (progress < 1) {
				requestAnimationFrame(scroll);
			}
		};

		requestAnimationFrame(scroll);
	};

	// Smooth scroll polyfill for element scrolling (for SVG container)
	const smoothScrollElement = (element, targetY, duration = 500) => {
		if (supportsNativeSmoothScroll) {
			try {
				element.scrollTo({ top: targetY, behavior: 'smooth' });
				return;
			} catch (e) {
				// Fall through to polyfill
			}
		}

		const startY = element.scrollTop;
		const distance = targetY - startY;
		const startTime = performance.now();

		const easeInOutQuad = (t) => {
			return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
		};

		const scroll = (currentTime) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const ease = easeInOutQuad(progress);
			element.scrollTop = startY + distance * ease;

			if (progress < 1) {
				requestAnimationFrame(scroll);
			}
		};

		requestAnimationFrame(scroll);
	};

	// Set up Intersection Observer for scroll tracking (prayers -> SVG)
	const options = {
		root: null,
		rootMargin: "-20% 0px -60% 0px", // Trigger when section is near top
		threshold: 0
	};

	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting && scrollLock !== 'svg' && scrollLock !== 'click') {
				activeSection = entry.target.dataset.section;

				// Scroll SVG to keep active section visible at top
				if (svgContainer && sectionPositions[activeSection] !== undefined) {
					const svg = svgContainer.querySelector('svg');
					if (!svg) return;

					const svgYPosition = sectionPositions[activeSection];
					const viewBox = svg.viewBox.baseVal;
					const svgHeight = svg.clientHeight;
					const viewBoxHeight = viewBox.height;

					// Get CSS transform scale (3.5 on mobile, 1 on desktop)
					const computedStyle = window.getComputedStyle(svg);
					const matrix = new DOMMatrix(computedStyle.transform);
					const cssScale = matrix.a || 1;

					// Convert SVG coordinates to pixel coordinates
					const scale = (svgHeight / viewBoxHeight) * cssScale;
					const pixelPosition = svgYPosition * scale;

					// Position with some padding to show context above
					const targetScroll = pixelPosition - 100;

					setScrollLock('prayer');
					smoothScrollElement(svgContainer, Math.max(0, targetScroll));
				}
			}
		});
	}, options);

	// Observe all prayer sections
	Object.values(sectionElements).forEach((el) => {
		if (el) observer.observe(el);
	});

	// Detect when user scrolls past all prayers and snap SVG to bottom or top
	const handleWindowScroll = () => {
		if (scrollLock === 'svg' || scrollLock === 'click' || !svgContainer) return;

		const viewportHeight = window.innerHeight;

		// Get the first and final prayer sections
		const firstSection = sectionElements.cross;
		const finalSection = sectionElements.final_transition;
		if (!firstSection || !finalSection) return;

		const firstSectionRect = firstSection.getBoundingClientRect();
		const finalSectionRect = finalSection.getBoundingClientRect();

		// Check if we've scrolled above the first section (it's completely below viewport)
		if (firstSectionRect.top > viewportHeight * 0.6) {
			// Scroll SVG to top
			if (svgContainer.scrollTop > 10) { // Only if not already at top
				smoothScrollElement(svgContainer, 0);
			}
		}
		// Check if we've scrolled past the final section (it's completely above viewport)
		else if (finalSectionRect.bottom < viewportHeight * 0.4) {
			// Scroll SVG to bottom
			const maxScroll = svgContainer.scrollHeight - svgContainer.clientHeight;
			if (svgContainer.scrollTop < maxScroll - 10) { // Only if not already at bottom
				smoothScrollElement(svgContainer, maxScroll);
			}
		}
	};

	window.addEventListener('scroll', handleWindowScroll, { passive: true });

	// Debounce SVG scroll handler to avoid excessive updates
	let svgScrollTimeout = null;
	const handleSvgScroll = () => {
		if (scrollLock === 'prayer' || scrollLock === 'click' || !svgContainer) return;

		clearTimeout(svgScrollTimeout);
		svgScrollTimeout = setTimeout(() => {
			const svg = svgContainer.querySelector('svg');
			if (!svg) return;

			const scrollTop = svgContainer.scrollTop;
			const viewBox = svg.viewBox.baseVal;
			const svgHeight = svg.clientHeight;
			const viewBoxHeight = viewBox.height;

			// Get CSS transform scale (3.5 on mobile, 1 on desktop)
			const computedStyle = window.getComputedStyle(svg);
			const matrix = new DOMMatrix(computedStyle.transform);
			const cssScale = matrix.a || 1;

			const scale = (svgHeight / viewBoxHeight) * cssScale;

			// Convert scroll position back to SVG coordinates
			const svgY = scrollTop / scale;

			// Find the closest section based on scroll position
			let closestSection = 'cross';
			let closestDistance = Infinity;

			for (const [section, position] of Object.entries(sectionPositions)) {
				const distance = Math.abs(svgY - position);
				if (distance < closestDistance) {
					closestDistance = distance;
					closestSection = section;
				}
			}

			// Scroll to the corresponding prayer section
			if (closestSection !== activeSection && sectionElements[closestSection]) {
				activeSection = closestSection;
				setScrollLock('svg');

				// Calculate scroll position with offset for spacing at top
				const element = sectionElements[closestSection];
				const elementTop = element.getBoundingClientRect().top + window.scrollY;
				const offset = parseFloat(getComputedStyle(document.documentElement).fontSize) * 3; // 3em in pixels

				smoothScrollTo(elementTop - offset);
			}
		}, 150); // Debounce by 150ms
	};

	if (svgContainer) {
		svgContainer.addEventListener('scroll', handleSvgScroll);
	}

	// Handle clicks on SVG elements to jump to prayers
	const handleSvgClick = (e) => {
		// Find the clicked element or its parent with a data-section attribute
		let target = e.target;
		while (target && target !== svgContainer) {
			const section = target.dataset.section;
			if (section && sectionElements[section]) {
				// Update active section immediately
				activeSection = section;

				// Lock scrolling for clicks
				setScrollLock('click', 1500);

				// Scroll the SVG visualization to the clicked section
				if (sectionPositions[section] !== undefined) {
					const svg = svgContainer.querySelector('svg');
					if (svg) {
						const svgYPosition = sectionPositions[section];
						const viewBox = svg.viewBox.baseVal;
						const svgHeight = svg.clientHeight;
						const viewBoxHeight = viewBox.height;

						// Get CSS transform scale (3.5 on mobile, 1 on desktop)
						const computedStyle = window.getComputedStyle(svg);
						const matrix = new DOMMatrix(computedStyle.transform);
						const cssScale = matrix.a || 1;

						// Convert SVG coordinates to pixel coordinates
						const scale = (svgHeight / viewBoxHeight) * cssScale;
						const pixelPosition = svgYPosition * scale;

						// Position with some padding to show context above
						const targetScroll = pixelPosition - 100;

						smoothScrollElement(svgContainer, Math.max(0, targetScroll));
					}
				}

				// Scroll the prayers to the corresponding section
				const element = sectionElements[section];
				const elementTop = element.getBoundingClientRect().top + window.scrollY;
				const offset = parseFloat(getComputedStyle(document.documentElement).fontSize) * 3;

				smoothScrollTo(elementTop - offset);

				break;
			}
			target = target.parentElement;
		}
	};

	const svg = svgContainer?.querySelector('svg');
	if (svg) {
		svg.addEventListener('click', handleSvgClick);
		// Make it clear elements are clickable
		svg.style.cursor = 'pointer';
	}

	return () => {
		observer.disconnect();
		clearTimeout(scrollLockTimeout);
		clearTimeout(svgScrollTimeout);
		window.removeEventListener('scroll', handleWindowScroll);
		if (svgContainer) {
			svgContainer.removeEventListener('scroll', handleSvgScroll);
		}
		if (svg) {
			svg.removeEventListener('click', handleSvgClick);
		}
	};
});
</script>
<style>
.page-container {
	max-width: 1400px;
	margin: 0 auto;
	padding: 2rem 1rem;
}

.rosary-layout {
	position: relative;
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

/* Mobile layout: fixed left sidebar for visualization */
@media (max-width: 1023px) {
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
	.rosary-visualization svg {
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
	/* Mask to hide portions where curve goes off-screen (left side) */
	/* Using radial gradient to create smooth fade at both connection points */
	-webkit-mask-image:
		linear-gradient(to right, transparent 0%, black 20%, black 100%),
		radial-gradient(ellipse 200px 150px at 50% 0%, transparent 0%, black 40%),
		radial-gradient(ellipse 200px 150px at 50% 100%, transparent 0%, black 40%);
	-webkit-mask-composite: source-in;
	mask-image:
		linear-gradient(to right, transparent 0%, black 20%, black 100%),
		radial-gradient(ellipse 200px 150px at 50% 0%, transparent 0%, black 40%),
		radial-gradient(ellipse 200px 150px at 50% 100%, transparent 0%, black 40%);
	mask-composite: intersect;
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
	scroll-snap-align: start;
	padding: 2rem;
	margin-bottom: 2rem;
	background: var(--accent-dark);
	border-radius: 8px;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	position: relative;
}

@media(prefers-color-scheme: light) {
	.prayer-section {
		background: var(--accent-light);
	}
}

.prayer-section.decade {
	scroll-snap-align: start;
	min-height: 50vh; /* Only decades need minimum height for scroll-snap */
	padding-bottom: 4.5rem; /* Extra space for the counter button */
}

@media (max-width: 1023px) {
	.prayer-section.decade {
		padding-bottom: 3.5rem; /* Adjusted for mobile padding */
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
	font-family: crosses;
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

/* Luminous mysteries toggle */
.luminous-toggle {
	text-align: center;
	margin-bottom: 2rem;
	padding: 1rem;
	background: var(--nord1);
	border-radius: 8px;
	max-width: 600px;
	margin-left: auto;
	margin-right: auto;
}

@media(prefers-color-scheme: light) {
	.luminous-toggle {
		background: var(--nord5);
	}
}

.luminous-toggle label {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 1rem;
	cursor: pointer;
	font-size: 1.1rem;
	color: var(--nord4);
}

@media(prefers-color-scheme: light) {
	.luminous-toggle label {
		color: var(--nord0);
	}
}

.luminous-toggle span {
	user-select: none;
}

/* iOS-style toggle switch */
.luminous-toggle input[type="checkbox"] {
	appearance: none;
	-webkit-appearance: none;
	width: 51px;
	height: 31px;
	background: var(--nord2);
	border-radius: 31px;
	position: relative;
	cursor: pointer;
	transition: background 0.3s ease;
	outline: none;
	border: none;
}

@media(prefers-color-scheme: light) {
	.luminous-toggle input[type="checkbox"] {
		background: var(--nord4);
	}
}

.luminous-toggle input[type="checkbox"]:checked {
	background: var(--nord14);
}

.luminous-toggle input[type="checkbox"]::before {
	content: '';
	position: absolute;
	width: 27px;
	height: 27px;
	border-radius: 50%;
	top: 2px;
	left: 2px;
	background: white;
	transition: transform 0.3s ease;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.luminous-toggle input[type="checkbox"]:checked::before {
	transform: translateX(20px);
}

.luminous-toggle .toggle-description {
	margin-top: 1rem;
	font-size: 0.95rem;
	color: var(--nord8);
	line-height: 1.6;
	text-align: center;
	max-width: 500px;
	margin-left: auto;
	margin-right: auto;
}

@media(prefers-color-scheme: light) {
	.luminous-toggle .toggle-description {
		color: var(--nord3);
	}
}

/* Mystery selector grid */
.mystery-selector {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 1.5rem;
	margin-bottom: 3rem;
	max-width: 1000px;
	margin-left: auto;
	margin-right: auto;
}

.mystery-button {
	background: var(--nord1);
	border: 2px solid transparent;
	border-radius: 8px;
	padding: 2rem 1.5rem;
	cursor: pointer;
	transition: all 0.3s ease;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1rem;
}

@media(prefers-color-scheme: light) {
	.mystery-button {
		background: var(--nord6);
	}
}

.mystery-button:hover {
	transform: translateY(-4px);
	box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.mystery-button.selected {
	border-color: var(--nord10);
	background: var(--nord2);
}

@media(prefers-color-scheme: light) {
	.mystery-button.selected {
		border-color: var(--nord10);
		background: var(--nord5);
	}
}

.mystery-button:nth-child(1):hover { background: var(--nord15); }
.mystery-button:nth-child(2):hover { background: var(--nord13); }
.mystery-button:nth-child(3):hover { background: var(--nord14); }
.mystery-button:nth-child(4):hover { background: var(--nord12); }

.mystery-button svg {
	width: 80px;
	height: 80px;
	fill: var(--nord4);
	transition: fill 0.3s ease;
}

@media(prefers-color-scheme: light) {
	.mystery-button svg {
		fill: var(--nord0);
	}
}

.mystery-button.selected svg {
	fill: var(--nord10);
}

.mystery-button h3 {
	margin: 0;
	font-size: 1.2rem;
	color: var(--nord6);
}

@media(prefers-color-scheme: light) {
	.mystery-button h3 {
		color: var(--nord0);
	}
}

.mystery-button.selected h3 {
	color: var(--nord10);
	font-weight: 700;
}

/* Highlighted bead (orange for counting) */
.rosary-visualization :global(.counted-bead) {
	fill: var(--nord13) !important;
	filter: drop-shadow(0 0 8px var(--nord13));
}
</style>
<svelte:head>
	<title>Rosenkranz - Interaktiv</title>
	<meta name="description" content="Interaktive digitale Version des Rosenkranzes zum Mitbeten. Scrolle durch die Gebete und folge der Visualisierung.">
</svelte:head>

<div class="page-container">
	<h1>Interaktiver Rosenkranz</h1>

	<!-- Luminous Mysteries Toggle -->
	<div class="luminous-toggle">
		<label>
			<input type="checkbox" bind:checked={includeLuminous} on:change={handleToggleChange} />
			<span>Lichtreiche Geheimnisse einbeziehen</span>
		</label>
		<p class="toggle-description">
			Die Geheimnisse werden automatisch nach dem Wochenplan ausgewählt.
			{#if includeLuminous}
				Mit lichtreichen Geheimnissen: Do=Lichtreich, andere Tage folgen dem traditionellen Plan.
			{:else}
				Traditioneller Plan ohne lichtreiche Geheimnisse.
			{/if}
			Sie können jederzeit manuell ein anderes Geheimnis wählen.
		</p>
	</div>

	<!-- Mystery Selector -->
	<div class="mystery-selector">
		<button
			class="mystery-button"
			class:selected={selectedMystery === 'freudenreich'}
			on:click={() => selectMystery('freudenreich')}
		>
				<svg viewBox="-10 0 2058 2048">
  <path d="M1935 90q0 32 -38 91q-21 29 -56 90q-20 55 -63 164q-35 86 -95 143q-22 -21 -43 -45q51 -49 85 -139q49 -130 61 -152q-126 48 -152 63q-76 46 -95 128q-27 -18 -58 -25q28 -104 97 -149q31 -20 138 -52q90 -28 137 -74l29 -39q22 -30 32 -30q21 0 21 26zM1714 653 q-90 30 -113 43q-65 36 -65 90q0 19 20 119q23 116 23 247q0 169 -103 299q-111 141 -275 141q-254 0 -283 87q-16 104 -31 207q-27 162 -76 162q-21 0 -41 -20q-16 -19 -32 -37q-10 3 -33 22q-18 15 -39 15q-28 0 -50 -44.5t-30 -44.5q-10 0 -35.5 11.5t-41.5 11.5 q-47 0 -58.5 -45.5t-21.5 -45.5t-29.5 2.5t-29.5 2.5q-46 0 -46 -30q0 -16 14 -44.5t14 -44.5q0 -8 -46.5 -25.5t-46.5 -48.5q0 -34 35.5 -52t99.5 -31q91 -19 103 -22q113 -32 171 -93q37 -39 105 -165q34 -64 43 -82q26 -53 31 -85q-129 -67 -224 -76q-33 0 -96 -11 q-36 -13 -36 -41q0 -7 2 -19.5t2 -19.5q0 -20 -67.5 -42t-67.5 -64q0 -11 8.5 -30t8.5 -30q0 -15 -79 -39t-79 -63q0 -16 9 -45t9 -45q0 -20 -29 -43q-23 -17 -46 -33q-49 -44 -49 -215q0 -8 1 -15q91 53 194 68l282 16q202 12 304 59q143 65 143 210q0 15 -2 44t-2 44 q0 122 78 122q73 0 108 -133q16 -70 32 -139q21 -81 57 -119q46 -51 130 -51q71 0 122 61q90 107 154 149zM1597 636q-25 -22 -77 -91q-30 -40 -75 -40q-91 0 -131 115q-30 106 -59 213q-44 115 -144 115q-146 0 -146 -180q0 -16 2.5 -46.5t2.5 -46.5q0 -62 -19 -87 q-70 -92 -303 -115q-173 -9 -347 -18q-55 -6 -116 -30v34q0 27 57.5 73.5t57.5 91.5q0 16 -10.5 45t-10.5 44q1 1 7 1q3 0 7 1q146 36 146 105q0 13 -8.5 32.5t-8.5 27.5h10q5 0 9 1q61 15 86 36q32 28 28 85q173 15 372 107q-7 77 -80 215q-67 128 -127 195 q-67 74 -169 104q-96 24 -193 47q-10 3 -29 13q86 18 86 70q0 19 -19 62q15 -5 33 -5q42 0 59 26q8 11 22 61l-1 3q10 0 34.5 -11.5t42.5 -11.5q55 0 88 84q38 -32 64 -32q37 0 66 41q25 -53 33 -151q10 -112 23 -154q43 -136 337 -136q116 0 215 -108q105 -114 105 -277 q0 -23 -12 -112l-28 -207q-4 -30 -4 -42q0 -97 124 -147zM1506 605q0 38 -38 38q-39 0 -39 -38t39 -38q38 0 38 38z" />
  <path d="m 1724.44,1054.6641 c -31.1769,-18 -37.7653,-42.5884 -19.7653,-73.76528 5.3333,-9.2376 12.354,-16.7312 21.0621,-22.4808 6.2201,-4.1068 44.7886,-7.2427 115.7055,-9.4077 70.9168,-2.1649 110.128,-1.0807 117.6336,3.2526 30.0222,17.3334 35.5333,42.45448 16.5333,75.36348 -7.3333,12.7017 -16.1754,20.6833 -26.5263,23.9448 -24.5645,1.2137 -56.7805,3.0135 -96.648,5.3994 -72.6282,5.7957 -115.2931,5.0269 -127.9949,-2.3065 z" />
  <path d="m 386.57764,1262.0569 c 53.44793,-14.3214 85.17574,-2.8075 95.18337,34.5417 9.83517,36.7052 -12.29319,62.3047 -66.38503,76.7986 l -82.1037,21.9996 c -54.09184,14.4939 -86.05533,3.3882 -95.89047,-33.317 -10.00766,-37.3491 12.67841,-63.4432 68.05807,-78.2821 z"/>
  <path d="m 1115.7599,372.22724 c 14.3213,53.44793 2.8073,85.17581 -34.5418,95.18323 -36.705,9.83527 -62.3047,-12.29323 -76.7986,-66.38485 l -21.99962,-82.10394 c -14.4939,-54.09162 -3.3882,-86.05531 33.31712,-95.89019 37.349,-10.00765 63.4431,12.67818 78.2821,68.05802 z" />
  <path d="m 1184.6228,1956.284 c -4.807,-8.0003 -6.8298,-42.7561 -6.0684,-104.2674 0.7614,-61.5113 2.7093,-100.0139 5.8437,-115.508 3.1343,-15.4941 11.8445,-27.5329 26.1306,-36.117 30.2866,-18.198 54.7006,-11.868 73.242,18.99 5.4937,9.1432 8.145,43.3269 7.9537,102.5512 -0.081,52.9359 -1.4296,89.5231 -4.0464,109.7617 -2.276,16.9226 -11.1284,30.0192 -26.5575,39.29 -33.1439,19.9148 -58.643,15.0146 -76.4977,-14.7005 z" />
  <path d="m 1773.3127,1737.6952 c -9.0153,-2.4157 -34.6139,-26.0118 -76.7955,-70.7882 -42.1816,-44.7764 -67.5266,-73.826 -76.035,-87.1489 -8.5084,-13.3228 -10.6057,-28.0334 -6.2922,-44.1323 9.145,-34.1293 31.1041,-46.5353 65.8774,-37.2179 10.3033,2.7609 35.9565,25.5088 76.9595,68.2441 36.7142,38.1352 61.1596,65.3907 73.3362,81.7668 10.1182,13.7541 12.8479,29.3245 8.1892,46.7113 -10.0077,37.3492 -31.7542,51.5375 -65.2396,42.5651 z" />
			</svg>
			<h3>Freudenreich</h3>
		</button>

		<button
			class="mystery-button"
			class:selected={selectedMystery === 'schmerzhaften'}
			on:click={() => selectMystery('schmerzhaften')}
		>
			<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<svg  viewBox="0 0 512 512" ><path d="M255.094 24.875c-16.73 9.388-34.47 42.043-41.688 59.47-14.608-2.407-28.87-3.664-42.562-3.75-11.446-.074-22.49.68-33.03 2.218-16.34-8.284-34.766-29.065-42.626-50-9.324 15.704-9.558 42.313-5.782 64.593-19.443 9.72-35.107 23.633-45.53 41.688-7.262 12.577-11.5 26.34-12.97 40.875 13.294-25.904 35-46.957 65.656-54.345-34.99 31.783-59.85 87.186-51.5 129.406-1.2 22.87-9.48 37.647-24.75 44.595 16.335 4.59 35.497 3.343 49.438-1.28 24.94 34.82 60.818 67.882 105.063 94.342-6.952 17.613-16.677 49.21-16.47 66.032 10.846-13.178 37.433-40.585 61.72-42.783 23.656 10.27 47.35 17.698 70.312 22.313 12.423 17.25 12.895 38.867 7.375 53.594 16.402-9.2 33.82-33.187 39.938-48 47.1 1.423 88.046-10.534 114.718-35.563 17.536 5.52 30.744 15.707 39.813 30.5.243-19.578-8.05-44.353-18-60.31 13.42-28.268 12.786-61.81.5-96.158l.405.47c9.976-11.804 18.304-33.19 18.063-52.907-8.535 10.373-20.727 15.14-36.75 14.188-13.56-22.597-31.81-44.812-54.032-65.375 10.56-19.27 30.402-36.43 44.156-47.97-18.985-5.337-67.794 5.2-80.78 17.782l5.906 8.5c5.637 11.99 9.503 24.423 11.093 37.063-26.323-37.275-70.72-74.72-114.905-95.625-15.894-25.424-19.322-56.118-12.78-73.563zm-82.875 97.063c1.13-.015 2.258-.008 3.405 0 31.56.2 68.888 8.842 107 25.656-8.8 20.095-14.74 44.482-10 61.344 13.33-18.637 37.313-34.22 55.406-37.5 55.904 34.315 96.215 78.718 111.658 118.718l.093.22c16.088 37.88 13.36 85.186-26.56 117.312 4.79-11.41 7.986-23.828 9.5-36.438-14.078 10.012-33.524 15.304-56.314 15.97-1.954-17.242-9.117-52.874-22.28-65.72 1.565 16.122-8.11 46.272-26.22 61.063-31.916-6.495-66.794-19.67-101.03-39.438-9.538-5.506-18.65-11.307-27.314-17.344-3.444-23.614 7.842-53.562 20.563-64.03-18.967-.234-46.71 22.156-59.313 32.75-40.974-38.47-64.14-81.11-61.25-115 16.275-1.708 36.144.927 51.72 8-3.92-15.382-18.553-31.733-34.407-44.344 14.757-13.826 37.7-20.852 65.344-21.22z"/></svg>
			</svg>
			<h3>Schmerzhaften</h3>
		</button>

		<button
			class="mystery-button"
			class:selected={selectedMystery === 'glorreichen'}
			on:click={() => selectMystery('glorreichen')}
		>
		<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="-10 0 2060 2048">
   <path
d="M1968 505l-119 632q101 61 101 163q0 149 -228 212q-171 47 -356 47h-682q-47 0 -111 -8q-210 -26 -293 -55q-180 -62 -180 -196q0 -124 101 -163l-119 -632h37q87 0 170 43q-18 85 -18 103q0 116 75 130q31 -47 77 -129l40 147q49 -37 95 -37t100 37q9 -38 31 -113
q34 29 68 57q47 38 75 38q34 0 60 -27.5t26 -61.5q0 -26 -31 -74l-46 -72q46 -13 91 -26q55 -15 93 -15t93 15q45 13 91 26l-46 72q-31 51 -31 74q0 34 26 61.5t60 27.5q26 0 75 -38q34 -28 68 -57l31 113q66 -37 97 -37q56 0 95 37q14 -48 43 -145q39 66 77 127
q75 -14 75 -130q0 17 -18 -103q89 -43 207 -43zM1889 557h-29q-10 0 -17 7q0 94 -9 130q-14 63 -67 110q-33 29 -63 29q-28 0 -59 -41q-31 115 -31 169q57 -36 77 -36q75 0 75 119q0 78 -32 126h-183q-54 -79 -54 -198v-5q64 -28 64 -80q0 -30 -20 -52.5t-50 -22.5
q-33 0 -55 22.5t-22 55.5q0 53 46 74q-10 44 -21 86.5t-45.5 81t-39.5 38.5h-271q-21 -52 -21 -81q0 -65 47 -114.5t112 -49.5q29 0 106 36q7 -33 7 -82q0 -26 -7 -89q-42 43 -106 43q-65 0 -112 -49.5t-47 -114.5q0 -40 33 -105q-26 -7 -70 -7q-48 0 -70 7q33 63 33 105
q0 65 -47 114.5t-112 49.5q-60 0 -106 -43q-7 63 -7 87q0 53 7 84q70 -36 106 -36q65 0 112 49.5t47 114.5q0 32 -21 81h-271q-16 0 -57 -58q-21 -30 -32 -72q-8 -38 -17 -76q46 -14 46 -74q0 -78 -77 -78q-30 0 -50 22t-20 53q0 48 64 80v4q0 125 -54 199h-183
q-32 -54 -32 -124q0 -121 75 -121q19 0 77 36v-20q0 -27 -31 -151q-27 43 -59 43q-19 0 -51 -19q-40 -24 -67 -87q-24 -57 -24 -109q0 -10 1 -29t1 -28q-18 -1 -23 -1q-13 0 -22 1l46 241q64 17 64 101q0 51 -30 51q-3 0 -6 -1q19 83 39 212l-2 4q-102 20 -102 110
q0 141 342 175q132 13 150 13h726q-9 0 55 -5q437 -34 437 -183q0 -88 -105 -111l40 -215q-2 0 -5 1q-31 0 -31 -51q0 -32 16 -62q19 -34 48 -39zM1518 888q0 34 -30 34q-34 0 -34 -34t32 -34t32 34zM1099 880q0 30 -22 51t-52 21q-29 0 -51.5 -21.5t-22.5 -50.5
q0 -31 22 -54.5t52 -23.5q31 0 52.5 23.5t21.5 54.5zM596 888q0 34 -34 34q-30 0 -30 -34t32 -34t32 34z" />
</svg>
			<h3>Glorreichen</h3>
		</button>

		{#if includeLuminous}
		<button
			class="mystery-button"
			class:selected={selectedMystery === 'lichtreichen'}
			on:click={() => selectMystery('lichtreichen')}
		>
					<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="-10 0 2156 2048">
   <path
d="M1668 383q0 14 -48.5 92.5t-64.5 96t-41 17.5q-53 0 -53 -54q0 -16 46 -92q41 -68 60 -92q16 -20 43 -20q58 0 58 52zM688 535q0 54 -54 54q-16 0 -30 -7q-10 -5 -66 -95.5t-56 -103.5q0 -52 57 -52q22 0 34 11q20 31 53 81q62 90 62 112zM2064 842q0 59 -56 100
q-231 162 -468 342l190 586q1 4 -5 28q-22 84 -110 84q-23 0 -45 -11q-18 -9 -203 -146l-291 -213q-125 89 -328 238q-51 39 -156 114q-28 18 -63 18q-46 0 -78.5 -32t-34.5 -78l194 -589q-76 -58 -197 -144q-81 -57 -163 -114q-126 -91 -147 -118t-21 -65q0 -36 29.5 -75.5
t64.5 -39.5h604q33 -94 126 -375q19 -62 61 -184q29 -73 108 -73t110 83q4 11 58 177l123 372h607q34 0 64 41q27 38 27 74zM1129 1958q0 83 -58 83q-57 0 -57 -84v-85q0 -84 57 -84q58 0 58 86v84zM1943 849h-659l-211 -636l-207 629h-663l541 397l-206 621l537 -386
l536 389l-209 -629zM1671 934l-370 267l150 436l-378 -271l-371 271q8 -34 15 -68q10 -41 28 -62q46 -53 144 -120q80 -53 159 -106l296 210l-112 -344l299 -213h140z" />
</svg>

			<h3>Lichtreichen</h3>
		</button>
		{/if}
	</div>

	<div class="rosary-layout">
		<!-- Sidebar: Rosary Visualization -->
		<div class="rosary-sidebar">
			<div class="rosary-visualization" bind:this={svgContainer}>
				<svg class="linear-rosary" viewBox="-100 -100 250 2200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMin meet">
					<!-- Vertical chain -->
					<line x1="25" y1="35" x2="25" y2="1655" class="chain" />

					<!-- Cross (at top) -->
					<g id="cross-section" data-section="cross">
						<text x="25" y="35" text-anchor="middle" font-size="80"
							class="cross-symbol" class:active-cross={activeSection === 'cross'}>♱</text>
					</g>

					<!-- First large bead (Paternoster) -->
					<circle cx="25" cy="80" r="15" class="large-bead" class:active-large-bead={activeSection === 'lbead1'} data-section="lbead1" />

					<!-- Three small beads -->
					<circle cx="25" cy="110" r="10" class="bead" class:active-bead={activeSection === 'start1'} data-section="start1" />
					<circle cx="25" cy="135" r="10" class="bead" class:active-bead={activeSection === 'start2'} data-section="start2" />
					<circle cx="25" cy="160" r="10" class="bead" class:active-bead={activeSection === 'start3'} data-section="start3" />

					<!-- Large bead before decades -->
					<circle cx="25" cy="200" r="15" class="large-bead" class:active-large-bead={activeSection === 'lbead2'} data-section="lbead2" />

					<!-- Benedictus Medal -->
					<BenedictusMedal x={5} y={220} size={40} />

					<!-- Decade 1: Ave Maria (10 beads) -->
					{#each Array(10) as _, i}
						<circle cx="25" cy={280 + i * 22} r="10" class="bead"
							class:active-bead={activeSection === 'secret1'}
							class:counted-bead={i < decadeCounters.secret1}
							data-section="secret1" />
					{/each}
					<!-- Transition 1: Gloria + Fatima + Paternoster (large bead) -->
					<circle cx="25" cy="520" r="15" class="large-bead" class:active-large-bead={activeSection === 'secret1_transition'} data-section="secret1_transition" />

					<!-- Decade 2: Ave Maria (10 beads) -->
					{#each Array(10) as _, i}
						<circle cx="25" cy={560 + i * 22} r="10" class="bead"
							class:active-bead={activeSection === 'secret2'}
							class:counted-bead={i < decadeCounters.secret2}
							data-section="secret2" />
					{/each}
					<!-- Transition 2: Gloria + Fatima + Paternoster (large bead) -->
					<circle cx="25" cy="800" r="15" class="large-bead" class:active-large-bead={activeSection === 'secret2_transition'} data-section="secret2_transition" />

					<!-- Decade 3: Ave Maria (10 beads) -->
					{#each Array(10) as _, i}
						<circle cx="25" cy={840 + i * 22} r="10" class="bead"
							class:active-bead={activeSection === 'secret3'}
							class:counted-bead={i < decadeCounters.secret3}
							data-section="secret3" />
					{/each}
					<!-- Transition 3: Gloria + Fatima + Paternoster (large bead) -->
					<circle cx="25" cy="1080" r="15" class="large-bead" class:active-large-bead={activeSection === 'secret3_transition'} data-section="secret3_transition" />

					<!-- Decade 4: Ave Maria (10 beads) -->
					{#each Array(10) as _, i}
						<circle cx="25" cy={1120 + i * 22} r="10" class="bead"
							class:active-bead={activeSection === 'secret4'}
							class:counted-bead={i < decadeCounters.secret4}
							data-section="secret4" />
					{/each}
					<!-- Transition 4: Gloria + Fatima + Paternoster (large bead) -->
					<circle cx="25" cy="1360" r="15" class="large-bead" class:active-large-bead={activeSection === 'secret4_transition'} data-section="secret4_transition" />

					<!-- Decade 5: Ave Maria (10 beads) -->
					{#each Array(10) as _, i}
						<circle cx="25" cy={1400 + i * 22} r="10" class="bead"
							class:active-bead={activeSection === 'secret5'}
							class:counted-bead={i < decadeCounters.secret5}
							data-section="secret5" />
					{/each}
					<!-- Final transition: Gloria + Fatima -->
					<circle cx="25" cy="1640" r="15" class="large-bead" class:active-large-bead={activeSection === 'final_transition'} data-section="final_transition" />
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
				<h2>Anfang</h2>
				<h3>♱ Das Kreuzzeichen</h3>
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
				<h3>Vater unser</h3>
				<Paternoster />
			</div>

			<!-- First Ave Maria (Faith) -->
			<div
				class="prayer-section"
				bind:this={sectionElements.start1}
				data-section="start1"
			>
				<h3>Ave Maria</h3>
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
				<h3>Ave Maria</h3>
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
				<h3>Ave Maria</h3>
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
				<h3>Gloria Patri</h3>
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
					<h3>Ave Maria <span class="repeat-count">(10×)</span></h3>
					<AveMaria
						mysteryLatin={currentMysteriesLatin[decadeNum - 1]}
						mystery={currentMysteries[decadeNum - 1]}
					/>

					<!-- Counter button -->
					<CounterButton onClick={() => advanceDecade(decadeNum)} />
				</div>

				<!-- Transition prayers (Gloria, Fatima, Paternoster) -->
				{#if decadeNum < 5}
					<div
						class="prayer-section"
						bind:this={sectionElements[`secret${decadeNum}_transition`]}
						data-section="secret{decadeNum}_transition"
					>
						<h3>Gloria Patri</h3>
						<GloriaPatri />

						<h3>Das Fatima Gebet <span class="repeat-count">(optional)</span></h3>
						<FatimaGebet />

						<h3>Vater unser</h3>
						<Paternoster />
					</div>
				{/if}
			{/each}

			<!-- Final prayers after 5th decade -->
			<div
				class="prayer-section"
				bind:this={sectionElements.final_transition}
				data-section="final_transition"
			>
				<h2>Abschluss</h2>

				<h3>Gloria Patri</h3>
				<GloriaPatri />

				<h3>Das Fatima Gebet <span class="repeat-count">(optional)</span></h3>
				<FatimaGebet />

				<h3>Salve Regina</h3>
				<SalveRegina />
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
