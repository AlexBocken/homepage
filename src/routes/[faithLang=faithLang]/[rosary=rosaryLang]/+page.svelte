<script>
import { onMount } from "svelte";
import { createLanguageContext } from "$lib/contexts/languageContext.js";
import "$lib/css/christ.css";
import "$lib/css/action_button.css";
import Kreuzzeichen from "$lib/components/prayers/Kreuzzeichen.svelte";
import Credo from "$lib/components/prayers/Credo.svelte";
import Paternoster from "$lib/components/prayers/Paternoster.svelte";
import AveMaria from "$lib/components/prayers/AveMaria.svelte";
import GloriaPatri from "$lib/components/prayers/GloriaPatri.svelte";
import FatimaGebet from "$lib/components/prayers/FatimaGebet.svelte";
import SalveRegina from "$lib/components/prayers/SalveRegina.svelte";
import RosaryFinalPrayer from "$lib/components/prayers/RosaryFinalPrayer.svelte";
import MichaelGebet from "$lib/components/prayers/MichaelGebet.svelte";
import CounterButton from "$lib/components/CounterButton.svelte";
import BibleModal from "$lib/components/BibleModal.svelte";
import Toggle from "$lib/components/Toggle.svelte";
import LanguageToggle from "$lib/components/LanguageToggle.svelte";
import StreakCounter from "$lib/components/StreakCounter.svelte";
import MysteryIcon from "$lib/components/MysteryIcon.svelte";

let { data } = $props();

// Mystery variations for each type of rosary
const mysteries = {
	freudenreich: [
		"Jesus, den du, o Jungfrau, vom Heiligen Geist empfangen hast.",
		"Jesus, den du, o Jungfrau, zu Elisabeth getragen hast.",
		"Jesus, den du, o Jungfrau, in Betlehem geboren hast.",
		"Jesus, den du, o Jungfrau, im Tempel geopfert hast.",
		"Jesus, den du, o Jungfrau, im Tempel wiedergefunden hast."
	],
	schmerzhaften: [
		"Jesus, der für uns Blut geschwitzt hat.",
		"Jesus, der für uns gegeisselt worden ist.",
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
		"Jesus, quem, virgo, concepísti.",
		"Jesus, quem visitándo Elísabeth portásti.",
		"Jesus, quem, virgo, genuísti.",
		"Jesus, quem in templo præsentásti.",
		"Jesus, quem in templo invenisti."
	],
	schmerzhaften: [
		"Jesus, qui pro nobis sánguinem sudavit.",
		"Jesus, qui pro nobis flagellátus est.",
		"Jesus, qui pro nobis spinis coronátus est.",
		"Jesus, qui pro nobis crucem baiulávit.",
		"Jesus, qui pro nobis crucifixus est."
	],
	glorreichen: [
		"Jesus, qui resurréxit a mórtuis.",
		"Jesus, qui ascendit in cælum.",
		"Jesus, qui misit Spíritum Sanctum.",
		"Jesus, qui te, virgo, in cælum assúmpsit.",
		"Jesus, qui te, virgo, in cælo coronávit."
	],
	lichtreichen: [
		"Jesus, qui a Ioánne baptizátus est.",
		"Jesus, qui se in Cana revelávit.",
		"Jesus, qui regnum Dei prædicávit.",
		"Jesus, qui in monte transfigurátus est.",
		"Jesus, Sacraméntum Altáris instítuit."
	]
};

// English mysteries (TODO: translate)
const mysteriesEnglish = {
	freudenreich: [
		"Jesus, whom thou, O Virgin, didst conceive of the Holy Spirit.",
		"Jesus, whom thou, O Virgin, didst carry to Elizabeth.",
		"Jesus, whom thou, O Virgin, didst bring forth in Bethlehem.",
		"Jesus, whom thou, O Virgin, didst present in the Temple.",
		"Jesus, whom thou, O Virgin, didst find in the Temple."
	],
	schmerzhaften: [
		"Jesus, who sweat blood for us.",
		"Jesus, who was scourged for us.",
		"Jesus, who was crowned with thorns for us.",
		"Jesus, who carried the heavy cross for us.",
		"Jesus, who was crucified for us."
	],
	glorreichen: [
		"Jesus, who rose from the dead.",
		"Jesus, who ascended into heaven.",
		"Jesus, who sent us the Holy Spirit.",
		"Jesus, who took thee, O Virgin, into heaven.",
		"Jesus, who crowned thee, O Virgin, in heaven."
	],
	lichtreichen: [
		"Jesus, who was baptized by John.",
		"Jesus, who revealed Himself at the wedding in Cana.",
		"Jesus, who proclaimed the Kingdom of God.",
		"Jesus, who was transfigured on the mountain.",
		"Jesus, who gave us the Eucharist."
	]
};

// Short titles for mysteries (for display in headings)
const mysteryTitles = {
	freudenreich: [
		"Verkündigung",
		"Heimsuchung",
		"Geburt",
		"Darstellung",
		"Wiederfindung"
	],
	schmerzhaften: [
		"Todesangst",
		"Geisselung",
		"Dornenkrönung",
		"Kreuzweg",
		"Kreuzigung"
	],
	glorreichen: [
		"Auferstehung",
		"Himmelfahrt",
		"Geistsendung",
		"Aufnahme Mariens",
		"Krönung Mariens"
	],
	lichtreichen: [
		"Taufe",
		"Hochzeit zu Kana",
		"Verkündigung des Reiches",
		"Verklärung",
		"Einsetzung der Eucharistie"
	]
};

// English short titles for mysteries (TODO: translate)
const mysteryTitlesEnglish = {
	freudenreich: [
		"Annunciation",
		"Visitation",
		"Nativity",
		"Presentation",
		"Finding in the Temple"
	],
	schmerzhaften: [
		"Agony in the Garden",
		"Scourging",
		"Crowning with Thorns",
		"Carrying of the Cross",
		"Crucifixion"
	],
	glorreichen: [
		"Resurrection",
		"Ascension",
		"Descent of the Holy Spirit",
		"Assumption of Mary",
		"Coronation of Mary"
	],
	lichtreichen: [
		"Baptism",
		"Wedding at Cana",
		"Proclamation of the Kingdom",
		"Transfiguration",
		"Institution of the Eucharist"
	]
};

// Toggle for including Luminous mysteries
let includeLuminous = $state(true);

// Flag to prevent saving before we've loaded from localStorage
let hasLoadedFromStorage = false;

// Create language context for prayer components (LanguageToggle will use this)
const langContext = createLanguageContext({ urlLang: data.lang });

// Update lang store when data.lang changes (e.g., after navigation)
$effect(() => {
	langContext.lang.set(data.lang);
});

// UI labels based on URL language (reactive)
const isEnglish = $derived(data.lang === 'en');
const labels = $derived({
	pageTitle: isEnglish ? 'Interactive Rosary' : 'Interaktiver Rosenkranz',
	pageDescription: isEnglish
		? 'Interactive digital version of the Rosary for praying along. Scroll through the prayers and follow the visualization.'
		: 'Interaktive digitale Version des Rosenkranzes zum Mitbeten. Scrolle durch die Gebete und folge der Visualisierung.',
	mysteries: isEnglish ? 'Mysteries' : 'Geheimnisse',
	today: isEnglish ? 'Today' : 'Heutige',
	joyful: isEnglish ? 'Joyful' : 'Freudenreiche',
	sorrowful: isEnglish ? 'Sorrowful' : 'Schmerzhaften',
	glorious: isEnglish ? 'Glorious' : 'Glorreichen',
	luminous: isEnglish ? 'Luminous' : 'Lichtreichen',
	includeLuminous: isEnglish ? 'Include Luminous Mysteries' : 'Lichtreiche Geheimnisse einbeziehen',
	beginning: isEnglish ? 'Beginning' : 'Anfang',
	signOfCross: isEnglish ? '♱ Sign of the Cross' : '♱ Das Kreuzzeichen',
	ourFather: isEnglish ? 'Our Father' : 'Vater unser',
	hailMary: isEnglish ? 'Hail Mary' : 'Ave Maria',
	faith: isEnglish ? 'Faith' : 'Glaube',
	hope: isEnglish ? 'Hope' : 'Hoffnung',
	love: isEnglish ? 'Love' : 'Liebe',
	decade: isEnglish ? 'Decade' : 'Gesätz',
	optional: isEnglish ? 'optional' : 'optional',
	gloriaPatri: 'Gloria Patri',
	fatimaPrayer: isEnglish ? 'Fatima Prayer' : 'Das Fatima Gebet',
	conclusion: isEnglish ? 'Conclusion' : 'Abschluss',
	finalPrayer: isEnglish ? 'Final Prayer' : 'Schlussgebet',
	saintMichael: isEnglish ? 'Prayer to St. Michael the Archangel' : 'Gebet zum hl. Erzengel Michael',
	footnoteSign: isEnglish ? 'Make the Sign of the Cross here' : 'Hier das Kreuzzeichen machen',
	footnoteBow: isEnglish ? 'Bow the head here' : 'Hier den Kopf senken',
	showBibleVerse: isEnglish ? 'Show Bible verse' : 'Bibelstelle anzeigen',
	mysteryFaith: isEnglish ? 'Jesus, who may increase our faith' : 'Jesus, der in uns den Glauben vermehre',
	mysteryHope: isEnglish ? 'Jesus, who may strengthen our hope' : 'Jesus, der in uns die Hoffnung stärke',
	mysteryLove: isEnglish ? 'Jesus, who may kindle our love' : 'Jesus, der in uns die Liebe entzünde'
});

// Save luminous toggle state to localStorage whenever it changes (but only after initial load)
$effect(() => {
	if (typeof localStorage !== 'undefined' && hasLoadedFromStorage) {
		localStorage.setItem('rosary_includeLuminous', includeLuminous.toString());
	}
});

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
const initialMystery = getMysteryForWeekday(new Date(), true); // Use literal true to avoid capturing reactive state
let selectedMystery = $state(initialMystery);
let todaysMystery = $state(initialMystery); // Track today's auto-selected mystery

// Derive these values from selectedMystery so they update automatically
let currentMysteries = $derived(mysteries[selectedMystery]);
let currentMysteriesLatin = $derived(mysteriesLatin[selectedMystery]);
let currentMysteriesEnglish = $derived(mysteriesEnglish[selectedMystery]);
let currentMysteryTitles = $derived(isEnglish ? mysteryTitlesEnglish[selectedMystery] : mysteryTitles[selectedMystery]);
let currentMysteryDescriptions = $derived(data.mysteryDescriptions[selectedMystery] || []);

// Function to switch mysteries
function selectMystery(mysteryType) {
	selectedMystery = mysteryType;
}

// When luminous toggle changes, update today's mystery and fix invalid selection
$effect(() => {
	todaysMystery = getMysteryForWeekday(new Date(), includeLuminous);
	if (!includeLuminous && selectedMystery === 'lichtreichen') {
		selectedMystery = todaysMystery;
	}
});

// Active section tracking
let activeSection = $state("cross");
let sectionElements = {};
let svgContainer;

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

// Map sections to their vertical positions in the SVG
const BEAD_SPACING = 22;
const DECADE_OFFSET = 10;
const sectionPositions = {
	cross: 35,
	lbead1: 75,
	start1: 110,
	start2: 135,
	start3: 160,
	lbead2: 195,
	secret1: 270,
	secret2: 560,
	secret3: 840,
	secret4: 1120,
	secret5: 1400,
	final_transition: 1685,
	final_salve: 1720,
	final_schlussgebet: 1745,
	final_michael: 1770,
	final_paternoster: 1805,
	final_cross: 1900
};
// Center transition beads between last bead of decade d and first bead of decade d+1
for (let d = 1; d < 5; d++) {
	const lastBead = sectionPositions[`secret${d}`] + DECADE_OFFSET + 9 * BEAD_SPACING;
	const nextFirst = sectionPositions[`secret${d + 1}`] + DECADE_OFFSET;
	sectionPositions[`secret${d}_transition`] = Math.round((lastBead + nextFirst) / 2);
}
const pos = sectionPositions;

onMount(() => {
	// Load toggle state from localStorage
	const savedIncludeLuminous = localStorage.getItem('rosary_includeLuminous');

	if (savedIncludeLuminous !== null) {
		includeLuminous = savedIncludeLuminous === 'true';
	}

	// Recalculate mystery based on loaded includeLuminous value
	todaysMystery = getMysteryForWeekday(new Date(), includeLuminous);
	selectMystery(todaysMystery);

	// Now allow saving to localStorage
	hasLoadedFromStorage = true;

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
				const section = entry.target.dataset.section;
				activeSection = section;

				// Don't auto-scroll if we're at the absolute top of the page and viewing the first section
				const scrollY = window.scrollY || window.pageYOffset;
				if (scrollY < 50 && section === 'cross') {
					// User is at the very top - don't trigger auto-scroll, just update SVG
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
					return; // Skip the page scroll
				}

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
		const scrollY = window.scrollY || window.pageYOffset;
		const documentHeight = document.documentElement.scrollHeight;

		// Get the first and final prayer sections
		const firstSection = sectionElements.cross;
		const finalSection = sectionElements.final_cross;
		if (!firstSection || !finalSection) return;

		const firstSectionRect = firstSection.getBoundingClientRect();
		const finalSectionRect = finalSection.getBoundingClientRect();

		// Check if we're at the absolute top of the page
		if (scrollY < 50) {
			// Scroll SVG to top
			if (svgContainer.scrollTop > 10) { // Only if not already at top
				setScrollLock('prayer');
				smoothScrollElement(svgContainer, 0);
			}
		}
		// Check if we're at the absolute bottom of the page
		else if (scrollY + viewportHeight >= documentHeight - 50) {
			// Scroll SVG to bottom
			const maxScroll = svgContainer.scrollHeight - svgContainer.clientHeight;
			if (svgContainer.scrollTop < maxScroll - 10) { // Only if not already at bottom
				setScrollLock('prayer');
				smoothScrollElement(svgContainer, maxScroll);
			}
		}
		// Check if we've scrolled above the first section (it's completely below viewport)
		else if (firstSectionRect.top > viewportHeight * 0.6) {
			// Scroll SVG to top
			if (svgContainer.scrollTop > 10) { // Only if not already at top
				setScrollLock('prayer');
				smoothScrollElement(svgContainer, 0);
			}
		}
		// Check if we've scrolled past the final section (it's completely above viewport)
		else if (finalSectionRect.bottom < viewportHeight * 0.4) {
			// Scroll SVG to bottom
			const maxScroll = svgContainer.scrollHeight - svgContainer.clientHeight;
			if (svgContainer.scrollTop < maxScroll - 10) { // Only if not already at bottom
				setScrollLock('prayer');
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
}

/* Hide scrollbar completely */
.rosary-visualization::-webkit-scrollbar {
	display: none;
}

.linear-rosary {
	width: 100%;
	height: auto;
	display: block;
	-webkit-tap-highlight-color: transparent;
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

.rosary-visualization :global(.hitboxes) {
	fill: transparent;
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

/* Mystery selector grid */
.mystery-selector {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 1.5rem;
	margin-bottom: 3rem;
	max-width: 750px;
	margin-left: auto;
	margin-right: auto;
}

.mystery-selector.four-mysteries {
	grid-template-columns: repeat(2, 1fr);
	max-width: 500px;
}

@media (min-width: 800px) {
	.mystery-selector.four-mysteries {
		grid-template-columns: repeat(4, 1fr);
		max-width: 900px;
	}
}

@media (max-width: 560px) {
	.mystery-selector,
	.mystery-selector.four-mysteries {
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		margin-inline: 0;
		max-width: none;
	}
	.mystery-selector :global(svg) {
		width: 48px;
		height: 48px;
	}
	.mystery-button {
		padding: 1rem 0.75rem;
		gap: 0.5rem;
	}
	.mystery-button h3 {
		font-size: 0.95rem;
	}
	.today-badge {
		font-size: 0.7rem;
		padding: 0.25rem 0.5rem;
		top: 0.5rem;
		right: 0.5rem;
	}
}

@media (max-width: 410px) {
	.mystery-selector,
	.mystery-selector.four-mysteries {
		gap: 0.375rem;
		margin-bottom: 0.75rem;
		margin-inline: 0;
		max-width: none;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.mystery-selector:not(.four-mysteries) {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	.mystery-button {
		padding: 0.25rem 0.15rem;
		gap: 0.15rem;
		border-radius: 6px;
	}
	.mystery-button h3 {
		font-size: 0.55rem;
	}
	.today-badge {
		font-size: 0.6rem;
		padding: 0.15rem 0.35rem;
		top: 0.25rem;
		right: 0.25rem;
	}
}

@media (max-width: 350px) {
	.mystery-selector,
	.mystery-selector.four-mysteries {
		grid-template-columns: 1fr;
	}
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
	position: relative;
}

@media(prefers-color-scheme: light) {
	.mystery-button {
		background: var(--nord6);
	}
	.rosary-visualization :global(.chain) {
		stroke: var(--nord3);
	}
}

.mystery-button:hover {
	transform: translateY(-4px);
	box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.mystery-button.selected {
	border-color: var(--nord10);
	transform: translateY(-4px);
	box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.mystery-button:hover,
.mystery-button.selected { background: var(--nord4); }


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

.mystery-button.selected h3,
.mystery-button:hover h3
{
	color: var(--nord10);
	font-weight: 700;
}

/* Today's mystery badge */
.today-badge {
	position: absolute;
	top: 1rem;
	right: 1rem;
	background: var(--nord11);
	color: white;
	padding: 0.4rem 0.8rem;
	border-radius: 4px;
	font-size: 0.85rem;
	font-weight: 600;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Highlighted bead (orange for counting) */
.rosary-visualization :global(.counted-bead) {
	fill: var(--nord13) !important;
	filter: drop-shadow(0 0 8px var(--nord13));
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
}

.scroll-padding {
	height: 50vh;
}
</style>
<svelte:head>
	<title>{labels.pageTitle}</title>
	<meta name="description" content={labels.pageDescription}>
</svelte:head>

<div class="page-container">
	<h1>{labels.pageTitle}</h1>


	<h2 style="text-align:center;">{labels.mysteries}</h2>
	<!-- Mystery Selector -->
	<div class="mystery-selector" class:four-mysteries={includeLuminous}>
		<button
			class="mystery-button"
			class:selected={selectedMystery === 'freudenreich'}
			onclick={() => selectMystery('freudenreich')}
		>
			{#if todaysMystery === 'freudenreich'}
				<span class="today-badge">{labels.today}</span>
			{/if}
				<MysteryIcon type="joyful" />
			<h3>{labels.joyful}</h3>
		</button>

		<button
			class="mystery-button"
			class:selected={selectedMystery === 'schmerzhaften'}
			onclick={() => selectMystery('schmerzhaften')}
		>
			{#if todaysMystery === 'schmerzhaften'}
				<span class="today-badge">{labels.today}</span>
			{/if}
			<MysteryIcon type="sorrowful" />
			<h3>{labels.sorrowful}</h3>
		</button>

		<button
			class="mystery-button"
			class:selected={selectedMystery === 'glorreichen'}
			onclick={() => selectMystery('glorreichen')}
		>
			{#if todaysMystery === 'glorreichen'}
				<span class="today-badge">{labels.today}</span>
			{/if}
		<MysteryIcon type="glorious" />
			<h3>{labels.glorious}</h3>
		</button>

		{#if includeLuminous}
		<button
			class="mystery-button"
			class:selected={selectedMystery === 'lichtreichen'}
			onclick={() => selectMystery('lichtreichen')}
		>
			{#if todaysMystery === 'lichtreichen'}
				<span class="today-badge">{labels.today}</span>
			{/if}
					<MysteryIcon type="luminous" />

			<h3>{labels.luminous}</h3>
		</button>
		{/if}
	</div>

	<!-- Toggle Controls & Streak Counter -->
	<div class="controls-row">
		<StreakCounter streakData={data.streakData} lang={data.lang} />
		<div class="toggle-controls">
			<!-- Luminous Mysteries Toggle -->
			<Toggle
				bind:checked={includeLuminous}
				label={labels.includeLuminous}
			/>

			<!-- Language Toggle -->
			<LanguageToggle />
		</div>
	</div>

	<div class="rosary-layout">
		<!-- Sidebar: Rosary Visualization -->
		<div class="rosary-sidebar">
			<div class="rosary-visualization" bind:this={svgContainer}>
				<svg class="linear-rosary" viewBox="-100 -100 250 2200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMin meet">
					<!-- Vertical chain -->
					<line x1="25" y1={pos.cross} x2="25" y2={pos.final_paternoster + 40} class="chain" />

					<!-- Cross (at top) -->
					<g id="cross-section" data-section="cross">
						<text x="25" y={pos.cross} text-anchor="middle" font-size="80"
							class="cross-symbol" class:active-cross={activeSection === 'cross'}>♱</text>
					</g>

					<!-- First large bead (Paternoster) -->
					<circle cx="25" cy={pos.lbead1} r="15" class="large-bead" class:active-large-bead={activeSection === 'lbead1'} data-section="lbead1" />

					<!-- Three small beads -->
					<circle cx="25" cy={pos.start1} r="10" class="bead" class:active-bead={activeSection === 'start1'} data-section="start1" />
					<circle cx="25" cy={pos.start2} r="10" class="bead" class:active-bead={activeSection === 'start2'} data-section="start2" />
					<circle cx="25" cy={pos.start3} r="10" class="bead" class:active-bead={activeSection === 'start3'} data-section="start3" />

					<!-- Large bead before decades -->
					<circle cx="25" cy={pos.lbead2} r="15" class="large-bead" class:active-large-bead={activeSection === 'lbead2'} data-section="lbead2" />

					<!-- Benedictus Medal -->
					<image href="/glaube/benedictus.svg" x="5" y={pos.lbead2 + 25} width="40" height="40" />

					<!-- 5 Decades -->
					{#each [1, 2, 3, 4, 5] as d}
						{@const decadePos = pos[`secret${d}`]}
						{@const transPos = pos[`secret${d}_transition`]}
						<!-- Decade {d}: Ave Maria (10 beads) -->
						{#each Array(10) as _, i}
							<circle cx="25" cy={decadePos + DECADE_OFFSET + i * BEAD_SPACING} r="10" class="bead"
								class:active-bead={activeSection === `secret${d}`}
								class:counted-bead={i < decadeCounters[`secret${d}`]}
								data-section={`secret${d}`} />
						{/each}
						<!-- Transition: Gloria + Fatima + Paternoster (large bead) -->
						{#if d < 5}
							<circle cx="25" cy={transPos} r="15" class="large-bead" class:active-large-bead={activeSection === `secret${d}_transition`} data-section={`secret${d}_transition`} />
						{/if}
					{/each}

					<image href="/glaube/benedictus.svg" x="5" y={pos.secret5 + DECADE_OFFSET + 9 * BEAD_SPACING + 15} width="40" height="40" />
					<!-- Final transition: Gloria + Fatima -->
					<circle cx="25" cy={pos.final_transition} r="15" class="large-bead" class:active-large-bead={activeSection === 'final_transition'} data-section="final_transition" />

					<circle cx="25" cy={pos.final_salve} r="10" class="bead" class:active-bead={activeSection === 'final_salve'} data-section="final_salve" />
					<circle cx="25" cy={pos.final_schlussgebet} r="10" class="bead" class:active-bead={activeSection === 'final_schlussgebet'} data-section="final_schlussgebet" />
					<circle cx="25" cy={pos.final_michael} r="10" class="bead" class:active-bead={activeSection === 'final_michael'} data-section="final_michael" />

					<circle cx="25" cy={pos.final_paternoster} r="15" class="large-bead" class:active-large-bead={activeSection === 'final_paternoster'} data-section="final_paternoster" />
					<g data-section="final_cross">
						<text x="25" y={pos.final_cross} text-anchor="middle" font-size="80"
							class="cross-symbol" class:active-cross={activeSection === 'final_cross'}>♱</text>
					</g>

					<!-- Invisible hitboxes for larger tap targets -->
					<g class="hitboxes">
						<!-- Cross hitbox -->
						<rect x="-15" y="-30" width="80" height="80" data-section="cross" />

						<!-- Individual bead hitboxes -->
						<circle cx="25" cy={pos.lbead1} r="25" data-section="lbead1" />
						<circle cx="25" cy={pos.start1} r="20" data-section="start1" />
						<circle cx="25" cy={pos.start2} r="20" data-section="start2" />
						<circle cx="25" cy={pos.start3} r="20" data-section="start3" />
						<circle cx="25" cy={pos.lbead2} r="25" data-section="lbead2" />

						<!-- Decade hitboxes -->
						{#each [1, 2, 3, 4, 5] as d}
							{@const decadePos = pos[`secret${d}`]}
							<rect x="-15" y={decadePos - 2} width="80" height={DECADE_OFFSET + 9 * BEAD_SPACING + 12} data-section={`secret${d}`} />
						{/each}

						<!-- Transition bead hitboxes -->
						{#each [1, 2, 3, 4] as d}
							<circle cx="25" cy={pos[`secret${d}_transition`]} r="25" data-section={`secret${d}_transition`} />
						{/each}
						<circle cx="25" cy={pos.final_transition} r="25" data-section="final_transition" />
						<circle cx="25" cy={pos.final_salve} r="20" data-section="final_salve" />
						<circle cx="25" cy={pos.final_schlussgebet} r="20" data-section="final_schlussgebet" />
						<circle cx="25" cy={pos.final_michael} r="20" data-section="final_michael" />
						<circle cx="25" cy={pos.final_paternoster} r="25" data-section="final_paternoster" />
						<rect x="-15" y={pos.final_cross - 50} width="80" height="80" data-section="final_cross" />
					</g>

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
				bind:this={sectionElements.lbead1}
				data-section="lbead1"
			>
				<h3>{labels.ourFather}</h3>
				<Paternoster />
			</div>

			<!-- First Ave Maria (Faith) -->
			<div
				class="prayer-section"
				bind:this={sectionElements.start1}
				data-section="start1"
			>
				<h3>{labels.hailMary}: {labels.faith}</h3>
				<AveMaria
					mysteryLatin="Jesus, qui adáugeat nobis fidem"
					mystery="Jesus, der in uns den Glauben vermehre"
					mysteryEnglish="Jesus, who may increase our faith"
				/>
			</div>

			<!-- Second Ave Maria (Hope) -->
			<div
				class="prayer-section"
				bind:this={sectionElements.start2}
				data-section="start2"
			>
				<h3>{labels.hailMary}: {labels.hope}</h3>
				<AveMaria
					mysteryLatin="Jesus, qui corróboret nobis spem"
					mystery="Jesus, der in uns die Hoffnung stärke"
					mysteryEnglish="Jesus, who may strengthen our hope"
				/>
			</div>

			<!-- Third Ave Maria (Love) -->
			<div
				class="prayer-section"
				bind:this={sectionElements.start3}
				data-section="start3"
			>
				<h3>{labels.hailMary}: {labels.love}</h3>
				<AveMaria
					mysteryLatin="Jesus, qui perficiat in nobis caritátem"
					mystery="Jesus, der in uns die Liebe entzünde"
					mysteryEnglish="Jesus, who may kindle our love"
				/>
			</div>

			<!-- Gloria Patri before decades -->
			<div
				class="prayer-section"
				bind:this={sectionElements.lbead2}
				data-section="lbead2"
			>
				<h3>{labels.gloriaPatri}</h3>
				<GloriaPatri />
				<h3>{labels.ourFather}</h3>
				<Paternoster />
			</div>

			<!-- 5 Decades -->
			{#each [1, 2, 3, 4, 5] as decadeNum}
				<!-- Ave Maria decade (Gesätz) -->
				<div
					class="prayer-section decade"
					bind:this={sectionElements[`secret${decadeNum}`]}
					data-section={`secret${decadeNum}`}
				>
					<h2>{decadeNum}. {labels.decade}: {currentMysteryTitles[decadeNum - 1]}</h2>

					<!-- Mystery description with Bible reference button -->
					<h3>{labels.hailMary} <span class="repeat-count">(10×)</span></h3>
					<AveMaria
						mysteryLatin={currentMysteriesLatin[decadeNum - 1]}
						mystery={currentMysteries[decadeNum - 1]}
						mysteryEnglish={currentMysteriesEnglish[decadeNum - 1]}
					/>

					<!-- Bible reference and counter buttons -->
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

				<!-- Transition prayers (Gloria, Fatima, Paternoster) -->
				{#if decadeNum < 5}
					<div
						class="prayer-section"
						bind:this={sectionElements[`secret${decadeNum}_transition`]}
						data-section={`secret${decadeNum}_transition`}
					>
						<h3>{labels.gloriaPatri}</h3>
						<GloriaPatri />

						<h3>{labels.fatimaPrayer} <span class="repeat-count">({labels.optional})</span></h3>
						<FatimaGebet />

						<h3>{labels.ourFather}</h3>
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
				<h2>{labels.conclusion}</h2>

				<h3>{labels.gloriaPatri}</h3>
				<GloriaPatri />

				<h3>{labels.fatimaPrayer} <span class="repeat-count">({labels.optional})</span></h3>
				<FatimaGebet />
			</div>

			<div
				class="prayer-section"
				bind:this={sectionElements.final_salve}
				data-section="final_salve"
			>
				<h3>Salve Regina</h3>
				<SalveRegina />
			</div>

			<div
				class="prayer-section"
				bind:this={sectionElements.final_schlussgebet}
				data-section="final_schlussgebet"
			>
				<h3>{labels.finalPrayer}</h3>
				<RosaryFinalPrayer />
			</div>

			<div
				class="prayer-section"
				bind:this={sectionElements.final_michael}
				data-section="final_michael"
			>
				<h3>{labels.saintMichael}</h3>
				<MichaelGebet />
			</div>

			<div
				class="prayer-section"
				bind:this={sectionElements.final_paternoster}
				data-section="final_paternoster"
			>
				<h3>{labels.ourFather}</h3>
				<Paternoster />
			</div>

			<div
				class="prayer-section"
				bind:this={sectionElements.final_cross}
				data-section="final_cross"
			>
				<h3>{labels.signOfCross}</h3>
				<Kreuzzeichen />
				<div class="footnotes-section">
					<p><span class="symbol">♱</span>{labels.footnoteSign}</p>
				</div>
			</div>
			<button class="scroll-top-button action_button" onclick={() => window.scrollTo({ top: 0 })} aria-label="Scroll to top">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
			</button>
			<div class="scroll-padding"></div>
		</div>
	</div>

</div>

<!-- Bible citation modal -->
{#if showModal}
	<BibleModal reference={selectedReference} title={selectedTitle} verseData={selectedVerseData} onClose={() => showModal = false} />
{/if}
