<script lang="ts">
	export let germanUrl: string;
	export let englishUrl: string;
	export let currentLang: 'de' | 'en' = 'de';
	export let hasTranslation: boolean = true;

	function setLanguagePreference(lang: 'de' | 'en') {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('preferredLanguage', lang);
		}
	}
</script>

<style>
.language-switcher {
	position: fixed;
	top: 1rem;
	right: 1rem;
	z-index: 1000;
	display: flex;
	gap: 0.5rem;
	background: var(--nord0);
	padding: 0.5rem;
	border-radius: 8px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

@media(prefers-color-scheme: light) {
	.language-switcher {
		background: var(--nord6);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
}

.language-switcher a {
	padding: 0.5rem 1rem;
	border-radius: 4px;
	text-decoration: none;
	color: var(--nord4);
	font-weight: 600;
	font-size: 0.9rem;
	transition: all 0.2s;
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

@media(prefers-color-scheme: light) {
	.language-switcher a {
		color: var(--nord2);
	}
}

.language-switcher a:hover {
	background: var(--nord3);
	color: var(--nord6);
}

@media(prefers-color-scheme: light) {
	.language-switcher a:hover {
		background: var(--nord4);
		color: var(--nord0);
	}
}

.language-switcher a.active {
	background: var(--nord14);
	color: var(--nord0);
}

.language-switcher a.active:hover {
	background: var(--nord15);
}

.language-switcher a.disabled {
	opacity: 0.5;
	cursor: not-allowed;
	pointer-events: none;
}

.flag {
	font-size: 1.2rem;
	line-height: 1;
}

@media (max-width: 600px) {
	.language-switcher {
		top: 0.5rem;
		right: 0.5rem;
		padding: 0.25rem;
		gap: 0.25rem;
	}

	.language-switcher a {
		padding: 0.4rem 0.7rem;
		font-size: 0.85rem;
	}

	.flag {
		font-size: 1rem;
	}
}
</style>

<div class="language-switcher">
	<a
		href={germanUrl}
		class:active={currentLang === 'de'}
		aria-label="Switch to German"
		onclick={() => setLanguagePreference('de')}
	>
		<span class="flag">🇩🇪</span>
		<span class="label">DE</span>
	</a>
	{#if hasTranslation}
		<a
			href={englishUrl}
			class:active={currentLang === 'en'}
			aria-label="Switch to English"
			onclick={() => setLanguagePreference('en')}
		>
			<span class="flag">🇬🇧</span>
			<span class="label">EN</span>
		</a>
	{:else}
		<span
			class="disabled"
			title="English translation not available"
			aria-label="English translation not available"
		>
			<span class="flag">🇬🇧</span>
			<span class="label">EN</span>
		</span>
	{/if}
</div>
