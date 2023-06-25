<script>
import "$lib/components/nordtheme.css"

function show_sidebar(){
	const nav_el = document.querySelector("nav")
	nav_el.hidden = !nav_el.hidden
}
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

nav{
	position: sticky;
	background-color: var(--nord0);
	top: 0;
	z-index: 10;
}
nav[hidden]{
	display:block;
}

li{
	list-style-type:none;
	transition: 100ms;
	color: white;
	user-select: none;
}
li>a{
	text-decoration: none;
	font-family: sans-serif;
	font-size: 1.2rem;
	color: inherit;
	border-radius: 1000px;
	padding: 0.5rem 1rem;
}

li:hover,
li:focus-within
{
	cursor: pointer;
	color: var(--red);
	transform: scale(1.1,1.1);
}
ul {
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
}
@media screen and (max-width: 500px) {
	.button_wrapper{
		display: flex;
		justify-content: right;
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
		width: 3rem;
		aspect-ratio: 1;
	}
	.nav_button svg{
		width: 100%;
		height: 100%;
	}
	nav{
		position: fixed;
		top: 0;
		right: 0;
		height: 100%;
		width: min(80svw, 40em);
		transition: 100ms;
		z-index: 10;
	}
	nav[hidden]{
		transform: translateX(100%);
	}

	ul{
		flex-direction: column;
		padding-top: min(10rem, 10vh);
	}
	li{
		font-size: 4rem;
	}
	li > a{
		font-size: 2rem;
	}
	li:hover,
	li:focus-within{
	transform: unset;
	}
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
</style>
<div class=wrapper>
<div>
<div class=button_wrapper>
<button class=nav_button on:click={show_sidebar}><svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg></button>
</div>
<nav hidden>
<ul>
	<li><a href="/">Home</a></li>
	<li><a href="/rezepte">Alle Rezepte</a></li>
	<li><a href="/rezepte/season">In Saison</a></li>
	<li><a href="/rezepte/category">Nach Kategorie</a></li>
	<li><a href="/rezepte/tag">Stichwörter</a></li>
</ul>
</nav>
<slot></slot>

</div>
<footer>
Ad maiorem Dei gloriam
</footer>
</div>
