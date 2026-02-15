<script lang="ts">
	import "$lib/css/shake.css"
	let { icon, ...restProps } = $props<{ icon: string, [key: string]: any }>();
</script>
<style>
	a{
		font-family: "Noto Color Emoji", emoji;
		font-size: 2rem;
		text-decoration: none;
		padding: 0.5em;
		background-color: var(--nord4);
		border-radius: 1000px;
    		box-shadow: 0em 0em 0.5em 0.2em rgba(0, 0, 0, 0.2);
	}
	@media (prefers-color-scheme: dark) {
		a{
			background-color: var(--accent-dark);
		}
	}
	a:hover{
		--angle: 15deg;
		animation: shake 0.5s ease forwards;
	}

</style>
<a href="/rezepte/icon/{icon}" {...restProps} >{icon}</a>
