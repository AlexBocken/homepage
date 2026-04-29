<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from "svelte";
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import LogIn from '@lucide/svelte/icons/log-in';

	let { user, recipeLang = 'rezepte', lang = 'de' } = $props();

	function toggle_options(){
		const el = document.querySelector("#options-wrap") as HTMLElement | null;
		if (el) el.hidden = !el.hidden;
	}

	onMount( () => {
		document.addEventListener("click", (e: MouseEvent) => {
			const userButton = document.querySelector("#button");

			if(userButton && !userButton.contains(e.target as Node)){
				const wrap = document.querySelector("#options-wrap") as HTMLElement | null;
				if (wrap) wrap.hidden = true;
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
	button {
		position: relative;
		background-color: transparent;
		border: none;
		width: 1.8rem;
		height: 1.8rem;
		border-radius: 50%;
		background-color: var(--nord4);
		background-position: center;
		background-size: contain;
		cursor: pointer;
	}
	.login-link {
		display: flex !important;
		align-items: center;
		justify-content: center;
		padding: 0.4rem !important;
	}
	.options-wrap {
		--menu-bg: rgba(46, 52, 64, 0.95);
		--menu-border: rgba(255,255,255,0.08);
		--menu-text: rgba(255,255,255,0.9);
		--menu-text-hover: var(--nord11);
		position: absolute;
		right: 0;
		top: calc(100% + 2px);
		z-index: 10;
	}
	.options-wrap::before {
		content: '';
		position: absolute;
		top: 0;
		right: 0.35rem;
		border: 8px solid transparent;
		border-bottom-color: var(--menu-bg);
		border-top: 0;
	}
	#options {
		box-sizing: border-box;
		margin-top: 8px;
		background-color: var(--menu-bg);
		color: var(--menu-text);
		border-radius: 8px;
		width: 30ch;
		padding: 1rem;
		box-shadow: 0 4px 16px rgba(0,0,0,0.3);
	}
	@media (prefers-color-scheme: dark) {
		.options-wrap {
			--menu-bg: rgba(20, 20, 20, 0.92);
		}
	}
	:global(:root[data-theme="dark"]) .options-wrap {
		--menu-bg: rgba(20, 20, 20, 0.92);
	}
	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme])) .options-wrap {
			--menu-bg: rgba(255, 255, 255, 0.95);
			--menu-border: rgba(0,0,0,0.08);
			--menu-text: var(--color-text-primary);
			--menu-text-hover: var(--nord11);
		}
	}
	:global(:root[data-theme="light"]) .options-wrap {
		--menu-bg: rgba(255, 255, 255, 0.95);
		--menu-border: rgba(0,0,0,0.08);
		--menu-text: var(--color-text-primary);
		--menu-text-hover: var(--nord11);
	}
	#options ul {
		font-size: 1rem;
		width: 100%;
		list-style-type: none;
		padding: 0;
		margin: 0;
	}
	#options li {
		margin-block: 0.4rem;
		text-align: left;
	}
	#options li a {
		text-decoration: none;
		color: var(--menu-text);
		text-align: left;
		transition: var(--transition-fast);
	}
	#options li:hover a {
		color: var(--menu-text-hover);
	}
	h2 {
		margin-block: 0;
		font-size: 1.1rem;
	}
	h2 + p {
		padding-top: 0;
		margin-top: 0;
		font-size: 1rem;
	}
</style>

{#if user}
	<button onclick={toggle_options} style="background-image: url(https://bocken.org/static/user/thumb/{user.nickname}.webp)" id=button>
	<div class="options-wrap" hidden id=options-wrap>
		<div id=options>
			<h2>{user.name}</h2>
			<p>({user.nickname})</p>
			<ul>
				{#if user.groups?.includes('rezepte_users')}
					<li><a href={resolve('/[recipeLang=recipeLang]/administration', { recipeLang })}>Administration</a></li>
				{/if}
				<li><a href="https://sso.bocken.org/if/user/#/settings" >Einstellungen</a></li>
				<li><a href={`${resolve('/logout')}?callbackUrl=${encodeURIComponent(getLogoutCallbackUrl(page.url.pathname))}`}>Log Out</a></li>
			</ul>
		</div>
	</div>
	</button>
{:else}
	<a
		class="entry login-link"
		href={`${resolve('/login')}?callbackUrl=${encodeURIComponent(page.url.pathname + (browser ? page.url.search : ''))}`}
		aria-label={lang === 'de' ? 'Anmelden' : 'Login'}
		title={lang === 'de' ? 'Anmelden' : 'Login'}
	>
		<LogIn size={18} />
	</a>
{/if}
