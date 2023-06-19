<script>
import "$lib/components/nordtheme.css"
</script>
<style>
*{
box-sizing: border-box;
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
li:hover{
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
	margin-inline: auto;
}
nav{
	background-color: var(--nord0);
}
.wrapper{
	display:flex;
	flex-direction: column;
	min-height: 95vh;
	justify-content: space-between;
}
footer{
padding-block: 1rem;
justify-self: end;
text-align: center;
}
</style>
<div class=wrapper>
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
