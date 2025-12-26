<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { recipeTranslationStore } from '$lib/stores/recipeTranslation';

	let { user, showLanguageSelector = false } = $props();

	let currentLang = $state('de');
	let currentPath = $state('');

	$effect(() => {
		// Update current language and path when page changes
		if (typeof window !== 'undefined') {
			const path = window.location.pathname;
			currentPath = path;
			if (path.startsWith('/recipes')) {
				currentLang = 'en';
			} else if (path.startsWith('/rezepte')) {
				currentLang = 'de';
			} else if (path === '/') {
				// On main page, read from localStorage
				const preferredLanguage = localStorage.getItem('preferredLanguage');
				currentLang = preferredLanguage === 'en' ? 'en' : 'de';
			}
		}
	});

	function toggle_options(){
		const el = document.querySelector("#options")
		el.hidden = !el.hidden
	}

	function toggle_language_options(){
		const el = document.querySelector("#language-options")
		el.hidden = !el.hidden
	}

	function switchLanguage(lang: 'de' | 'en') {
		// Update the current language state immediately
		currentLang = lang;

		// Store preference
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('preferredLanguage', lang);
		}

		// Get the current path directly from window
		const path = typeof window !== 'undefined' ? window.location.pathname : currentPath;

		// If on main page, dispatch event instead of reloading
		if (path === '/') {
			window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
			return;
		}

		// If we have recipe translation data from store, use the correct short names
		const recipeData = $recipeTranslationStore;
		if (recipeData) {
			if (lang === 'en' && recipeData.englishShortName) {
				goto(`/recipes/${recipeData.englishShortName}`);
				return;
			} else if (lang === 'de' && recipeData.germanShortName) {
				goto(`/rezepte/${recipeData.germanShortName}`);
				return;
			}
		}

		// Convert current path to target language (for non-recipe pages)
		let newPath = path;
		if (lang === 'en' && path.startsWith('/rezepte')) {
			newPath = path.replace('/rezepte', '/recipes');
		} else if (lang === 'de' && path.startsWith('/recipes')) {
			newPath = path.replace('/recipes', '/rezepte');
		} else if (!path.startsWith('/rezepte') && !path.startsWith('/recipes')) {
			// On other pages (glaube, cospend, etc), go to recipe home
			newPath = lang === 'en' ? '/recipes' : '/rezepte';
		}

		goto(newPath);
	}

	onMount( () => {
		document.addEventListener("click", (e) => {
			const userButton = document.querySelector("#button")
			const langButton = document.querySelector("#language-button")

			if(userButton && !userButton.contains(e.target)){
				const options = document.querySelector("#options");
				if (options) options.hidden = true;
			}

			if(langButton && !langButton.contains(e.target)){
				const langOptions = document.querySelector("#language-options");
				if (langOptions) langOptions.hidden = true;
			}
		})
	})
</script>
<style>
	/* (A) SPEECH BOX */
.speech {
  /* (A1) FONT */
   font-size: 1.1em;

  /* (A2) COLORS */
  color: #fff;
  background: var(--bg_color);

  /* (A3) DIMENSIONS + POSITION */
  position: relative;
  border-radius: 10px;
}

/* (B) ADD SPEECH "CALLOUT TAIL" */
/* (B1) USE ::AFTER TO CREATE THE "TAIL" */
.speech::after {
  /* (B1-1) ATTACH TRANSPARENT BORDERS */
  content: "";
  border: 20px solid transparent;

  /* (B1-2) NECESSARY TO POSITION THE "TAIL" */
  position: absolute;
}

/* (C) DIFFERENT TAIL POSITIONS */
/* (C1) TOP */
.top.speech::after {
  /* (C1-1) UP TRIANGLE */
  border-bottom-color: var(--bg_color);
  border-top: 0;

  /* (C1-2) POSITION AT TOP */
  top: -10px; left:84.5%;
  margin-left: -20px;
}


	button{
		--margin-right: 1rem;
		position: relative;
		background-color: transparent;
		border: none;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		margin-right: var(--margin-right);
		background-color: var(--nord4);
		background-position: center;
		background-size: contain;
	}
	.language-selector{
		position: relative;
	}
	#language-button{
		width: auto;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		background-color: var(--nord3);
		color: white;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 100ms;
	}
	#language-button:hover{
		background-color: var(--nord2);
	}
	#language-options{
		--bg_color: var(--nord3);
		box-sizing: border-box;
		border-radius: 5px;
		position: absolute;
		right: 0;
		top: calc(100% + 10px);
		background-color: var(--bg_color);
		width: 10ch;
		padding: 0.5rem;
		z-index: 1000;
	}
	#language-options button{
		width: 100%;
		background-color: transparent;
		color: white;
		border: none;
		padding: 0.5rem;
		margin: 0;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
		text-align: left;
		transition: background-color 100ms;
	}
	#language-options button:hover{
		background-color: var(--nord2);
	}
	#language-options button.active{
		background-color: var(--nord14);
	}
	.header-right{
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	#options{
		--bg_color: var(--nord3);
		box-sizing: border-box;
		border-radius: 5px;
		position: absolute;
		right: calc( -1*var(--margin-right) + 0.25rem);
		top: calc(100% + 10px);
		background-color: var(--bg_color);
		width: 30ch;
		padding: 1rem;
	}
	#options ul{
		color: white;
		font-size: 1.2rem;
		width: 100%;
		list-style-type: none;
		padding: 0;
	}
	#options li{
		margin-block: 0.5rem;
		text-align: left;
	}
	#options li a{
		text-decoration: none;
		color: white;
		text-align: left;
		transition: 100ms;
	}
	#options li:hover a{
		color: var(--red);
	}
	/* (B2) BOTTOM "CALLOUT TAIL" */
h2{
	margin-block: 0;
	font-size: 1.2rem;
}
h2 + p{
	padding-top: 0;
	margin-top: 0;
	font-size: 1.2rem;
}
@media screen and (max-width: 800px){
	#options{
		top: unset;
		bottom: calc(100% + 15px);
		right: -200%;
		z-index: 99999999999999999999;
	}
	.top.speech::after {
	  /* (B2-1) DOWN TRIANGLE */
	  border-top-color: #a53d38;
	  border-bottom: 0;
		z-index: 99999999999999999999;

	  /* (B2-2) POSITION AT BOTTOM */
	  bottom: -20px; left: 50%;
	  margin-left: -20px;
	}
	button{
		margin-bottom: 2rem;
	}
}
</style>

<div class="header-right">
	{#if showLanguageSelector}
		<div class="language-selector">
			<button on:click={toggle_language_options} id="language-button">
				{currentLang.toUpperCase()}
			</button>
			<div id="language-options" hidden>
				<button
					class:active={currentLang === 'de'}
					on:click={() => switchLanguage('de')}
				>
					DE
				</button>
				<button
					class:active={currentLang === 'en'}
					on:click={() => switchLanguage('en')}
				>
					EN
				</button>
			</div>
		</div>
	{/if}

	{#if user}
		<button on:click={toggle_options} style="background-image: url(https://bocken.org/static/user/thumb/{user.nickname}.webp)" id=button>
		<div id=options class="speech top" hidden>
				<h2>{user.name}</h2>
				<p>({user.nickname})</p>
				<ul>
					<li><a href="https://sso.bocken.org/if/user/#/settings" >Einstellungen</a></li>
					<li><a href="/logout" >Log Out</a></li>
				</ul>
			</div>
		</button>
	{:else}
		<a class=entry href=/login>Log In</a>
	{/if}
</div>
