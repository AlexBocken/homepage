<script>
import "$lib/components/nordtheme.css"
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
@media screen and (max-width: 500px) {
	ul{
	flex-direction: column;
	}
	li:hover,
	li:focus-within{
	transform: unset;
	}
}

nav{
	position: sticky;
	background-color: var(--nord0);
	top: 0;
	z-index: 10;
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
