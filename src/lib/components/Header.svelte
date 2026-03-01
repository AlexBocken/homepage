<script lang="ts">
import Symbol from "./Symbol.svelte"
import ThemeToggle from "./ThemeToggle.svelte"
import type { Snippet } from 'svelte';

let {
	links,
	language_selector_mobile,
	language_selector_desktop,
	right_side,
	children,
	fullSymbol = false
}: {
	links?: Snippet;
	language_selector_mobile?: Snippet;
	language_selector_desktop?: Snippet;
	right_side?: Snippet;
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
nav {
	position: sticky;
	top: 12px;
	z-index: 100;
	display: flex;
	align-items: center;
	height: var(--header-h);
	gap: 0.4rem;
	padding: 0 0.8rem;
	margin: 12px auto 0;
	width: fit-content;
	max-width: calc(100% - 1.5rem);
	border-radius: 100px;
	background: var(--nav-bg, rgba(46, 52, 64, 0.82));
	backdrop-filter: blur(16px);
	-webkit-backdrop-filter: blur(16px);
	border: 1px solid var(--nav-border, rgba(255,255,255,0.08));
	box-shadow: 0 4px 24px var(--nav-shadow, rgba(0,0,0,0.25));
	view-transition-name: site-header;

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
/* Dark system preference */
@media (prefers-color-scheme: dark) {
	nav {
		--nav-bg: rgba(20, 20, 20, 0.78);
		--nav-border: rgba(255,255,255,0.06);
	}
}
/* User forced dark */
:global(:root[data-theme="dark"]) nav {
	--nav-bg: rgba(20, 20, 20, 0.78);
	--nav-border: rgba(255,255,255,0.06);
}
/* User forced light — OR system light (default, already handled by base values) */
:global(:root[data-theme="light"]) nav {
	--nav-bg: rgba(255, 255, 255, 0.82);
	--nav-border: rgba(0,0,0,0.08);
	--nav-shadow: rgba(0,0,0,0.1);
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
		--nav-bg: rgba(255, 255, 255, 0.82);
		--nav-border: rgba(0,0,0,0.08);
		--nav-shadow: rgba(0,0,0,0.1);
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
   LOGO
   ═══════════════════════════════════════════ */
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
.links-wrapper {
	display: contents;
}
:global(.site_header) {
	display: flex;
	flex-direction: row;
	gap: 0.15rem;
	margin: 0;
	padding: 0;
	list-style: none;
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
/* For stroke-based icons: colored shape behind the icon */
:global(.site_header li:has(a.active) .nav-icon-wrap) {
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
:global(::view-transition-group(nav-right)) {
	animation-duration: 300ms;
	animation-timing-function: ease;
	overflow: hidden;
}
/* Header & right side: standard morph */
:global(::view-transition-old(site-header)),
:global(::view-transition-new(site-header)),
:global(::view-transition-old(nav-right)),
:global(::view-transition-new(nav-right)) {
	animation-duration: 300ms;
	animation-timing-function: ease;
	height: 100%;
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
	nav {
		gap: 0.25rem;
		padding: 0.4rem 0.6rem;
		max-width: calc(100% - 1rem);
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
<div>

<nav class:no-links={!links}>
	<a href="/" aria-label="Home" class="home-link" class:full={fullSymbol}><Symbol /></a>
	{#if links}
		<div class="links-wrapper">
			{@render links()}
		</div>
		<div class="spacer"></div>
	{/if}
	<div class="header-right">
		<ThemeToggle />
		{@render language_selector_desktop?.()}
		{@render right_side?.()}
	</div>
</nav>

<main>
{@render children?.()}
</main>

</div>
<footer>
Ad maiorem Dei gloriam
</footer>
</div>
