<script lang="ts">
import "$lib/css/nordtheme.css"
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
	// state: force hidden state (optional)
	const nav_el = document.querySelector("nav")
	if(state === undefined) nav_el.hidden = !nav_el.hidden
	else nav_el.hidden = state
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
	display: flex !important;
	flex-direction: row;
	justify-content: space-between !important;
	align-items: center;
	box-shadow: 0 1em 1rem 0rem rgba(0,0,0,0.4);
	height: 4rem;
	padding-left: 0.5rem;
}
nav[hidden]{
	display:block;
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
	font-family: sans-serif;
	font-size: 1.2rem;
	color: inherit;
	border-radius: 1000px;
	padding: 0.5rem 0.75rem;
}
:global(a.entry),
:global(a.entry:link),
:global(a.entry:visited)
{
	text-decoration: none;
	font-family: sans-serif;
	font-size: 1.2rem;
	color: white !important;
	border-radius: 1000px;
	padding: 0.5rem 0.75rem;
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
	height: 4rem;
	width: 4rem;
	border-radius: 10000px;
}
/*:global(a:has(svg.symbol)){
	padding: 0 !important;
	width: 4rem;
	height: 4rem;
	margin-left: 1rem;
}*/
.wrapper{
	display:flex;
	flex-direction: column;
	min-height: 100svh;
}
footer{
	padding-block: 1rem;
	text-align: center;
	margin-top: auto;
}

@media screen and (max-width: 800px) {
	.button_wrapper{
		box-shadow: 0 1em 1rem 0rem rgba(0,0,0,0.4);
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: sticky;
		background-color: var(--nord0);
		width: 100%;
		height: 4rem;
		top: 0;
		z-index: 9999;
	}
	.nav_button{
		border: unset;
		background-color: unset;
		display: block;
		fill: white;
		margin-inline: 0.5rem;
		width: 2rem;
		aspect-ratio: 1;
	}
	.nav_button svg{
		width: 100%;
		height: 100%;
		transition: 100ms;
	}
	.nav_button:focus{
		fill: var(--red);
		scale: 0.9;
	}
	.nav_site{
		position: fixed;
		top: 0;
		right: 0;
		height: 100vh; /* dvh does not work, breaks because of transition and only being applied after scroll ends*/
		margin-bottom: 50vh;
		width: min(95svw, 25em);
		transition: transform 100ms;
		z-index: 10;
		flex-direction: column;
		justify-content: flex-start !important;
		align-items: left;
		justify-content: space-between!important;
		padding-inline: 0.5rem;
	}
	:global(.nav_site ul){
		width: 100% ;
	}
	.nav_site :first-child{
		display:none;
	}
	.nav_site[hidden]{
		transform: translateX(100%);
	}
	:global(.nav_site a:last-child){
		margin-bottom: 2rem;
	}

	.nav_site .links-wrapper {
		align-self: flex-start;
		width: 100%;
		margin: 2rem;
	}
	:global(.site_header){
		flex-direction: column;
		padding-top: min(10rem, 10vh);
		align-items: flex-start;
	}
	:global(.site_header li, .site_header a){
		font-size: 4rem;
	}
	:global(.site_header li > a, .site_header a){
		font-size: 2rem;
	}
	:global(.site_header li:hover),
	:global(.site_header li:focus-within){
	transform: unset;
	}
	.nav_site .header-right{
		flex-direction: column;
		position: absolute;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
	}
	.language-selector-desktop{
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
</style>
<div class=wrapper lang=de>
<div>
<div class=button_wrapper>
<a href="/" aria-label="Home"><Symbol></Symbol></a>
<div class="right-buttons">
	{@render language_selector_mobile?.()}
	<button class=nav_button onclick={() => {toggle_sidebar()}} aria-label="Toggle navigation menu"><svg xmlns="http://www.w3.org/2000/svg" height="0.5em" viewBox="0 0 448 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg></button>
</div>
</div>
<nav hidden class=nav_site>
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
