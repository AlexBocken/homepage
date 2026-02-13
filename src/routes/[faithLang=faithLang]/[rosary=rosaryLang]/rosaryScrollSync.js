import { sectionPositions } from './rosaryData.js';

/**
 * Sets up bidirectional scroll synchronization between the prayer sections,
 * the SVG rosary visualization, and the mystery image column.
 *
 * @param {object} opts
 * @param {() => HTMLElement} opts.getSvgContainer - getter for the SVG scroll container
 * @param {() => object} opts.getSectionElements - getter for the section-name → DOM element map
 * @param {() => HTMLElement} opts.getMysteryImageContainer - getter for the image column container
 * @param {() => string} opts.getActiveSection - getter for current active section
 * @param {(s: string) => void} opts.setActiveSection - setter for active section
 * @returns {() => void} cleanup function
 */
export function setupScrollSync({
	getSvgContainer,
	getSectionElements,
	getMysteryImageContainer,
	getActiveSection,
	setActiveSection,
}) {
	let scrollLock = null; // 'prayer', 'svg', or 'click'
	let scrollLockTimeout = null;

	const setScrollLock = (source, duration = 1000) => {
		scrollLock = source;
		clearTimeout(scrollLockTimeout);
		scrollLockTimeout = setTimeout(() => {
			scrollLock = null;
		}, duration);
	};

	// Helper: convert SVG section position to pixel scroll target
	function svgSectionToPixel(svg, section) {
		const svgYPosition = sectionPositions[section];
		if (svgYPosition === undefined) return null;
		const viewBox = svg.viewBox.baseVal;
		const svgHeight = svg.clientHeight;
		const viewBoxHeight = viewBox.height;

		const computedStyle = window.getComputedStyle(svg);
		const matrix = new DOMMatrix(computedStyle.transform);
		const cssScale = matrix.a || 1;

		const scale = (svgHeight / viewBoxHeight) * cssScale;
		return svgYPosition * scale;
	}

	// Set up Intersection Observer for scroll tracking (prayers → SVG)
	const observer = new IntersectionObserver((entries) => {
		const svgContainer = getSvgContainer();
		const sectionElements = getSectionElements();

		entries.forEach((entry) => {
			if (entry.isIntersecting && scrollLock !== 'svg' && scrollLock !== 'click') {
				// Skip observer updates when at the top — handleWindowScroll handles this
				if (window.scrollY < 50) return;

				const section = entry.target.dataset.section;
				setActiveSection(section);

				// Scroll SVG to keep active section visible at top
				if (svgContainer && sectionPositions[section] !== undefined) {
					const svg = svgContainer.querySelector('svg');
					if (!svg) return;

					const pixelPosition = svgSectionToPixel(svg, section);
					if (pixelPosition === null) return;
					const targetScroll = pixelPosition - 100;

					setScrollLock('prayer');
					svgContainer.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
				}
			}
		});
	}, {
		root: null,
		rootMargin: "-20% 0px -60% 0px",
		threshold: 0
	});

	// Observe all prayer sections
	const sectionElements = getSectionElements();
	Object.values(sectionElements).forEach((el) => {
		if (el) observer.observe(el);
	});

	// Detect when user scrolls past all prayers and snap SVG to bottom or top
	const handleWindowScroll = () => {
		const svgContainer = getSvgContainer();
		const sectionElements = getSectionElements();
		const mysteryImageContainer = getMysteryImageContainer();
		if (scrollLock === 'svg' || scrollLock === 'click' || !svgContainer) return;

		const viewportHeight = window.innerHeight;
		const scrollY = window.scrollY;
		const documentHeight = document.documentElement.scrollHeight;

		const firstSection = sectionElements.cross;
		const finalSection = sectionElements.final_cross;
		if (!firstSection || !finalSection) return;

		const firstSectionRect = firstSection.getBoundingClientRect();
		const finalSectionRect = finalSection.getBoundingClientRect();

		if (scrollY < 50) {
			setActiveSection('cross');
			if (svgContainer.scrollTop > 10) {
				setScrollLock('prayer');
				svgContainer.scrollTop = 0;
			}
			if (mysteryImageContainer && mysteryImageContainer.scrollTop > 10) {
				mysteryImageContainer.scrollTop = 0;
			}
		}
		else if (scrollY + viewportHeight >= documentHeight - 50) {
			const maxScroll = svgContainer.scrollHeight - svgContainer.clientHeight;
			if (svgContainer.scrollTop < maxScroll - 10) {
				setScrollLock('prayer');
				svgContainer.scrollTo({ top: maxScroll, behavior: 'smooth' });
			}
		}
		else if (firstSectionRect.top > viewportHeight * 0.6) {
			if (svgContainer.scrollTop > 10) {
				setScrollLock('prayer');
				svgContainer.scrollTo({ top: 0, behavior: 'smooth' });
			}
			if (mysteryImageContainer && mysteryImageContainer.scrollTop > 10) {
				mysteryImageContainer.scrollTo({ top: 0, behavior: 'smooth' });
			}
		}
		else if (finalSectionRect.bottom < viewportHeight * 0.4) {
			const maxScroll = svgContainer.scrollHeight - svgContainer.clientHeight;
			if (svgContainer.scrollTop < maxScroll - 10) {
				setScrollLock('prayer');
				svgContainer.scrollTo({ top: maxScroll, behavior: 'smooth' });
			}
		}
	};

	window.addEventListener('scroll', handleWindowScroll, { passive: true });

	// Debounce SVG scroll handler to avoid excessive updates
	let svgScrollTimeout = null;
	const handleSvgScroll = () => {
		const svgContainer = getSvgContainer();
		const sectionElements = getSectionElements();
		if (scrollLock === 'prayer' || scrollLock === 'click' || !svgContainer) return;

		clearTimeout(svgScrollTimeout);
		svgScrollTimeout = setTimeout(() => {
			const svg = svgContainer.querySelector('svg');
			if (!svg) return;

			const scrollTop = svgContainer.scrollTop;
			const viewBox = svg.viewBox.baseVal;
			const svgHeight = svg.clientHeight;
			const viewBoxHeight = viewBox.height;

			const computedStyle = window.getComputedStyle(svg);
			const matrix = new DOMMatrix(computedStyle.transform);
			const cssScale = matrix.a || 1;

			const scale = (svgHeight / viewBoxHeight) * cssScale;
			const svgY = scrollTop / scale;

			let closestSection = 'cross';
			let closestDistance = Infinity;

			for (const [section, position] of Object.entries(sectionPositions)) {
				const distance = Math.abs(svgY - position);
				if (distance < closestDistance) {
					closestDistance = distance;
					closestSection = section;
				}
			}

			if (closestSection !== getActiveSection() && sectionElements[closestSection]) {
				setActiveSection(closestSection);
				setScrollLock('svg');

				const element = sectionElements[closestSection];
				const elementTop = element.getBoundingClientRect().top + window.scrollY;
				const offset = parseFloat(getComputedStyle(document.documentElement).fontSize) * 3;

				window.scrollTo({ top: elementTop - offset, behavior: 'smooth' });
			}
		}, 150);
	};

	const svgContainer = getSvgContainer();
	if (svgContainer) {
		svgContainer.addEventListener('scroll', handleSvgScroll);
	}

	// Handle clicks on SVG elements to jump to prayers
	// preventDefault() overrides the anchor-link fallback when JS is enabled
	const handleSvgClick = (e) => {
		const svgContainer = getSvgContainer();
		const sectionElements = getSectionElements();
		let target = e.target;
		while (target && target !== svgContainer) {
			const section = target.dataset.section;
			if (section && sectionElements[section]) {
				e.preventDefault();
				setActiveSection(section);
				setScrollLock('click', 1500);

				// Scroll the SVG visualization to the clicked section
				if (sectionPositions[section] !== undefined) {
					const svg = svgContainer.querySelector('svg');
					if (svg) {
						const pixelPosition = svgSectionToPixel(svg, section);
						if (pixelPosition !== null) {
							const targetScroll = pixelPosition - 100;
							svgContainer.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
						}
					}
				}

				// Scroll the prayers to the corresponding section
				const element = sectionElements[section];
				const elementTop = element.getBoundingClientRect().top + window.scrollY;
				const offset = parseFloat(getComputedStyle(document.documentElement).fontSize) * 3;

				window.scrollTo({ top: elementTop - offset, behavior: 'smooth' });

				break;
			}
			target = target.parentElement;
		}
	};

	const svg = svgContainer?.querySelector('svg');
	if (svg) {
		svg.addEventListener('click', handleSvgClick);
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
}
