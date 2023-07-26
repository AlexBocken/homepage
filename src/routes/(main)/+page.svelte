<script>
</script>
<style>
section{
	padding: 2rem 1rem;
	min-height: 350px;
	overflow: hidden;
	transition: 200ms;
}
section:nth-child(3n){
	background-color: var(--nord4);
}
section:nth-child(3n+1){
	background-color: var(--nord6);
}
section:nth-child(3n+2){
	background-color: var(--nord5);
}
section:nth-child(2n) .flex{
	flex-direction: row-reverse;
}
section:nth-child(2n) img{
	object-position: right;
	left: -350px;
}
.flex{
	display: flex;
	gap: 2rem;
	flex-direction: row;
	justify-content: flex-start;
	max-width: 1000px;
	margin-inline: auto;
	min-height: 350px;
}
.flex > *:first-child{
width: 66%;
}
.flex > *:last-child{
	position: relative;
	max-width: 34%;
	background-color: red;
}
.flex > *:last-child img{
	position:absolute;
}
img{
	height: 350px;
	object-fit: cover;
}
h2{
	font-size: 3rem;
}
a{
	text-decoration: unset;
	color: var(--nord0);
	transition: 200ms;
}
section:hover{
	scale: 1.02;
}
section:has(a:hover){
	box-shadow: 1em 1em 1em 1em rgba(0,0,0, 0.3);
}
</style>

<section>
<a href="/rezepte" class=flex>
<div class=text>
<h2>Rezepte</h2>
<p>Die eigenen Rezepte für das ganze Jahr kann man hier finden. Von traditionell Kärntner Küche zu Schweizer Klassikern oder auch das ein oder andere Hipsterrezept findet man für das ganze Jahr Rezepte. An den Rezepten wird kontinuirlich gefeilscht. </p>
</div>
<div>
<img src="https://new.bocken.org/static/rezepte/thumb/al_ragu.webp" alt="">
</div>
</a>
</section>


<section>
<a href="/git" class=flex>
<div class=text>
<h2>Git</h2>
<p>Alle Möglichen eigene Codingprojekte kann man auf dieser eigenen gehosteten Gitea Instanz finden. So auch z.B. diese Website. Anki-Vokabelkarten oder auch nur kleinere Personalisierungen von Linux Desktopprogrammen à la DWM oder dmenu sind auch hier zu finden.</p>
</div>
<div>
<img src="/icons/Git.svg" alt="The Git Icon in orange">
</div>
</a>
</section>

<section>
<a href="https://stream.bocken.org" class=flex>
<div class=text>
<h2>Filme und TV Shows</h2>
<p>Die persönliche Filme und TV-Shows zum streamen gehosted via Jellyfin. Somit wird Netflix und Co. vollends ersetzt. Login notwendiged. (Zur Zeit noch separat von main-page login)</p>
</div>
<div>
<img src="/icons/Jellyfin.svg" alt="">
</div>
</a>

</section>
<section>
<a href="/bilder" class=flex>
<div class=text>
<h2>Familienbilder</h2>
<p>Lorem ipsum dolor sit amet consectetur, adipisicing elit. Iste vel, iure eius veniam, ex recusandae libero ratione tempora, molestiae vitae eos dolorum rerum enim exercitationem tempore magnam cupiditate neque quia?</p>
</div>
<div>
<img src="/familie.jpg" alt="">
</div>
</a>
</section>

<section>
	<a href="/flims" class=flex>
	<div class="text">
		<h2>Flims (WIP)</h2>
		<p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Unde cum suscipit aliquid nam facilis ipsa omnis natus. Quisquam nisi ducimus minima asperiores laboriosam modi unde quos, earum odio repellat quam.</p>
	</div>
	<div>
	<img src="/flims.jpg" alt="">
	</div>
	</a>
</section>

<section>
<a href="/abrechnung" class="flex">
	<span class="text">
		<h2>Abrechnung (WIP)</h2>
		<p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Nobis voluptate accusamus hic quasi quae assumenda accusantium excepturi voluptatem tempore sunt, mollitia rem. Doloribus natus quis accusamus atque quas explicabo illum?</p>
	</span>
	<div>
		<img src="/icons/shopping_cart.svg" alt="">
	</div>
</a>
</section>

<section>
<a href="/christ" class="flex">
	<div class="text">
		<h2>Glaube (WIP)</h2>
		<p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Placeat, quasi! Delectus totam rem officiis ea odit quaerat, vel nihil quod commodi deleniti quo eos aut voluptatum eligendi quasi nesciunt quidem!</p>
	</div>
	<div>
		<img src="" alt="">
	</div>
</a>
</section>

<section>
<a href="jitsi" class=flex>
<div class=text>
<h2>Jitsi (WIP)</h2>
<p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Libero doloremque atque totam nam voluptatum at facere itaque autem quae? Saepe hic iure delectus vero culpa maiores fuga, provident ipsam consectetur.</p>
</div>
<div>
<img src="/icons/Jitsi.svg" alt="">
</div>
</a>
</section>

<section>
<a href="/transmission" class=flex>
<div class=text>
<h2>Transmission</h2>
<p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Libero doloremque atque totam nam voluptatum at facere itaque autem quae? Saepe hic iure delectus vero culpa maiores fuga, provident ipsam consectetur.</p>
</div>
<div>
<img src="/icons/Transmission.svg" alt="">
</div>
</a>
</section>
