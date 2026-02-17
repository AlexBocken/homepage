<script lang="ts">
let { tag, ref } = $props<{ tag: string, ref: string }>();
</script>
<style>
a{
	background-color: var(--blue);
	text-decoration: none;
	padding: clamp(0.4rem, 0.8vw, 0.8rem) clamp(0.8rem, 1.5vw, 1.5rem);
	border-radius: 1000000px;
	transition: var(--transition-fast);
	font-size: clamp(0.85rem, 1.8vw, 1.5rem);
	color: white;
}
a:hover{
	transform: scale(1.1, 1.1);
	background-color: var(--red);
}
</style>

<a href="{ref}/{tag}">{tag}</a>
