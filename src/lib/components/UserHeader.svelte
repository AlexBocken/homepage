<script lang="ts">
	import { onMount } from "svelte";
	import { page } from '$app/stores';

	let { user, recipeLang = 'rezepte', lang = 'de' } = $props();

	function toggle_options(){
		const el = document.querySelector("#options")
		el.hidden = !el.hidden
	}

	onMount( () => {
		document.addEventListener("click", (e) => {
			const userButton = document.querySelector("#button")

			if(userButton && !userButton.contains(e.target)){
				const options = document.querySelector("#options");
				if (options) options.hidden = true;
			}
		})
	})

	function getLogoutCallbackUrl(pathname: string): string {
		// Cospend has no public equivalent
		if (pathname.startsWith('/cospend')) return '/';

		// Match /rezepte or /recipes prefix
		const m = pathname.match(/^\/(rezepte|recipes)(\/.*)?$/);
		if (m) {
			const base = `/${m[1]}`;
			const rest = m[2] ?? '';

			// /edit/[name] → the recipe detail page
			const editMatch = rest.match(/^\/edit\/(.+)$/);
			if (editMatch) return `${base}/${editMatch[1]}`;

			// Auth-only sub-routes → recipe root
			if (/^\/(add|favorites|to-try|admin|administration)(\/|$)/.test(rest))
				return base;
		}

		// Public page: stay here
		return pathname;
	}
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
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
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
		transition: var(--transition-fast);
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
		left: 50%;
		right: unset;
		transform: translateX(-50%);
		z-index: 10;
	}
	.top.speech::after {
	  border: 20px solid transparent;
	  border-top-color: var(--bg_color);
	  border-bottom-width: 0;
	  top: unset;
	  bottom: -20px;
	  left: 50%;
	  margin-left: -20px;
	}
	button{
		margin-bottom: 2rem;
	}
	button::before{
		content: "";
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: inherit;
		z-index: 20;
	}
}
</style>

{#if user}
	<button onclick={toggle_options} style="background-image: url(https://bocken.org/static/user/thumb/{user.nickname}.webp)" id=button>
	<div id=options class="speech top" hidden>
			<h2>{user.name}</h2>
			<p>({user.nickname})</p>
			<ul>
				{#if user.groups?.includes('rezepte_users')}
					<li><a href="/{recipeLang}/administration">Administration</a></li>
				{/if}
				<li><a href="https://sso.bocken.org/if/user/#/settings" >Einstellungen</a></li>
				<li><a href="/logout?callbackUrl={encodeURIComponent(getLogoutCallbackUrl($page.url.pathname))}">Log Out</a></li>
			</ul>
		</div>
	</button>
{:else}
	<a class=entry href="/login?callbackUrl={encodeURIComponent($page.url.pathname + $page.url.search)}">Login</a>
{/if}
