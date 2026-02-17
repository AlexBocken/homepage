<script lang="ts">
import { onMount } from "svelte";
import { page } from '$app/stores';
import Symbol from "./Symbol.svelte"
import type { Snippet } from 'svelte';

let {
	links,
	language_selector_mobile,
	language_selector_desktop,
	right_side,
	children
}: {
	links?: Snippet;
	language_selector_mobile?: Snippet;
	language_selector_desktop?: Snippet;
	right_side?: Snippet;
	children?: Snippet;
} = $props();

let underlineLeft = $state(0);
let underlineWidth = $state(0);
let disableTransition = $state(false);

function toggle_sidebar(state){
	const checkbox = document.getElementById('nav-toggle')
	if(state === undefined) checkbox.checked = !checkbox.checked
	else checkbox.checked = !state
}

function updateUnderline() {
	const activeLink = document.querySelector('.site_header a.active');
	const linksWrapper = document.querySelector('.links-wrapper');

	if (activeLink && linksWrapper) {
		const wrapperRect = linksWrapper.getBoundingClientRect();
		const linkRect = activeLink.getBoundingClientRect();

		// Get computed padding to exclude from width and adjust position
		const computedStyle = window.getComputedStyle(activeLink);
		const paddingLeft = parseFloat(computedStyle.paddingLeft);
		const paddingRight = parseFloat(computedStyle.paddingRight);

		underlineLeft = linkRect.left - wrapperRect.left + paddingLeft;
		underlineWidth = linkRect.width - paddingLeft - paddingRight;
	} else {
		underlineWidth = 0;
	}
}

// Update underline when page changes
$effect(() => {
	$page.url.pathname; // Subscribe to pathname changes
	// Use setTimeout to ensure DOM has updated
	setTimeout(updateUnderline, 0);
});

onMount( () => {
	const link_els = document.querySelectorAll("nav a")
	link_els.forEach((el) => {
		el.addEventListener("click", () => {toggle_sidebar(true)});
	})

	// Initialize underline position
	updateUnderline();

	// Update underline on resize, with transition disabled
	let resizeTimer;
	function handleResize() {
		disableTransition = true;
		updateUnderline(); // Update immediately to prevent lag

		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			// Re-enable transition after resize has settled
			disableTransition = false;
		}, 150);
	}

	window.addEventListener('resize', handleResize);

	return () => {
		window.removeEventListener('resize', handleResize);
		clearTimeout(resizeTimer);
	};
})

</script>
<style>
nav{
	position: sticky;
	background-color: var(--nord0);
	top: 0;
	z-index: 10;
	display: flex;
	flex-direction: row;
	justify-content: space-between !important;
	align-items: center;
	box-shadow: 0 1em 1rem 0rem rgba(0,0,0,0.4);
	height: var(--header-h);
	padding-left: 0.5rem;
}
.nav-toggle{
	display: none;
}

:global(.site_header li),
:global(a.entry)
{
	list-style-type:none;
	transition: color 100ms;
	color: white;
	user-select: none;
}
:global(.site_header li>a)
{
	text-decoration: none;
	font-size: 1rem;
	color: inherit;
	border-radius: var(--radius-pill);
	padding: 0.4rem 0.6rem;
}
:global(a.entry),
:global(a.entry:link),
:global(a.entry:visited)
{
	text-decoration: none;
	font-size: 1rem;
	color: white !important;
	border-radius: var(--radius-pill);
	padding: 0.4rem 0.6rem;
}

:global(.site_header li:hover),
:global(.site_header li:focus-within),
:global(.site_header li:has(a.active)),
:global(a.entry:hover),
:global(a.entry:focus-visible),
:global(a.entry:link:hover),
:global(a.entry:visited:hover),
:global(a.entry:visited:focus-visible)
{
	cursor: pointer;
	color: var(--nord8) !important;
}
:global(.site_header) {
	padding-block: 1.5rem;
	display: flex;
	flex-direction: row;
	gap: 0.5rem;
	justify-content: space-evenly;
	max-width: 1000px;
	margin: 0;
	margin-inline: auto;
}
.links-wrapper {
	position: relative;
	flex: 1;
}
.active-underline {
	position: absolute;
	bottom: 1.2rem;
	height: 2px;
	background-color: var(--nord8);
	transition: left 300ms ease-out, width 300ms ease-out;
	pointer-events: none;
}
.active-underline.no-transition {
	transition: none;
}
.nav_button{
	display: none;
}
.button_wrapper{
	display: none;
	padding-inline: 0.5rem;
}
.header-shadow{
	display: none;
}
.right-buttons{
	display: flex;
	align-items: center;
	gap: 0.5rem;
}
.header-right{
	display: flex;
	align-items: center;
	gap: 0.5rem;
}
:global(svg.symbol){
	--symbol-size: calc(var(--header-h) - 1rem);
	width: var(--symbol-size);
	border-radius: 10000px;
	margin: 0.25rem;
}
/*:global(a:has(svg.symbol)){
	padding: 0 !important;
	width: 4rem;
	height: 4rem;
	margin-left: 1rem;
}*/
.wrapper{
	--header-h: 3rem;
	--symbol-size: calc(var(--header-h) - 1rem);
	display:flex;
	flex-direction: column;
	min-height: 100svh;
}
footer{
	padding-block: 1rem;
	text-align: center;
	margin-top: auto;
	position: relative;
}

@media screen and (max-width: 800px) {
	.button_wrapper{
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: sticky;
		background-color: var(--nord0);
		width: 100%;
		height: var(--header-h);
		top: 0;
		z-index: 9999;
	}
	.header-shadow{
		display: block;
		position: sticky;
		top: 0;
		width: 100%;
		height: var(--header-h);
		margin-top: calc(-1 * var(--header-h));
		box-shadow: 0 1em 1rem 0rem rgba(0,0,0,0.4);
		z-index: 9997;
		pointer-events: none;
	}
	.nav_button{
		display: inline-flex;
		align-items: center;
		justify-content: center;
		fill: white;
		margin-inline: 0.5rem;
		width: 1.25rem;
		height: 1.25rem;
		cursor: pointer;
	}
	.nav_button svg{
		width: 100%;
		height: 100%;
		transition: var(--transition-fast);
	}
	.nav_button:hover,
	.nav_button:active,
	.nav-toggle:focus-visible + .nav_button{
		fill: var(--nord8);
		scale: 0.9;
	}
	.nav_site:not(.no-links){
		position: fixed;
		top: 0;
		right: 0;
		height: 100vh; /* dvh does not work, breaks because of transition and only being applied after scroll ends*/
		margin-bottom: 50vh;
		width: min(95svw, 25em);
		z-index: 9998;
		flex-direction: column;
		padding-inline: 0.5rem;
	}
	.nav_site:not(.no-links)::before{
		content: '';
		flex: 1;
	}
	:global(.nav_site:not(.no-links) ul){
		width: 100% ;
	}
	.nav_site:not(.no-links) :first-child{
		display:none;
	}
	.nav_site:not(.no-links){
		transform: translateX(100%);
	}
	.wrapper:has(.nav-toggle:checked) .nav_site:not(.no-links){
		transform: translateX(0);
		transition: transform 100ms;
	}
	:global(.nav_site:not(.no-links) a:last-child){
		margin-bottom: 2rem;
	}

	.nav_site:not(.no-links) .links-wrapper {
		width: 100%;
		padding: 0 2rem;
	}
	:global(.site_header){
		flex-direction: column;
		align-items: flex-start;
	}
	:global(.site_header li, .site_header a){
		font-size: 1.5rem;
	}
	:global(.site_header li > a, .site_header a){
		font-size: 1.3rem;
	}
	:global(.site_header li:hover),
	:global(.site_header li:focus-within){
	transform: unset;
	}
	.nav_site:not(.no-links) .header-right{
		flex-direction: column;
		position: absolute;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
	}
	.nav_site:not(.no-links) .language-selector-desktop{
		display: none;
	}
	.active-underline {
		display: none;
	}
	:global(.nav_site .site_header a.active) {
		text-decoration: underline;
		text-decoration-color: var(--nord8);
		text-decoration-thickness: 2px;
		text-underline-offset: 0.3rem;
	}
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
	border-bottom-color: var(--nord3) !important;
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
</style>
<div class=wrapper lang=de>
<div>
{#if links}
<div class=button_wrapper>
<a href="/" aria-label="Home"><Symbol></Symbol></a>
<div class="right-buttons">
	{@render language_selector_mobile?.()}
	<input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Toggle navigation menu" />
	<label for="nav-toggle" class=nav_button aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" height="0.5em" viewBox="0 0 448 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg></label>
</div>
</div>
<div class="header-shadow"></div>
{/if}
<nav class=nav_site class:no-links={!links}>
	<a href="/" aria-label="Home"><Symbol></Symbol></a>
	<div class="links-wrapper">
		{@render links?.()}
		<div class="active-underline" class:no-transition={disableTransition} style="left: {underlineLeft}px; width: {underlineWidth}px;"></div>
	</div>
	<div class="header-right">
		<div class="language-selector-desktop">
			{@render language_selector_desktop?.()}
		</div>
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
