<script lang="ts">
	import { resolve } from '$app/paths';
	import "$lib/css/shake.css"
	let { icon, ...restProps }: { icon: string, [key: string]: any } = $props();
</script>
<style>
	a{
		font-family: "Noto Color Emoji", "Noto Color Emoji Subset", emoji;
		font-size: 2rem;
		text-decoration: none;
		padding: 0.5em;
		background-color: light-dark(var(--nord4), #1a1a1a);
		border-radius: var(--radius-pill);
    		box-shadow: 0em 0em 0.5em 0.2em rgba(0, 0, 0, 0.2);
	}
	a:hover{
		--angle: 15deg;
		animation: shake 0.5s ease forwards;
	}

</style>
<a href={resolve('/[recipeLang=recipeLang]/icon/[icon]', { recipeLang: 'rezepte', icon })} {...restProps} >{icon}</a>
