<script>
import "$lib/components/nordtheme.css"
import { onMount } from "svelte";
import Symbol from "./Symbol.svelte"

function toggle_sidebar(state){
	// state: force hidden state (optional)
	const nav_el = document.querySelector("nav")
	if(state === undefined) nav_el.hidden = !nav_el.hidden
	else nav_el.hidden = state
}

onMount( () => {
const link_els = document.querySelectorAll("nav a")
link_els.forEach((el) => {
	el.addEventListener("click", () => {toggle_sidebar(true)});
})
})

</script>
<style>
:global(*){
box-sizing: border-box;
font-family: sans-serif;
}
:global(body){
	margin:0;
	padding:0;
	background-color: #fbf9f3;
	overflow-x: hidden;
}
@media (prefers-color-scheme: dark) {
	:global(body){
		color: white;
		background-color: var(--background-dark);
	}
}

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
}
nav[hidden]{
	display:block;
}

:global(.site_header li),
:global(a.entry)
{
	list-style-type:none;
	transition: 100ms;
	color: white;
	user-select: none;
}
:global(.site_header li>a),
:global(.entry)
{
	text-decoration: none;
	font-family: sans-serif;
	font-size: 1.2rem;
	color: inherit;
	border-radius: 1000px;
	padding: 0.5rem 1rem;
}

:global(.site_header li:hover),
:global(.site_header li:focus-within),
:global(.entry:hover),
:global(.entry:focus-visible)
{
	cursor: pointer;
	color: var(--red);
	transform: scale(1.1,1.1);
}
:global(.site_header) {
	padding-block: 1.5rem;
	display: flex;
	flex-direction: row;
	gap: 1rem;
	justify-content: space-evenly;
	max-width: 1000px;
	margin: 0;
	margin-inline: auto;
}
.nav_button{
	display: none;
}
.button_wrapper{
	display: none;
	padding-inline: 0.5rem;
}
:global(svg.symbol){
	height: 3.5rem;
	width: 3.5rem;
	border-radius: 10000px;
}
:global(a:has(svg.symbol)){
	padding: 0 !important;
	width: 3.5rem;
	height: 3.5rem;
	margin-left: 1rem;
}
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
		margin-inline: 1rem;
		width: 2.5rem;
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
		transition: 100ms;
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

	:global(.site_header){
		flex-direction: column;
		padding-top: min(10rem, 10vh);
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
}
</style>
<div class=wrapper lang=de>
<div>
<div class=button_wrapper>
<a href="/"><Symbol></Symbol></a>
<button class=nav_button on:click={() => {toggle_sidebar()}}><svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg></button>
</div>
<nav hidden class=nav_site>
	<a class=entry href="/"><Symbol></Symbol></a>
	<slot name=links></slot>
	<slot name=right_side></slot>
</nav>

<slot></slot>

</div>
<footer>
Ad maiorem Dei gloriam
</footer>
</div>
