<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import LogIn from '@lucide/svelte/icons/log-in';
	import { m, type CommonLang } from '$lib/js/commonI18n';
	import { pwaStore } from '$lib/stores/pwa.svelte';
	import { clickOutside } from '$lib/js/clickOutside';

	let { user, recipeLang = 'rezepte', lang = 'de' } = $props();
	const t = $derived(m[lang as CommonLang]);

	// Our own avatar: prefer the hashed thumb derived from the session's avatar URL
	// (immutable → cache-busted). Fall back to a gravatar/initials image, then to
	// the stable thumb by nickname.
	const ownAvatarThumb = $derived.by(() => {
		const img: string | undefined = user?.image;
		if (typeof img === 'string' && img.includes('/static/user/full/')) {
			return img.replace('/static/user/full/', '/static/user/thumb/');
		}
		return img || `https://bocken.org/static/user/thumb/${user?.nickname}.webp`;
	});

	async function handleSync() {
		await pwaStore.syncForOffline();
	}
	async function handleClear() {
		await pwaStore.clearOfflineData();
	}

	let toggleEl: HTMLInputElement | undefined = $state();

	// The menu opens and closes on its own via the checkbox, with no JS at all.
	// This only adds click-outside-to-close on top.
	const closeOnOutsideClick = clickOutside(() => {
		if (toggleEl?.checked) toggleEl.checked = false;
	}, 'click');
</script>
<style>
	.user-wrap {
		position: relative;
		display: inline-flex;
	}
	/* Visually hidden but still focusable — it is the real control, so keyboard
	   users can Tab to it and toggle with Space, JS or no JS. */
	.menu-toggle {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	label.avatar {
		display: block;
		border: none;
		width: 1.8rem;
		height: 1.8rem;
		border-radius: 50%;
		background-color: var(--nord4);
		background-position: center;
		background-size: contain;
		cursor: pointer;
	}
	.menu-toggle:focus-visible + label.avatar {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.login-link {
		display: flex !important;
		align-items: center;
		justify-content: center;
		padding: 0.4rem !important;
	}
	.options-wrap {
		/* Same frosted recipe as the nav bar — see app.css → --glass-*. */
		--menu-bg: var(--glass-bg);
		--menu-border: var(--glass-border);
		--menu-text: light-dark(var(--color-text-primary), rgba(255,255,255,0.9));
		--menu-text-hover: var(--nord11);
		display: none;
		position: absolute;
		right: 0;
		top: calc(100% + 2px);
		z-index: 10;
	}
	/* Pure-CSS disclosure — works with JS disabled. */
	.menu-toggle:checked ~ .options-wrap {
		display: block;
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
		backdrop-filter: blur(var(--glass-blur));
		box-shadow: 0 4px 24px var(--glass-shadow);
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
	#options li button.menu-action {
		appearance: none;
		background: transparent;
		border: none;
		padding: 0;
		margin: 0;
		font: inherit;
		color: var(--menu-text);
		text-align: left;
		cursor: pointer;
		transition: var(--transition-fast);
		width: auto;
	}
	#options li:hover button.menu-action:not(:disabled) {
		color: var(--menu-text-hover);
	}
	#options li button.menu-action:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.menu-section-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.55;
		margin-top: 0.6rem;
		margin-bottom: 0.15rem;
	}
	.menu-divider {
		height: 1px;
		background: var(--menu-border, rgba(255,255,255,0.08));
		margin: 0.5rem 0;
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
	<div class="user-wrap" id=user-wrap {@attach closeOnOutsideClick}>
		<input
			type="checkbox"
			class="menu-toggle"
			id="pfp-menu-toggle"
			bind:this={toggleEl}
			aria-label={user.name}
		/>
		<label
			class="avatar"
			for="pfp-menu-toggle"
			style="background-image: url('{ownAvatarThumb}')"
			id=button
		></label>
		<div class="options-wrap" id=options-wrap>
			<div id=options>
				<h2>{user.name}</h2>
				<p>({user.nickname})</p>
				<ul>
					{#if user.groups?.includes('rezepte_users')}
						<li><a href={resolve('/[recipeLang=recipeLang]/administration', { recipeLang })}>Administration</a></li>
					{/if}
					<li><a href={resolve('/(main)/[settingsLang=settingsLang]', { settingsLang: lang === 'en' ? 'settings' : 'einstellungen' })}>{t.settings_title}</a></li>
					{#if pwaStore.isStandalone}
						<li class="menu-divider" aria-hidden="true"></li>
						<li class="menu-section-label">{t.offline_data}</li>
						{#if pwaStore.isOfflineAvailable}
							<li>
								<button
									class="menu-action"
									type="button"
									onclick={handleSync}
									disabled={pwaStore.isSyncing}
								>{pwaStore.isSyncing ? t.syncing : t.sync_now}</button>
							</li>
							<li>
								<button
									class="menu-action"
									type="button"
									onclick={handleClear}
									disabled={pwaStore.isSyncing}
								>{t.clear_offline_data}</button>
							</li>
						{:else}
							<li>
								<button
									class="menu-action"
									type="button"
									onclick={handleSync}
									disabled={pwaStore.isSyncing}
								>{pwaStore.isSyncing ? t.syncing : t.sync_for_offline}</button>
							</li>
						{/if}
						<li class="menu-divider" aria-hidden="true"></li>
					{/if}
					<li><a href={`${resolve('/logout')}?callbackUrl=${encodeURIComponent(page.url.pathname)}`}>Log Out</a></li>
				</ul>
			</div>
		</div>
	</div>
{:else}
	<a
		class="entry login-link"
		href={`${resolve('/login')}?callbackUrl=${encodeURIComponent(page.url.pathname + (browser ? page.url.search : ''))}`}
		aria-label={t.login}
		title={t.login}
	>
		<LogIn size={18} />
	</a>
{/if}
