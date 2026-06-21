<script lang="ts">
	import { onMount } from 'svelte';
	import { m, type CommonLang } from '$lib/js/commonI18n';
	import Download from '@lucide/svelte/icons/download';
	import X from '@lucide/svelte/icons/x';

	let { lang = 'de' }: { lang?: string } = $props();

	const APK_URL = 'https://bocken.org/static/Bocken.apk';
	const DISMISS_KEY = 'bocken-update-banner-dismissed'; // stores the version dismissed

	const t = $derived(m[lang as CommonLang]);

	let latestVersion = $state('');
	let visible = $state(false);

	/** Parse "1.2.3" (ignoring any pre-release/build suffix) into [1,2,3]. */
	function parts(v: string): number[] {
		return v
			.split('-')[0]
			.split('.')
			.map((n) => parseInt(n, 10) || 0);
	}

	/** True when `latest` is a strictly higher version than `installed`. */
	function isNewer(latest: string, installed: string): boolean {
		const a = parts(latest);
		const b = parts(installed);
		for (let i = 0; i < Math.max(a.length, b.length); i++) {
			const d = (a[i] ?? 0) - (b[i] ?? 0);
			if (d !== 0) return d > 0;
		}
		return false;
	}

	type Bridge = { getAppVersion?: () => string; openExternal?: (url: string) => void };
	function bridge(): Bridge | null {
		if (typeof window === 'undefined' || !('__TAURI__' in window)) return null;
		return ('AndroidBridge' in window ? (window as unknown as { AndroidBridge: Bridge }).AndroidBridge : null);
	}

	onMount(async () => {
		const b = bridge();
		// Only meaningful inside the Android app, and only on builds new enough to
		// expose getAppVersion() — older shells simply never prompt.
		if (!b || typeof b.getAppVersion !== 'function') return;

		const installed = b.getAppVersion();
		if (!installed) return;

		try {
			const res = await fetch('/api/app/latest-version');
			if (!res.ok) return;
			const data = (await res.json()) as { version?: string };
			if (!data.version || !isNewer(data.version, installed)) return;
			latestVersion = data.version;
		} catch {
			return;
		}

		if (localStorage.getItem(DISMISS_KEY) === latestVersion) return;
		visible = true;
	});

	function update() {
		const b = bridge();
		if (b?.openExternal) b.openExternal(APK_URL);
		else window.open(APK_URL, '_blank');
	}

	function dismiss() {
		visible = false;
		localStorage.setItem(DISMISS_KEY, latestVersion);
	}
</script>

<style>
	.banner {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 1rem;
		align-items: center;
		max-width: 1200px;
		margin: 1rem auto;
		padding: 0.9rem 1.1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		position: relative;
		overflow: hidden;
	}
	.banner::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 4px;
		background: var(--color-primary);
	}

	.icon-wrap {
		display: grid;
		place-items: center;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 50%;
		background: color-mix(in oklab, var(--color-primary) 18%, transparent);
		color: var(--color-primary);
		flex-shrink: 0;
	}

	.copy {
		min-width: 0;
	}
	.title {
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--color-text-primary);
		line-height: 1.25;
	}
	.body {
		font-size: 0.82rem;
		color: var(--color-text-secondary);
		margin-top: 0.15rem;
		line-height: 1.35;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	.update-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.95rem;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-text-on-primary);
		background: var(--color-primary);
		border: none;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: var(--transition-fast);
		white-space: nowrap;
	}
	.update-btn:hover {
		background: var(--color-primary-hover);
		transform: scale(1.03);
	}

	.dismiss-btn {
		background: transparent;
		border: none;
		color: var(--color-text-tertiary);
		padding: 0.35rem;
		border-radius: 50%;
		cursor: pointer;
		display: grid;
		place-items: center;
		transition: var(--transition-fast);
	}
	.dismiss-btn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	@media (max-width: 560px) {
		.banner {
			gap: 0.7rem;
			padding: 0.75rem 0.9rem;
			margin: 0.75rem auto;
		}
		.body {
			display: none;
		}
		.update-btn {
			padding: 0.45rem 0.75rem;
			font-size: 0.8rem;
		}
	}
</style>

{#if visible}
	<aside class="banner" role="status" aria-live="polite">
		<div class="icon-wrap" aria-hidden="true">
			<Download size={20} strokeWidth={2} />
		</div>

		<div class="copy">
			<div class="title">{t.update_banner_title}</div>
			<div class="body">{t.update_banner_body}</div>
		</div>

		<div class="actions">
			<button class="update-btn" onclick={update} type="button">
				{t.update_banner_action}
			</button>
			<button
				class="dismiss-btn"
				onclick={dismiss}
				aria-label={t.dismiss}
				title={t.dismiss}
				type="button"
			>
				<X size={16} strokeWidth={2} />
			</button>
		</div>
	</aside>
{/if}
