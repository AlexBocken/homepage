<script>
import Header from '$lib/components/Header.svelte'

</script>

<Header>
	<ul class=site_header slot=links>
	<li><a href="/">Home</a></li>
	<li><a href="/rezepte">Alle Rezepte</a></li>
	<li><a href="/rezepte/season">In Saison</a></li>
	<li><a href="/rezepte/category">Nach Kategorie</a></li>
	<li><a href="/rezepte/tag">Stichwörter</a></li>
	</ul>
	<slot></slot>
</Header>
