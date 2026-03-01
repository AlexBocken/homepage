<script>
	import { themeStore } from '$lib/stores/theme.svelte';
	import { Sun, Moon, SunMoon } from 'lucide-svelte';
</script>

<style>
	button {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.3em;
		border-radius: 100px;
		background: transparent;
		color: var(--nav-text);
		cursor: pointer;
		transition: all 150ms;
		border: 1px solid var(--nav-btn-border);
	}
	button:hover {
		color: var(--nav-text-hover);
		border-color: var(--nav-btn-border-hover);
		background: var(--nav-hover-bg);
	}
</style>

<button
	onclick={() => themeStore.cycle()}
	aria-label="Toggle theme ({themeStore.theme})"
	title="Theme: {themeStore.theme}"
>
	{#if themeStore.theme === 'light'}
		<Sun size={14} strokeWidth={2} />
	{:else if themeStore.theme === 'dark'}
		<Moon size={14} strokeWidth={2} />
	{:else}
		<SunMoon size={14} strokeWidth={2} />
	{/if}
</button>
