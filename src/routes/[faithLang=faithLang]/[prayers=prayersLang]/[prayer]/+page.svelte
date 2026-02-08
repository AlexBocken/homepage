<script>
	import { onMount } from 'svelte';
	import { createLanguageContext } from "$lib/contexts/languageContext.js";
	import "$lib/css/christ.css";
	import "$lib/css/nordtheme.css";
	import LanguageToggle from "$lib/components/LanguageToggle.svelte";
	import Kreuzzeichen from "$lib/components/prayers/Kreuzzeichen.svelte";
	import GloriaPatri from "$lib/components/prayers/GloriaPatri.svelte";
	import Paternoster from "$lib/components/prayers/Paternoster.svelte";
	import Credo from "$lib/components/prayers/Credo.svelte";
	import AveMaria from "$lib/components/prayers/AveMaria.svelte";
	import SalveRegina from "$lib/components/prayers/SalveRegina.svelte";
	import FatimaGebet from "$lib/components/prayers/FatimaGebet.svelte";
	import Gloria from "$lib/components/prayers/Gloria.svelte";
	import MichaelGebet from "$lib/components/prayers/MichaelGebet.svelte";
	import BruderKlausGebet from "$lib/components/prayers/BruderKlausGebet.svelte";
	import JosephGebet from "$lib/components/prayers/JosephGebet.svelte";
	import Confiteor from "$lib/components/prayers/Confiteor.svelte";
	import AblassGebete from "$lib/components/prayers/AblassGebete.svelte";

	let { data } = $props();

	const langContext = createLanguageContext({ urlLang: data.lang, initialLatin: data.initialLatin });

	$effect(() => {
		langContext.lang.set(data.lang);
	});

	const isEnglish = $derived(data.lang === 'en');

	// Prayer definitions with slugs
	const prayerDefs = $derived({
		'das-heilige-kreuzzeichen': { id: 'signOfCross', name: isEnglish ? 'The Sign of the Cross' : 'Das heilige Kreuzzeichen', bilingue: true },
		'the-sign-of-the-cross': { id: 'signOfCross', name: isEnglish ? 'The Sign of the Cross' : 'Das heilige Kreuzzeichen', bilingue: true },
		'gloria-patri': { id: 'gloriaPatri', name: 'Glória Patri', bilingue: true },
		'paternoster': { id: 'paternoster', name: isEnglish ? 'Our Father' : 'Paternoster', bilingue: true },
		'our-father': { id: 'paternoster', name: isEnglish ? 'Our Father' : 'Paternoster', bilingue: true },
		'credo': { id: 'credo', name: isEnglish ? 'Nicene Creed' : 'Credo', bilingue: true },
		'nicene-creed': { id: 'credo', name: isEnglish ? 'Nicene Creed' : 'Credo', bilingue: true },
		'ave-maria': { id: 'aveMaria', name: isEnglish ? 'Hail Mary' : 'Ave Maria', bilingue: true },
		'hail-mary': { id: 'aveMaria', name: isEnglish ? 'Hail Mary' : 'Ave Maria', bilingue: true },
		'salve-regina': { id: 'salveRegina', name: 'Salve Regina', bilingue: true },
		'das-fatimagebet': { id: 'fatima', name: isEnglish ? 'Fatima Prayer' : 'Das Fatimagebet', bilingue: true },
		'fatima-prayer': { id: 'fatima', name: isEnglish ? 'Fatima Prayer' : 'Das Fatimagebet', bilingue: true },
		'gloria': { id: 'gloria', name: 'Glória', bilingue: true },
		'gebet-zum-hl-erzengel-michael': { id: 'michael', name: isEnglish ? 'Prayer to St. Michael the Archangel' : 'Gebet zum hl. Erzengel Michael', bilingue: true },
		'prayer-to-st-michael-the-archangel': { id: 'michael', name: isEnglish ? 'Prayer to St. Michael the Archangel' : 'Gebet zum hl. Erzengel Michael', bilingue: true },
		'bruder-klaus-gebet': { id: 'bruderKlaus', name: isEnglish ? 'Prayer of St. Nicholas of Flüe' : 'Bruder Klaus Gebet', bilingue: false },
		'prayer-of-st-nicholas-of-flue': { id: 'bruderKlaus', name: isEnglish ? 'Prayer of St. Nicholas of Flüe' : 'Bruder Klaus Gebet', bilingue: false },
		'josephgebet-des-hl-papst-pius-x': { id: 'joseph', name: isEnglish ? 'Prayer to St. Joseph by Pope St. Pius X' : 'Josephgebet des hl. Papst Pius X', bilingue: false },
		'prayer-to-st-joseph-by-pope-st-pius-x': { id: 'joseph', name: isEnglish ? 'Prayer to St. Joseph by Pope St. Pius X' : 'Josephgebet des hl. Papst Pius X', bilingue: false },
		'das-confiteor': { id: 'confiteor', name: isEnglish ? 'The Confiteor' : 'Das Confiteor', bilingue: true },
		'the-confiteor': { id: 'confiteor', name: isEnglish ? 'The Confiteor' : 'Das Confiteor', bilingue: true },
		'ablassgebete': { id: 'ablassgebete', name: 'Ablassgebete', bilingue: true }
	});

	const prayer = $derived(prayerDefs[data.prayer]);
	const prayerName = $derived(prayer?.name || data.prayer);
	const isBilingue = $derived(prayer?.bilingue ?? true);
	const prayerId = $derived(prayer?.id);

	const gloriaIntro = $derived(isEnglish
		? 'This ancient hymn begins with the words the angels used to celebrate the newborn Savior. It first praises God the Father, then God the Son; it concludes with homage to the Most Holy Trinity, during which one makes the sign of the cross.'
		: 'Der uralte Gesang beginnt mit den Worten, mit denen die Engelscharen den neugeborenen Welterlöser feierten. Er preist zunächst Gott Vater, dann Gott Sohn; er schliesst mit einer Huldigung an die Heiligste Dreifaltigkeit, wobei man sich mit dem grossen Kreuze bezeichnet.');

	// Toggle href for no-JS fallback (navigates to opposite latin state)
	const latinToggleHref = $derived(data.initialLatin ? '?latin=0' : '?');

	// PiP drag-to-corner logic
	let pipEl = $state(null);
	let corner = $state('bottom-right');
	let dragging = $state(false);
	let enlarged = $state(false);
	let dragOffset = { x: 0, y: 0 };
	let dragPos = $state({ x: 0, y: 0 });
	let dragMoved = false;
	let lastTapTime = 0;
	const MARGIN = 16;
	const TAP_THRESHOLD = 10; // px movement to distinguish tap from drag
	const DOUBLE_TAP_MS = 400;

	function getCornerPos(c, el) {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const r = el.getBoundingClientRect();
		const positions = {
			'top-left': { x: MARGIN, y: MARGIN },
			'top-right': { x: vw - r.width - MARGIN, y: MARGIN },
			'bottom-left': { x: MARGIN, y: vh - r.height - MARGIN },
			'bottom-right': { x: vw - r.width - MARGIN, y: vh - r.height - MARGIN },
		};
		return positions[c];
	}

	function snapToCorner(el, c) {
		const pos = getCornerPos(c, el);
		corner = c;
		dragPos = pos;
		el.style.transition = 'transform 0.25s ease';
		el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
		el.addEventListener('transitionend', () => { el.style.transition = ''; }, { once: true });
	}

	function nearestCorner(x, y, el) {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const r = el.getBoundingClientRect();
		const cx = x + r.width / 2;
		const cy = y + r.height / 2;
		const left = cx < vw / 2;
		const top = cy < vh / 2;
		return `${top ? 'top' : 'bottom'}-${left ? 'left' : 'right'}`;
	}

	function onPointerDown(e) {
		if (!pipEl || window.matchMedia('(min-width: 1024px)').matches) return;
		dragging = true;
		dragMoved = false;
		const r = pipEl.getBoundingClientRect();
		dragOffset = { x: e.clientX - r.left, y: e.clientY - r.top };
		pipEl.setPointerCapture(e.pointerId);
		pipEl.style.transition = '';
		e.preventDefault();
	}

	function onPointerMove(e) {
		if (!dragging || !pipEl) return;
		const x = e.clientX - dragOffset.x;
		const y = e.clientY - dragOffset.y;
		if (!dragMoved) {
			const dx = Math.abs(x - dragPos.x);
			const dy = Math.abs(y - dragPos.y);
			if (dx > TAP_THRESHOLD || dy > TAP_THRESHOLD) dragMoved = true;
		}
		dragPos = { x, y };
		pipEl.style.transform = `translate(${x}px, ${y}px)`;
	}

	function toggleEnlarged() {
		if (!pipEl) return;
		const rect = pipEl.getBoundingClientRect();
		const vh = window.innerHeight / 100;
		const currentH = enlarged ? 37.5 * vh : 25 * vh;
		const targetH = enlarged ? 25 * vh : 37.5 * vh;
		const ratio = targetH / currentH;

		enlarged = !enlarged;

		// Calculate new size and keep the anchored corner fixed
		const newW = rect.width * ratio;
		const newH = rect.height * ratio;
		let newX = rect.left;
		let newY = rect.top;
		if (corner.includes('right')) newX = rect.right - newW;
		if (corner.includes('bottom')) newY = rect.bottom - newH;

		dragPos = { x: newX, y: newY };
		pipEl.style.transition = 'transform 0.25s ease';
		pipEl.style.transform = `translate(${newX}px, ${newY}px)`;
		pipEl.addEventListener('transitionend', () => {
			pipEl.style.transition = '';
		}, { once: true });
	}

	function onPointerUp(e) {
		if (!dragging || !pipEl) return;
		dragging = false;

		if (!dragMoved) {
			// It was a tap, check for double-tap
			const now = Date.now();
			if (now - lastTapTime < DOUBLE_TAP_MS) {
				lastTapTime = 0;
				toggleEnlarged();
				return;
			}
			lastTapTime = now;
		}

		const r = pipEl.getBoundingClientRect();
		snapToCorner(pipEl, nearestCorner(r.left, r.top, pipEl));
	}

	function onResize() {
		if (!pipEl) return;
		const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
		if (isDesktop) {
			pipEl.style.opacity = '';
			return;
		}
		const pos = getCornerPos(corner, pipEl);
		dragPos = pos;
		pipEl.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
		pipEl.style.opacity = '1';
	}

	onMount(() => {
		// Clean up URL params after hydration (state is now in component state)
		if (window.location.search) {
			history.replaceState({}, '', window.location.pathname);
		}

		// Initial position for PiP
		if (pipEl && !window.matchMedia('(min-width: 1024px)').matches) {
			const pos = getCornerPos(corner, pipEl);
			dragPos = pos;
			pipEl.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
			pipEl.style.opacity = '1';
		}

		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});
</script>

<svelte:head>
	<title>{prayerName} - Bocken</title>
</svelte:head>

<style>
.container {
	max-width: 700px;
	margin: auto;
	padding: 1em;
}
h1 {
	text-align: center;
	font-size: 2.5rem;
	margin-bottom: 0.5em;
}
.toggle-controls {
	display: flex;
	justify-content: center;
	margin-bottom: 2rem;
}
.gebet {
	text-align: center;
	font-size: 1.25em;
}
:global(.gebet v) {
	margin: 0;
	display: block;
}
:global(.gebet v:lang(la)) {
	color: var(--nord6);
}
:global(.bilingue v:lang(de)) {
	color: grey;
}
:global(.bilingue .monolingual v:lang(de)) {
	color: inherit;
}
:global(.bilingue .monolingual v:lang(de) i) {
	color: var(--nord11);
}
:global(.gebet i) {
	font-style: normal;
	color: var(--nord11);
	font-weight: 900;
}
.gebet-wrapper {
	padding: 1.5em;
	background-color: var(--accent-dark);
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
.intro {
	margin-bottom: 1em;
	font-style: italic;
	text-align: center;
}
@media (prefers-color-scheme: light) {
	.gebet-wrapper {
		background-color: var(--nord5);
	}
}
.crucifix-layout {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin: auto;
	padding: 0 1em;
}
.crucifix-layout .crucifix-wrap {
	position: fixed;
	top: 0;
	left: 0;
	z-index: 10000;
	width: auto;
	opacity: 0;
	touch-action: none;
	cursor: grab;
	user-select: none;
}
.crucifix-layout .crucifix-wrap:active {
	cursor: grabbing;
}
.crucifix-layout .crucifix-wrap img {
	height: 25vh;
	width: auto;
	object-fit: contain;
	border-radius: 6px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	pointer-events: none;
	transition: height 0.25s ease;
}
.crucifix-layout .crucifix-wrap.enlarged img {
	height: 37.5vh;
}
.crucifix-layout .prayer-scroll {
	width: 100%;
	max-width: 700px;
}
@media (min-width: 1024px) {
	.crucifix-layout {
		flex-direction: row;
		align-items: flex-start;
		gap: 2em;
	}
	.crucifix-layout .prayer-scroll {
		flex: 0 1 700px;
	}
	.crucifix-layout .crucifix-wrap {
		position: sticky;
		top: 4rem;
		left: auto;
		transform: none !important;
		opacity: 1;
		flex: 1;
		background-color: transparent;
		padding: 0;
		order: 1;
		cursor: default;
		touch-action: auto;
		user-select: auto;
	}
	.crucifix-layout .crucifix-wrap img {
		max-height: calc(100vh - 4rem);
		height: auto;
		width: 100%;
		object-fit: contain;
		border-radius: 0;
		box-shadow: none;
	}
}
@media (prefers-color-scheme: light) {
	.crucifix-layout .crucifix-wrap {
		background-color: var(--nord5);
	}
}
@media (prefers-color-scheme: light) and (min-width: 1024px) {
	.crucifix-layout .crucifix-wrap {
		background-color: transparent;
	}
}
@media (min-width: 1400px) {
	.crucifix-layout::before {
		content: '';
		flex: 1;
		order: -1;
	}
}
</style>
	{#if prayerId === 'ablassgebete'}

<h1>{prayerName}</h1>

	<div class="toggle-controls">
		<LanguageToggle
			initialLatin={data.initialLatin}
			hasUrlLatin={data.hasUrlLatin}
			href={latinToggleHref}
		/>
	</div>

	<div class="crucifix-layout">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="crucifix-wrap"
			class:enlarged
			bind:this={pipEl}
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
		>
			<img src="/glaube/crucifix.webp" alt="Crucifix">
		</div>
		<div class="prayer-scroll">
			<div class="gebet-wrapper">
				<div class="gebet" class:bilingue={isBilingue}>
					<AblassGebete verbose={true} />
				</div>
			</div>
		</div>
	</div>
	{:else}
<div class="container">
	<h1>{prayerName}</h1>

	<div class="toggle-controls">
		<LanguageToggle
			initialLatin={data.initialLatin}
			hasUrlLatin={data.hasUrlLatin}
			href={latinToggleHref}
		/>
	</div>


	<div class="gebet-wrapper">
		{#if prayerId === 'gloria'}
			<p class="intro">{gloriaIntro}</p>
		{/if}
		<div class="gebet" class:bilingue={isBilingue}>
			{#if prayerId === 'signOfCross'}
				<Kreuzzeichen />
			{:else if prayerId === 'gloriaPatri'}
				<GloriaPatri />
			{:else if prayerId === 'paternoster'}
				<Paternoster />
			{:else if prayerId === 'credo'}
				<Credo />
			{:else if prayerId === 'aveMaria'}
				<AveMaria />
			{:else if prayerId === 'salveRegina'}
				<SalveRegina />
			{:else if prayerId === 'fatima'}
				<FatimaGebet />
			{:else if prayerId === 'gloria'}
				<Gloria />
			{:else if prayerId === 'michael'}
				<MichaelGebet />
			{:else if prayerId === 'bruderKlaus'}
				<BruderKlausGebet />
			{:else if prayerId === 'joseph'}
				<JosephGebet />
			{:else if prayerId === 'confiteor'}
				<Confiteor />
			{/if}
		</div>
	</div>
</div>
{/if}
