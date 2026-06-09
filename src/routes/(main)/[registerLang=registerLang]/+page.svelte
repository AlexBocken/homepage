<script lang="ts">
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import Check from '@lucide/svelte/icons/check';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Send from '@lucide/svelte/icons/send';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { SvelteSet } from 'svelte/reactivity';
	import { m } from '$lib/js/commonI18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const lang = $derived(data.lang as 'de' | 'en');
	const t = $derived(m[lang]);

	type Status = { kind: 'idle' | 'busy' | 'ok' | 'error'; msg?: string };

	const available = $derived(data.availableGroups);

	let email = $state('');
	let username = $state('');
	let note = $state('');
	let honeypot = $state(''); // anti-bot; must stay empty
	const selectedGroups = new SvelteSet<string>();
	let status = $state<Status>({ kind: 'idle' });

	const emailValid = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
	const canSubmit = $derived(emailValid && username.trim().length > 0);

	function toggleGroup(code: string) {
		if (selectedGroups.has(code)) selectedGroups.delete(code);
		else selectedGroups.add(code);
		if (status.kind !== 'idle') status = { kind: 'idle' };
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSubmit) return;
		status = { kind: 'busy' };
		try {
			const res = await fetch('/api/register-request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: email.trim(),
					username: username.trim(),
					groups: [...selectedGroups],
					note: note.trim() || undefined,
					website: honeypot
				})
			});
			if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || t.register_err);
			status = { kind: 'ok', msg: t.register_sent };
			email = '';
			username = '';
			note = '';
			selectedGroups.clear();
		} catch (err) {
			status = { kind: 'error', msg: err instanceof Error ? err.message : String(err) };
		}
	}
</script>

<svelte:head><title>{t.register_title} - Bocken</title></svelte:head>

<div class="register">
	<header class="page-head">
		<h1>{t.register_title}</h1>
		<p>{t.register_subtitle}</p>
	</header>

	<section class="card">
		<div class="card-head">
			<span class="card-icon"><UserPlus size={18} /></span>
			<div>
				<h2>{t.register_details}</h2>
				<p>{t.register_details_desc}</p>
			</div>
		</div>

		<form onsubmit={submit}>
			<!-- Honeypot: hidden from real users; bots that fill it are dropped. -->
			<input
				class="hp"
				type="text"
				name="website"
				tabindex="-1"
				autocomplete="off"
				aria-hidden="true"
				bind:value={honeypot}
			/>

			<label class="field">
				<span>{t.register_email}</span>
				<input type="email" bind:value={email} autocomplete="email" placeholder="name@example.com" required />
			</label>

			<label class="field">
				<span>{t.register_username}</span>
				<input type="text" bind:value={username} maxlength="64" autocomplete="username" required />
				<small class="hint"><TriangleAlert size={13} /> {t.register_username_hint}</small>
			</label>

			<div class="field">
				<span class="field-label">{t.register_perms}</span>
				<div class="choices">
					{#each available as g (g.codename)}
						{@const on = selectedGroups.has(g.codename)}
						<button
							type="button"
							class="choice"
							class:selected={on}
							aria-pressed={on}
							onclick={() => toggleGroup(g.codename)}
						>
							{#if on}<Check size={14} />{/if}
							{g.label}
						</button>
					{/each}
				</div>
			</div>

			<label class="field">
				<span>{t.settings_note_optional}</span>
				<textarea bind:value={note} rows="3" maxlength="1000" placeholder={t.register_note_ph}></textarea>
			</label>

			<div class="actions">
				<button type="submit" class="btn primary" disabled={!canSubmit || status.kind === 'busy'}>
					{#if status.kind === 'busy'}<LoaderCircle class="spin" size={16} />{:else}<Send size={16} />{/if}
					{status.kind === 'busy' ? t.settings_sending : t.register_submit}
				</button>
				{#if status.msg && status.kind !== 'busy'}<p class="status {status.kind}">{status.msg}</p>{/if}
			</div>
		</form>
	</section>
</div>

<style>
	.hp {
		position: absolute;
		left: -9999px;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	.register {
		max-width: 760px;
		margin-inline: auto;
		padding: clamp(1.5rem, 4vw, 3rem) 1rem 5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.page-head h1 {
		margin: 0;
		font-size: var(--text-3xl, 2rem);
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
	}
	.page-head p {
		margin: 0.35rem 0 0;
		color: var(--color-text-secondary);
		font-size: var(--text-md, 1rem);
	}

	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		padding: clamp(1.25rem, 4vw, 1.75rem);
		box-shadow: var(--shadow-sm);
		transition: box-shadow var(--transition-normal, 200ms);
	}
	.card:hover {
		box-shadow: var(--shadow-md);
	}
	.card-head {
		display: flex;
		align-items: flex-start;
		gap: 0.85rem;
		margin-bottom: 1.25rem;
	}
	.card-icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md);
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}
	.card-head h2 {
		margin: 0;
		font-size: 1.15rem;
		color: var(--color-text-primary);
	}
	.card-head p {
		margin: 0.2rem 0 0;
		font-size: var(--text-sm, 0.85rem);
		color: var(--color-text-secondary);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.field span {
		font-size: var(--text-sm, 0.8rem);
		font-weight: 600;
		color: var(--color-text-secondary);
	}
	.field input {
		padding: 0.6rem 0.8rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font: inherit;
		transition: border-color var(--transition-fast, 100ms), box-shadow var(--transition-fast, 100ms);
	}
	.field input::placeholder {
		color: var(--color-text-tertiary);
	}
	.field input:focus-visible {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent);
	}
	.field textarea {
		padding: 0.6rem 0.8rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font: inherit;
		resize: vertical;
		min-height: 2.75rem;
		transition: border-color var(--transition-fast, 100ms), box-shadow var(--transition-fast, 100ms);
	}
	.field textarea::placeholder {
		color: var(--color-text-tertiary);
	}
	.field textarea:focus-visible {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent);
	}
	.hint {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: var(--text-sm, 0.8rem);
		color: var(--color-text-tertiary);
	}

	.field-label {
		font-size: var(--text-sm, 0.8rem);
		font-weight: 600;
		color: var(--color-text-secondary);
	}
	.choices {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.choice {
		all: unset;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		cursor: pointer;
		padding: 0.35rem 0.85rem;
		border-radius: var(--radius-pill);
		font-size: var(--text-sm, 0.85rem);
		font-weight: 600;
		color: var(--color-text-secondary);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		transition: var(--transition-fast, 100ms);
	}
	.choice:hover {
		background: var(--color-bg-elevated);
		scale: 1.05;
	}
	.choice:focus-visible {
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent);
	}
	.choice.selected {
		color: var(--color-text-on-primary);
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.status {
		margin: 0;
		font-size: var(--text-sm, 0.85rem);
		font-weight: 500;
	}
	.status.ok {
		color: var(--green);
	}
	.status.error {
		color: var(--red);
	}

	.btn {
		all: unset;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		cursor: pointer;
		padding: 0.6rem 1.4rem;
		border-radius: var(--radius-pill);
		font-weight: 600;
		text-align: center;
		transition: var(--transition-fast, 100ms);
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.primary {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.primary:not(:disabled):hover {
		background: var(--color-primary-hover);
		scale: 1.03;
	}

	:global(.spin) {
		animation: spin 0.7s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.spin) {
			animation-duration: 1.4s;
		}
	}
</style>
