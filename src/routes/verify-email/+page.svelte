<script lang="ts">
	import { resolve } from '$app/paths';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>E-Mail bestätigen</title></svelte:head>

<div class="wrap">
	<div class="card">
		{#if data.status === 'success'}
			<span class="badge ok"><CircleCheck size={32} /></span>
			<h1>E-Mail bestätigt</h1>
			<p>Deine E-Mail-Adresse wurde auf <strong>{data.email}</strong> geändert.</p>
		{:else if data.status === 'invalid'}
			<span class="badge bad"><CircleX size={32} /></span>
			<h1>Link ungültig</h1>
			<p>Dieser Bestätigungslink ist ungültig oder abgelaufen. Bitte fordere die Änderung erneut an.</p>
		{:else}
			<span class="badge bad"><CircleX size={32} /></span>
			<h1>Etwas ist schiefgelaufen</h1>
			<p>Die Änderung konnte nicht angewendet werden. Bitte versuche es später erneut.</p>
		{/if}
		<a class="btn" href={resolve('/(main)/[settingsLang=settingsLang]', { settingsLang: 'einstellungen' })}>Zu den Einstellungen</a>
	</div>
</div>

<style>
	.wrap {
		min-height: 60dvh;
		display: grid;
		place-items: center;
		padding: 2rem 1rem;
	}
	.card {
		max-width: 440px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: clamp(1.75rem, 5vw, 2.5rem);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-md);
	}
	.badge {
		display: grid;
		place-items: center;
		width: 60px;
		height: 60px;
		border-radius: 50%;
	}
	.badge.ok {
		color: var(--green);
		background: color-mix(in srgb, var(--green) 14%, transparent);
	}
	.badge.bad {
		color: var(--red);
		background: color-mix(in srgb, var(--red) 14%, transparent);
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
		color: var(--color-text-primary);
	}
	p {
		margin: 0;
		color: var(--color-text-secondary);
	}
	.btn {
		margin-top: 0.75rem;
		padding: 0.6rem 1.4rem;
		border-radius: var(--radius-pill);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-weight: 600;
		text-decoration: none;
		transition: var(--transition-fast, 100ms);
	}
	.btn:hover {
		background: var(--color-primary-hover);
		scale: 1.03;
	}
</style>
