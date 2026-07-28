<script lang="ts">
import { resolve } from '$app/paths';
import Symbol from "./Symbol.svelte"
import ThemeToggle from "./ThemeToggle.svelte"
import type { Snippet } from 'svelte';
import { browser } from '$app/environment';
import { networkStore } from '$lib/stores/network.svelte';

const isTauri = browser && '__TAURI__' in window;

let {
	links,
	language_selector_mobile,
	language_selector_desktop,
	right_side,
	logo_overlay,
	children,
	fullSymbol = false
}: {
	links?: Snippet;
	language_selector_mobile?: Snippet;
	language_selector_desktop?: Snippet;
	right_side?: Snippet;
	logo_overlay?: Snippet;
	children?: Snippet;
	fullSymbol?: boolean;
} = $props();
</script>
<style>
/* ═══════════════════════════════════════════
   WRAPPER & LAYOUT
   ═══════════════════════════════════════════ */
.wrapper {
	--header-h: 3rem;
	display: flex;
	flex-direction: column;
	min-height: 100svh;
}
footer {
	padding-block: 1rem;
	text-align: center;
	margin-top: auto;
	position: relative;
}

/* ═══════════════════════════════════════════
   FLOATING GLASS BAR
   ═══════════════════════════════════════════ */
.header-shell {
	position: sticky;
	/* Without a safe-area inset (regular browser tabs), keep the comfortable
	   12px gap. With an inset present (PWA / Tauri shell with notch / status
	   bar), drop the extra 12px so the bar sits just 4px below the inset
	   instead of stacking ~56px down. */
	top: max(12px, calc(env(safe-area-inset-top, 0px) + 4px));
	z-index: 100;
	margin: max(12px, calc(env(safe-area-inset-top, 0px) + 4px)) auto 0;
	width: fit-content;
	max-width: calc(100% - 1.5rem);
	border-radius: 100px;
	/* Popovers hang below the bar — they must not be clipped. */
	overflow: visible;
}
/* The frosted pane. A sibling of the bar's content, so the blur it performs
   never becomes a backdrop root for the popovers inside the bar. */
.glass {
	position: absolute;
	inset: 0;
	border-radius: inherit;
	background: var(--glass-bg);
	backdrop-filter: blur(var(--glass-blur));
	border: 1px solid var(--glass-border);
	box-shadow: 0 4px 24px var(--glass-shadow);
	view-transition-name: site-header;
	pointer-events: none;
}
nav {
	position: relative;
	display: flex;
	align-items: center;
	height: var(--header-h);
	gap: 0.4rem;
	padding: 0 0.8rem;
	border-radius: inherit;

	/* token defaults (dark bar) */
	--nav-text: #999;
	--nav-text-hover: white;
	--nav-text-active: white;
	--nav-hover-bg: rgba(255,255,255,0.1);
	--nav-active-bg: rgba(136, 192, 208, 0.25);
	--nav-btn-border: rgba(255,255,255,0.2);
	--nav-btn-border-hover: rgba(255,255,255,0.4);
	--nav-divider: rgba(255,255,255,0.15);
}
/* Dark bars need no overrides — the base token values above are the dark set,
   and the tint/border/shadow now come from --glass-* in app.css. */
/* User forced light — OR system light (default, already handled by base values) */
:global(:root[data-theme="light"]) nav {
	--nav-text: #888;
	--nav-text-hover: var(--nord0);
	--nav-text-active: var(--nord0);
	--nav-hover-bg: rgba(0,0,0,0.06);
	--nav-active-bg: rgba(94, 129, 172, 0.15);
	--nav-btn-border: rgba(0,0,0,0.15);
	--nav-btn-border-hover: rgba(0,0,0,0.3);
	--nav-divider: rgba(0,0,0,0.12);
}
/* System light preference (no data-theme set) */
@media (prefers-color-scheme: light) {
	:global(:root:not([data-theme])) nav {
		--nav-text: #888;
		--nav-text-hover: var(--nord0);
		--nav-text-active: var(--nord0);
		--nav-hover-bg: rgba(0,0,0,0.06);
		--nav-active-bg: rgba(94, 129, 172, 0.15);
		--nav-btn-border: rgba(0,0,0,0.15);
		--nav-btn-border-hover: rgba(0,0,0,0.3);
		--nav-divider: rgba(0,0,0,0.12);
	}
}

/* ═══════════════════════════════════════════
   OFFLINE PILL
   ═══════════════════════════════════════════ */
.offline-pill {
	/* Perched on the top-left corner of the nav bar like a badge — nav is
	   position: relative, so it's the containing block. */
	position: absolute;
	top: 0;
	left: 0;
	transform: translate(-35%, -50%);
	z-index: 1;
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	padding: 0.25rem 0.55rem;
	border-radius: 100px;
	font-size: 0.7rem;
	font-weight: 600;
	line-height: 1;
	color: #fff;
	background: var(--red, #bf616a);
	border: 1px solid rgba(255, 255, 255, 0.25);
	box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
	white-space: nowrap;
	pointer-events: none;
	/* Own snapshot so it isn't clipped by the nav's overflow:hidden group. */
	view-transition-name: offline-pill;
}
.offline-icon {
	flex-shrink: 0;
}
@media screen and (max-width: 800px) {
	.offline-pill {
		padding: 0.3rem;
	}
	.offline-label {
		display: none;
	}
}

/* ═══════════════════════════════════════════
   LOGO
   ═══════════════════════════════════════════ */
.logo-slot {
	position: relative;
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
}
.home-link {
	view-transition-name: nav-logo;
	display: flex;
	align-items: center;
	overflow: hidden;
	flex-shrink: 0;
	/* icon-only width by default */
	width: 20px;
}
.home-link.full {
	/* full logo with text */
	width: 134px;
}
.home-link :global(svg) {
	height: 32px;
	width: 134px;
	flex-shrink: 0;
}

/* ═══════════════════════════════════════════
   NAV LINKS (rendered via snippet)
   ═══════════════════════════════════════════ */
:global(.site_header) {
	display: flex;
	flex-direction: row;
	gap: 0.15rem;
	margin: 0;
	padding: 0;
	list-style: none;
	/* Own group so the links rise/exit with the right-hand controls. Exactly
	   one .site_header exists per page, so the name stays unique. Nothing in
	   here blurs, so being a backdrop root is harmless. */
	view-transition-name: nav-links;
}
:global(.site_header li) {
	list-style-type: none;
}
:global(.site_header li > a) {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0.35rem 0.65rem;
	font-size: 0.8rem;
	color: var(--nav-text);
	text-decoration: none;
	border-radius: 100px;
	transition: all 150ms;
	white-space: nowrap;
}
:global(a.entry),
:global(a.entry:link),
:global(a.entry:visited) {
	display: block;
	padding: 0.35rem 0.65rem;
	font-size: 0.8rem;
	color: var(--nav-text) !important;
	text-decoration: none;
	border-radius: 100px;
	transition: all 150ms;
	white-space: nowrap;
}
:global(.site_header li:hover > a),
:global(.site_header li:focus-within > a),
:global(a.entry:hover),
:global(a.entry:focus-visible) {
	color: var(--nav-text-hover) !important;
	background: var(--nav-hover-bg);
	cursor: pointer;
}
:global(.site_header li:has(a.active) > a),
:global(.site_header a.active) {
	color: var(--nav-text-active) !important;
	background: var(--nav-active-bg);
}
:global(.site_header li:has(a.active) > a > .nav-icon) {
	fill: var(--active-fill, none);
}
/* Stroke-drawn icons (bar chart, list-checks) can't be filled — their open
   axis/check paths would otherwise close into filled triangles, so keep them
   unfilled and colour only the .hl data strokes (the bars / the lines). */
:global(.site_header li:has(a.active) .nav-icon:has(.hl)) {
	fill: none;
}
:global(.site_header li:has(a.active) .nav-icon .hl) {
	stroke: var(--active-fill);
}
/* Icons where only part of the artwork is a solid body (receipt sheet, the two
   folders of folder-tree): fill just the .fill paths and leave the rest — the
   dollar sign, the tree spine — as plain strokes on top. Author them with the
   filled path first so the strokes paint over it. */
:global(.site_header li:has(a.active) .nav-icon:has(.fill)) {
	fill: none;
}
:global(.site_header li:has(a.active) .nav-icon .fill) {
	fill: var(--active-fill);
}
/* For stroke-based icons: colored shape behind the icon. The wrap is laid out
   the same active or not — an inline span would box the icon on its baseline and
   nudge the whole bar down the moment the link went active. */
:global(.site_header .nav-icon-wrap) {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
}
:global(.site_header li:has(a.active) .nav-icon-wrap::before) {
	content: '';
	position: absolute;
	inset: 2px;
	background: var(--active-fill);
	clip-path: var(--active-shape, inset(0 round 3px));
	z-index: -1;
}
/* Wallet: two rectangles — main body + top flap */
:global(.site_header li:has(a.active) .nav-icon-wallet::before) {
	inset: 4px 2px 2px 2px;
	clip-path: inset(0 round 2px);
}
:global(.site_header li:has(a.active) .nav-icon-wallet::after) {
	content: '';
	position: absolute;
	top: 2px;
	left: 2px;
	right: 18%;
	height: 3px;
	background: var(--active-fill);
	border-radius: 1.5px;
	z-index: -1;
}

/* ═══════════════════════════════════════════
   DIVIDER & RIGHT SIDE
   ═══════════════════════════════════════════ */
.spacer {
	width: 1px;
	height: 18px;
	background: var(--nav-divider);
	margin: 0 0.2rem;
	flex-shrink: 0;
}
.header-right {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	flex-shrink: 0;
	view-transition-name: nav-right;
}
/* A view-transition-name makes this a backdrop root, which flattens the
   profile menu's blur — so drop the name while the menu is open. The two are
   never needed at once: the bar only morphs during navigation, and the menu is
   closed then. Opening the menu costs nothing; navigating from inside it just
   forfeits this one group's morph. */
.header-right:has(:global(#pfp-menu-toggle:checked)) {
	view-transition-name: none;
}

/* ═══════════════════════════════════════════
   NO-LINKS VARIANT (pages without nav)
   ═══════════════════════════════════════════ */
.no-links {
	gap: 0.5rem;
}
.no-links :global(button) {
	margin-bottom: 0 !important;
}
.no-links :global(#options) {
	top: calc(100% + 10px) !important;
	bottom: unset !important;
	right: 0 !important;
	left: unset !important;
	transform: none !important;
}
.no-links :global(.top.speech::after) {
	border: 20px solid transparent !important;
	border-bottom-color: var(--color-border) !important;
	border-top: 0 !important;
	top: -10px !important;
	bottom: unset !important;
	left: unset !important;
	right: 0.25rem !important;
	margin-left: 0 !important;
}
.no-links :global(button::before) {
	display: none;
}

/* ═══════════════════════════════════════════
   VIEW TRANSITIONS
   ═══════════════════════════════════════════ */
/* Let the header bar morph its width smoothly */
:global(::view-transition-group(site-header)),
:global(::view-transition-group(nav-logo)),
:global(::view-transition-group(nav-links)),
:global(::view-transition-group(nav-right)) {
	animation-duration: 300ms;
	animation-timing-function: ease;
	/* Clips the rise/exit below, so the controls appear to travel inside the
	   bar rather than over the page. */
	overflow: hidden;
}
/* Offline badge: own group, NOT clipped — it overhangs the nav corner. */
:global(::view-transition-group(offline-pill)) {
	animation-duration: 300ms;
	animation-timing-function: ease;
	overflow: visible;
}
/* Bar & offline badge: standard morph */
:global(::view-transition-old(site-header)),
:global(::view-transition-new(site-header)),
:global(::view-transition-old(offline-pill)),
:global(::view-transition-new(offline-pill)) {
	animation-duration: 300ms;
	animation-timing-function: ease;
	height: 100%;
}

/* Bar contents — nav links (icons + labels) and the right-hand controls — ride
   in from below the bar and leave upward, so the header reads as one strip of
   content scrolling over rather than a cross-fade. Keyframes are -global-
   because they drive document-level ::view-transition pseudo-elements. */
@keyframes -global-nav-content-in {
	from { opacity: 0; transform: translateY(100%); }
	to { opacity: 1; transform: translateY(0); }
}
@keyframes -global-nav-content-out {
	from { opacity: 1; transform: translateY(0); }
	to { opacity: 0; transform: translateY(-100%); }
}
:global(::view-transition-new(nav-links)),
:global(::view-transition-new(nav-right)) {
	animation: nav-content-in 300ms ease both;
	height: 100%;
}
:global(::view-transition-old(nav-links)),
:global(::view-transition-old(nav-right)) {
	animation: nav-content-out 300ms ease both;
	height: 100%;
}
@media (prefers-reduced-motion: reduce) {
	:global(::view-transition-new(nav-links)),
	:global(::view-transition-new(nav-right)),
	:global(::view-transition-old(nav-links)),
	:global(::view-transition-old(nav-right)) {
		animation-duration: 1ms;
	}
}
/* Logo: clip-reveal instead of scale — keep natural size, left-aligned */
:global(::view-transition-old(nav-logo)),
:global(::view-transition-new(nav-logo)) {
	animation: none;
	object-fit: none;
	object-position: left center;
	height: 100%;
}

/* ═══════════════════════════════════════════
   MOBILE: compact pill, horizontal scroll
   ═══════════════════════════════════════════ */
@media screen and (max-width: 800px) {
	.header-shell {
		max-width: calc(100% - 1rem);
	}
	nav {
		gap: 0.25rem;
		padding: 0.4rem 0.6rem;
	}
	/* Mobile: hide labels, keep icons */
	:global(.site_header .nav-label) {
		display: none;
	}
	:global(.site_header li > a) {
		padding: 0.4rem;
	}
	:global(a.entry) {
		font-size: 0.75rem;
		padding: 0.3rem 0.5rem;
	}
}
</style>

<div class="wrapper" lang="de">

<!-- The shell owns the sticky placement and stays a plain box: no filter, no
     view-transition-name. Both make an element a backdrop root, which would kill
     the blur on any popover inside the bar. The frosted pane is .glass, a
     sibling of the bar's content rather than its ancestor. -->
<div class="header-shell">
<div class="glass" aria-hidden="true"></div>
<nav class:no-links={!links}>
	{#if networkStore.offline}
		<span class="offline-pill" role="status" aria-live="polite" title="No internet connection">
			<svg class="offline-icon" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
				<path d="M2 2l20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
				<path d="M5 12.5a10 10 0 0 1 4-2.4M1 8.5a16 16 0 0 1 6-3.6M12 5a16 16 0 0 1 11 3.5M19 12.5a10 10 0 0 0-3-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
				<circle cx="12" cy="19" r="1.4" fill="currentColor"/>
			</svg>
			<span class="offline-label">Offline</span>
		</span>
	{/if}
	<div class="logo-slot">
		<a href={resolve('/')} aria-label="Home" class="home-link" class:full={fullSymbol}><Symbol /></a>
		{@render logo_overlay?.()}
	</div>
	{#if links}
		{@render links()}
		<div class="spacer"></div>
	{/if}
	<div class="header-right">
		{#if !isTauri}<ThemeToggle />{/if}
		{@render language_selector_desktop?.()}
		{@render right_side?.()}
	</div>
</nav>
</div>

<main>
{@render children?.()}
</main>

<footer>
Ad maiorem Dei gloriam
</footer>
</div>
