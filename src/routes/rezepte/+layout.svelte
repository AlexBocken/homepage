<script>
import "$lib/components/nordtheme.css"
</script>
<style>
:global(*){
box-sizing: border-box;
}
:global(body){
	margin:0;
	padding:0;
}
li{
	list-style-type:none;
	transition: 100ms;
	color: white;
}
li>a{
	text-decoration: none;
	font-family: sans-serif;
	font-size: 1.5rem;
	color: inherit
}
li:hover,
li:focus-within
{
	cursor: pointer;
	color: var(--red);
	transform: scale(1.1,1.1);
}

ul {
	padding-block: 2rem;
	display: flex;
	flex-direction: row;
	gap: 1rem;
	justify-content: space-evenly;
	max-width: 1000px;
	margin: 0;
	margin-inline: auto;
}
nav{
	background-color: var(--nord0);
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
<div class=wrapper style="">
<div>
<nav>
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
