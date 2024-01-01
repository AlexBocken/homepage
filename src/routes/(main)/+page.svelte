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
	<h2>Re&shy;zep&shy;te</h2>
<p>Die eigenen Rezepte für das ganze Jahr kann man hier finden. Von traditionell Kärntner Küche zu Schweizer Klassikern oder auch das ein oder andere Hipsterrezept findet man für das ganze Jahr Rezepte. An den Rezepten wird kontinuirlich gefeilscht. </p>
</div>
<div>
<img src="https://bocken.org/static/rezepte/thumb/ragu_aus_rindsrippen.webp" alt="">
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
	<h2>Strea&shy;ming</h2>
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
	<h2>Fa&shy;mil&shy;ien&shy;bil&shy;der</h2>
<p></p>
</div>
<div>
<img src="/icons/Photoprism.svg" alt="">
</div>
</a>
</section>

<section>
	<a href="https://cloud.bocken.org" class=flex>
		<div class=text>
			<h2>Cloud</h2>
			<p>Die priavte Cloud für Datensynchronisiserung, Kontakte und Kalender.</p>
		</div>
		<div><img src="/icons/Nextcloud.svg" alt=""></div>
	</a>
</section>
<section>
<a href="https://meet.bocken.org" class=flex>
<div class=text>
<h2>Jitsi</h2>
<p>Für die eigenene Meetings ohne ein mithören von Zoom oder Microsoft</p>
</div>
<div>
<img src="/icons/Jitsi.svg" alt="">
</div>
</a>

</section>
<section>
<a href="/searx" class=flex>
<div class=text>
	<h2>Pri&shy;va&shy;te Such&shy;ma&shy;schi&shy;ne</h2>
<p>Eine selbsgehostete Searx-Instanz für private Suche durch diese Metasuchmaschine. Überraschend gut für Manches, überraschend schlecht für Anderes.</p>
</div>
<div>
<img src="/icons/Searx.svg" alt="">
</div>
</a>
</section>

<section>
<a href="/transmission" class=flex>
<div class=text>
	<h2>Trans&shy;mis&shy;sion</h2>
<p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Libero doloremque atque totam nam voluptatum at facere itaque autem quae? Saepe hic iure delectus vero culpa maiores fuga, provident ipsam consectetur.</p>
</div>
<div>
<img src="/icons/Transmission.svg" alt="">
</div>
</a>
</section>
