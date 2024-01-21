<script lang="ts">
export let tag : string;
export let ref: string;
import '$lib/css/nordtheme.css'
</script>
<style>
a{
	background-color: var(--blue);
	text-decoration: none;
	padding: 2rem;
	border-radius: 1000000px;
	transition: 100ms;
	font-size: 2rem;
	color: white;
}
a:hover{
	transform: scale(1.1, 1.1);
	background-color: var(--red);
}
</style>

<a href="{ref}/{tag}">{tag}</a>
