<script lang="ts">
let { tag, ref } = $props<{ tag: string, ref: string }>();
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
