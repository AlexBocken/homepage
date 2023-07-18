<script>
import Header from '$lib/components/Header.svelte'

</script>

<Header>
	<ul class=site_header slot=links>
	<li><a href="/rezepte">Rezepte</a></li>
	<li><a href="/bilder">Bilder</a></li>
	<li><a href="/git">Git</a></li>
	<li><a href="/transmission">Transmission</a></li>
	</ul>
	<slot></slot>
</Header>
