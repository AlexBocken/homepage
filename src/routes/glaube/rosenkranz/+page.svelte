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

	/* Make SVG beads larger on mobile by scaling up */
	.rosary-visualization svg {
		transform: scale(3.5) translateX(-5px);
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
	min-height: 50vh;
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
			<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<!-- Placeholder: Star for joyful mysteries -->
				<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
			</svg>
			<h3>Freudenreich</h3>
		</button>

		<button
			class="mystery-button"
			class:selected={selectedMystery === 'schmerzhaften'}
			on:click={() => selectMystery('schmerzhaften')}
		>
			<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<!-- Placeholder: Cross for sorrowful mysteries -->
				<path d="M10 2h4v7h7v4h-7v9h-4v-9H3v-4h7V2z"/>
			</svg>
			<h3>Schmerzhaften</h3>
		</button>

		<button
			class="mystery-button"
			class:selected={selectedMystery === 'glorreichen'}
			on:click={() => selectMystery('glorreichen')}
		>
			<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<!-- Placeholder: Crown for glorious mysteries -->
				<path d="M5 16l3-6.5 4 4 4-4 3 6.5v4H5v-4zm0-13l2 2-2 2V5zm14 0l-2 2 2 2V5zM12 3l-2 2 2 2 2-2-2-2z"/>
			</svg>
			<h3>Glorreichen</h3>
		</button>

		{#if includeLuminous}
		<button
			class="mystery-button"
			class:selected={selectedMystery === 'lichtreichen'}
			on:click={() => selectMystery('lichtreichen')}
		>
			<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<!-- Placeholder: Candle/Light for luminous mysteries -->
				<path d="M9 2h6v2H9V2zm3 3c-2.76 0-5 2.24-5 5 0 2.04 1.23 3.79 3 4.58V21h4v-6.42c1.77-.79 3-2.54 3-4.58 0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/>
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
					<line x1="50" y1="35" x2="50" y2="1655" class="chain" />

					<!-- Cross (at top) -->
					<g id="cross-section" data-section="cross">
						<text x="50" y="35" text-anchor="middle" font-size="80"
							class="cross-symbol" class:active-cross={activeSection === 'cross'}>♱</text>
					</g>

					<!-- First large bead (Paternoster) -->
					<circle cx="50" cy="80" r="15" class="large-bead" class:active-large-bead={activeSection === 'lbead1'} data-section="lbead1" />

					<!-- Three small beads -->
					<circle cx="50" cy="110" r="10" class="bead" class:active-bead={activeSection === 'start1'} data-section="start1" />
					<circle cx="50" cy="135" r="10" class="bead" class:active-bead={activeSection === 'start2'} data-section="start2" />
					<circle cx="50" cy="160" r="10" class="bead" class:active-bead={activeSection === 'start3'} data-section="start3" />

					<!-- Large bead before decades -->
					<circle cx="50" cy="200" r="15" class="large-bead" class:active-large-bead={activeSection === 'lbead2'} data-section="lbead2" />

					<!-- Benedictus Medal -->
					<BenedictusMedal x={30} y={220} size={40} />

					<!-- Decade 1: Ave Maria (10 beads) -->
					{#each Array(10) as _, i}
						<circle cx="50" cy={280 + i * 22} r="10" class="bead"
							class:active-bead={activeSection === 'secret1'}
							class:counted-bead={i < decadeCounters.secret1}
							data-section="secret1" />
					{/each}
					<!-- Transition 1: Gloria + Fatima + Paternoster (large bead) -->
					<circle cx="50" cy="520" r="15" class="large-bead" class:active-large-bead={activeSection === 'secret1_transition'} data-section="secret1_transition" />

					<!-- Decade 2: Ave Maria (10 beads) -->
					{#each Array(10) as _, i}
						<circle cx="50" cy={560 + i * 22} r="10" class="bead"
							class:active-bead={activeSection === 'secret2'}
							class:counted-bead={i < decadeCounters.secret2}
							data-section="secret2" />
					{/each}
					<!-- Transition 2: Gloria + Fatima + Paternoster (large bead) -->
					<circle cx="50" cy="800" r="15" class="large-bead" class:active-large-bead={activeSection === 'secret2_transition'} data-section="secret2_transition" />

					<!-- Decade 3: Ave Maria (10 beads) -->
					{#each Array(10) as _, i}
						<circle cx="50" cy={840 + i * 22} r="10" class="bead"
							class:active-bead={activeSection === 'secret3'}
							class:counted-bead={i < decadeCounters.secret3}
							data-section="secret3" />
					{/each}
					<!-- Transition 3: Gloria + Fatima + Paternoster (large bead) -->
					<circle cx="50" cy="1080" r="15" class="large-bead" class:active-large-bead={activeSection === 'secret3_transition'} data-section="secret3_transition" />

					<!-- Decade 4: Ave Maria (10 beads) -->
					{#each Array(10) as _, i}
						<circle cx="50" cy={1120 + i * 22} r="10" class="bead"
							class:active-bead={activeSection === 'secret4'}
							class:counted-bead={i < decadeCounters.secret4}
							data-section="secret4" />
					{/each}
					<!-- Transition 4: Gloria + Fatima + Paternoster (large bead) -->
					<circle cx="50" cy="1360" r="15" class="large-bead" class:active-large-bead={activeSection === 'secret4_transition'} data-section="secret4_transition" />

					<!-- Decade 5: Ave Maria (10 beads) -->
					{#each Array(10) as _, i}
						<circle cx="50" cy={1400 + i * 22} r="10" class="bead"
							class:active-bead={activeSection === 'secret5'}
							class:counted-bead={i < decadeCounters.secret5}
							data-section="secret5" />
					{/each}
					<!-- Final transition: Gloria + Fatima -->
					<circle cx="50" cy="1640" r="15" class="large-bead" class:active-large-bead={activeSection === 'final_transition'} data-section="final_transition" />
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
