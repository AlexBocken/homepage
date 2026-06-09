<script lang="ts">
	import ImageEditor from '$lib/components/recipes/ImageEditor.svelte';
	import Camera from '@lucide/svelte/icons/camera';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import AtSign from '@lucide/svelte/icons/at-sign';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Mail from '@lucide/svelte/icons/mail';
	import Check from '@lucide/svelte/icons/check';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Users from '@lucide/svelte/icons/users';
	import Send from '@lucide/svelte/icons/send';
	import { SvelteSet } from 'svelte/reactivity';
	import { m } from '$lib/js/commonI18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const account = $derived(data.account);

	const lang = $derived(data.lang as 'de' | 'en');
	const t = $derived(m[lang]);

	type Status = { kind: 'idle' | 'busy' | 'ok' | 'error'; msg?: string };

	// --- Display name ---
	// svelte-ignore state_referenced_locally
	let name = $state(data.account.name);
	// svelte-ignore state_referenced_locally
	let savedName = $state(data.account.name);
	let nameStatus = $state<Status>({ kind: 'idle' });
	const nameDirty = $derived(name.trim() !== savedName && name.trim().length > 0);

	const initials = $derived(
		(savedName || account.username)
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);

	async function saveName(e: SubmitEvent) {
		e.preventDefault();
		if (!nameDirty) return;
		nameStatus = { kind: 'busy' };
		try {
			const res = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: name.trim() })
			});
			if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || t.settings_err_save);
			savedName = name.trim();
			nameStatus = { kind: 'ok', msg: t.settings_saved };
		} catch (err) {
			nameStatus = { kind: 'error', msg: err instanceof Error ? err.message : String(err) };
		}
	}

	// --- Avatar ---
	// svelte-ignore state_referenced_locally
	let avatarUrl = $state(data.account.avatar);
	let editorFile = $state<File | null>(null);
	let avatarStatus = $state<Status>({ kind: 'idle' });
	let fileInput = $state<HTMLInputElement | null>(null);

	function pickFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const f = input.files?.[0];
		if (f) editorFile = f;
		input.value = '';
	}

	async function uploadAvatar(file: File) {
		editorFile = null;
		avatarStatus = { kind: 'busy' };
		try {
			const body = new FormData();
			body.append('image', file);
			const res = await fetch('/api/user/avatar', { method: 'POST', body });
			if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || t.settings_err_upload);
			const out = await res.json();
			avatarUrl = out.avatar;
			avatarStatus = { kind: 'ok', msg: t.settings_avatar_updated };
		} catch (err) {
			avatarStatus = { kind: 'error', msg: err instanceof Error ? err.message : String(err) };
		}
	}

	// --- Email ---
	let newEmail = $state('');
	let emailStatus = $state<Status>({ kind: 'idle' });
	const emailValid = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim()));

	async function requestEmailChange(e: SubmitEvent) {
		e.preventDefault();
		if (!emailValid) return;
		emailStatus = { kind: 'busy' };
		try {
			const res = await fetch('/api/user/email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ newEmail: newEmail.trim() })
			});
			if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || t.settings_err_email);
			emailStatus = { kind: 'ok', msg: t.settings_email_sent.replace('{email}', newEmail.trim()) };
			newEmail = '';
		} catch (err) {
			emailStatus = { kind: 'error', msg: err instanceof Error ? err.message : String(err) };
		}
	}

	// --- Password ---
	let currentPassword = $state('');
	let newPassword = $state('');
	let repeatPassword = $state('');
	let pwStatus = $state<Status>({ kind: 'idle' });
	const pwMismatch = $derived(repeatPassword.length > 0 && newPassword !== repeatPassword);
	const pwValid = $derived(
		currentPassword.length > 0 && newPassword.length >= 10 && newPassword === repeatPassword
	);

	async function changePassword(e: SubmitEvent) {
		e.preventDefault();
		if (!pwValid) return;
		pwStatus = { kind: 'busy' };
		try {
			const res = await fetch('/api/user/password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ currentPassword, newPassword })
			});
			if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || t.settings_err_password);
			currentPassword = '';
			newPassword = '';
			repeatPassword = '';
			pwStatus = { kind: 'ok', msg: t.settings_password_changed };
		} catch (err) {
			pwStatus = { kind: 'error', msg: err instanceof Error ? err.message : String(err) };
		}
	}

	// --- Deactivation ---
	let deactivateStatus = $state<Status>({ kind: 'idle' });

	async function deactivate() {
		if (!confirm(t.settings_deactivate_confirm)) return;
		deactivateStatus = { kind: 'busy' };
		try {
			const res = await fetch('/api/user/deactivate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ confirm: true })
			});
			if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || t.settings_err_deactivate);
			window.location.href = '/logout';
		} catch (err) {
			deactivateStatus = { kind: 'error', msg: err instanceof Error ? err.message : String(err) };
		}
	}

	const joinDate = $derived(
		account.dateJoined ? new Date(account.dateJoined).toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
	);

	// --- Group access ---
	const availableGroups = $derived(data.availableGroups);
	const selectedGroups = new SvelteSet<string>();
	let groupNote = $state('');
	let groupStatus = $state<Status>({ kind: 'idle' });

	function toggleGroup(code: string) {
		if (selectedGroups.has(code)) selectedGroups.delete(code);
		else selectedGroups.add(code);
		if (groupStatus.kind !== 'idle') groupStatus = { kind: 'idle' };
	}

	async function submitGroupRequest(e: SubmitEvent) {
		e.preventDefault();
		if (selectedGroups.size === 0) return;
		groupStatus = { kind: 'busy' };
		try {
			const res = await fetch('/api/user/group-request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ groups: [...selectedGroups], note: groupNote.trim() || undefined })
			});
			if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || t.settings_err_request);
			groupStatus = { kind: 'ok', msg: t.settings_request_sent };
			selectedGroups.clear();
			groupNote = '';
		} catch (err) {
			groupStatus = { kind: 'error', msg: err instanceof Error ? err.message : String(err) };
		}
	}
</script>
<svelte:head><title>{t.settings_title} - Bocken</title></svelte:head>

<div class="settings">
	<header class="page-head">
		<h1>{t.settings_title}</h1>
		<p>{t.settings_subtitle}</p>
	</header>

	<!-- Identity hero: avatar + inline name + handle + meta -->
	<section class="identity">
		<div class="identity-glow" aria-hidden="true"></div>

		<input bind:this={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onchange={pickFile} hidden />
		<button
			type="button"
			class="avatar"
			class:busy={avatarStatus.kind === 'busy'}
			onclick={() => fileInput?.click()}
			disabled={avatarStatus.kind === 'busy'}
			aria-label={t.settings_change_avatar}
		>
			{#if avatarUrl}
				<img src={avatarUrl} alt="" />
			{:else}
				<span class="avatar-initials">{initials}</span>
			{/if}
			<span class="avatar-overlay">
				{#if avatarStatus.kind === 'busy'}
					<LoaderCircle class="spin" size={22} />
				{:else}
					<Camera size={20} />
					<span>{t.settings_change_short}</span>
				{/if}
			</span>
		</button>

		<div class="identity-main">
			<form class="name-form" onsubmit={saveName}>
				<input
					class="name-input"
					type="text"
					bind:value={name}
					maxlength="150"
					aria-label={t.settings_display_name}
					required
				/>
				{#if nameDirty || nameStatus.kind === 'busy'}
					<button type="submit" class="name-save" disabled={nameStatus.kind === 'busy'}>
						{#if nameStatus.kind === 'busy'}<LoaderCircle class="spin" size={15} />{:else}<Check size={15} />{/if}
						{t.settings_save}
					</button>
				{:else if nameStatus.kind === 'ok'}
					<span class="saved-tag"><Check size={14} /> {nameStatus.msg}</span>
				{/if}
			</form>

			<p class="handle"><AtSign size={15} />{account.username}</p>

			<ul class="meta">
				<li><CalendarDays size={15} /> {t.settings_member_since} {joinDate}</li>
				<li><Mail size={15} /> {account.email || '—'}</li>
			</ul>

			{#if avatarStatus.msg && avatarStatus.kind !== 'busy'}
				<p class="status {avatarStatus.kind}">{avatarStatus.msg}</p>
			{/if}
		</div>
	</section>

	<!-- Email -->
	<section class="card">
		<div class="card-head">
			<span class="card-icon"><Mail size={18} /></span>
			<div>
				<h2>{t.settings_email_title}</h2>
				<p>{t.settings_email_current}: {account.email || '—'}. {t.settings_email_desc}</p>
			</div>
		</div>
		<form onsubmit={requestEmailChange}>
			<label class="field">
				<span>{t.settings_email_new}</span>
				<input type="email" bind:value={newEmail} autocomplete="email" placeholder="name@example.com" required />
			</label>
			<div class="actions">
				<button type="submit" class="btn primary" disabled={!emailValid || emailStatus.kind === 'busy'}>
					{#if emailStatus.kind === 'busy'}<LoaderCircle class="spin" size={16} />{/if}
					{emailStatus.kind === 'busy' ? t.settings_sending : t.settings_email_send}
				</button>
				{#if emailStatus.msg && emailStatus.kind !== 'busy'}<p class="status {emailStatus.kind}">{emailStatus.msg}</p>{/if}
			</div>
		</form>
	</section>

	<!-- Password -->
	<section class="card">
		<div class="card-head">
			<span class="card-icon"><KeyRound size={18} /></span>
			<div>
				<h2>{t.settings_password_title}</h2>
				<p>{t.settings_password_desc}</p>
			</div>
		</div>
		<form onsubmit={changePassword}>
			<label class="field">
				<span>{t.settings_password_current}</span>
				<input type="password" bind:value={currentPassword} autocomplete="current-password" placeholder={t.settings_password_current_ph} required />
			</label>
			<div class="grid-2">
				<label class="field">
					<span>{t.settings_password_new}</span>
					<input type="password" bind:value={newPassword} minlength="10" autocomplete="new-password" placeholder={t.settings_password_new_ph} required />
				</label>
				<label class="field">
					<span>{t.settings_password_repeat}</span>
					<input type="password" class:err={pwMismatch} bind:value={repeatPassword} minlength="10" autocomplete="new-password" required />
				</label>
			</div>
			{#if pwMismatch}<p class="status error">{t.settings_password_mismatch}</p>{/if}
			<div class="actions">
				<button type="submit" class="btn primary" disabled={!pwValid || pwStatus.kind === 'busy'}>
					{#if pwStatus.kind === 'busy'}<LoaderCircle class="spin" size={16} />{/if}
					{pwStatus.kind === 'busy' ? t.settings_changing : t.settings_password_change}
				</button>
				{#if pwStatus.msg && pwStatus.kind !== 'busy'}<p class="status {pwStatus.kind}">{pwStatus.msg}</p>{/if}
			</div>
		</form>
	</section>

	<!-- Groups & access -->
	<section class="card">
		<div class="card-head">
			<span class="card-icon"><Users size={18} /></span>
			<div>
				<h2>{t.settings_groups_title}</h2>
				<p>{t.settings_groups_desc}</p>
			</div>
		</div>

		{#if account.groups.length}
			<ul class="groups">
				{#each account.groups as g (g.codename)}<li class="pill">{g.label}</li>{/each}
			</ul>
		{:else}
			<p class="muted">{t.settings_groups_none}</p>
		{/if}

		{#if availableGroups.length}
			<form class="group-request" onsubmit={submitGroupRequest}>
				<span class="field-label">{t.settings_groups_request_label}</span>
				<div class="choices">
					{#each availableGroups as g (g.codename)}
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
				<label class="field">
					<span>{t.settings_note_optional}</span>
					<textarea bind:value={groupNote} rows="2" maxlength="1000" placeholder={t.settings_note_ph}></textarea>
				</label>
				<div class="actions">
					<button type="submit" class="btn primary" disabled={selectedGroups.size === 0 || groupStatus.kind === 'busy'}>
						{#if groupStatus.kind === 'busy'}<LoaderCircle class="spin" size={16} />{:else}<Send size={16} />{/if}
						{groupStatus.kind === 'busy'
							? t.settings_sending
							: `${t.settings_send_request}${selectedGroups.size ? ` (${selectedGroups.size})` : ''}`}
					</button>
					{#if groupStatus.msg && groupStatus.kind !== 'busy'}<p class="status {groupStatus.kind}">{groupStatus.msg}</p>{/if}
				</div>
			</form>
		{:else}
			<p class="muted">{t.settings_groups_all}</p>
		{/if}
	</section>

	<!-- Danger zone -->
	<section class="card danger">
		<div class="card-head">
			<span class="card-icon danger-icon"><TriangleAlert size={18} /></span>
			<div>
				<h2>{t.settings_deactivate_title}</h2>
				<p>{t.settings_deactivate_desc}</p>
			</div>
		</div>
		<div class="actions">
			<button type="button" class="btn danger-btn" onclick={deactivate} disabled={deactivateStatus.kind === 'busy'}>
				{#if deactivateStatus.kind === 'busy'}<LoaderCircle class="spin" size={16} />{/if}
				{deactivateStatus.kind === 'busy' ? t.settings_deactivating : t.settings_deactivate_title}
			</button>
			{#if deactivateStatus.msg && deactivateStatus.kind !== 'busy'}<p class="status {deactivateStatus.kind}">{deactivateStatus.msg}</p>{/if}
		</div>
	</section>
</div>

{#if editorFile}
	<ImageEditor
		file={editorFile}
		shortName={account.username}
		forcedRatioKey="1:1"
		onApply={(f) => uploadAvatar(f)}
		onCancel={() => (editorFile = null)}
	/>
{/if}

<style>
	.settings {
		max-width: 760px;
		margin-inline: auto;
		padding: clamp(1.5rem, 4vw, 3rem) 1rem 5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* Page head */
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

	/* Identity hero */
	.identity {
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		gap: clamp(1rem, 4vw, 2rem);
		padding: clamp(1.25rem, 4vw, 2rem);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-md);
	}
	.identity-glow {
		position: absolute;
		inset: -40% 50% 40% -20%;
		background: radial-gradient(
			60% 60% at 20% 20%,
			color-mix(in srgb, var(--color-primary) 22%, transparent),
			transparent 70%
		);
		pointer-events: none;
	}

	/* Avatar */
	.avatar {
		all: unset;
		position: relative;
		flex-shrink: 0;
		width: clamp(96px, 22vw, 132px);
		aspect-ratio: 1;
		border-radius: 50%;
		overflow: hidden;
		cursor: pointer;
		background: var(--color-bg-tertiary);
		box-shadow:
			0 0 0 4px var(--color-surface),
			0 0 0 5px var(--color-border),
			var(--shadow-md);
		transition: transform var(--transition-normal, 200ms), box-shadow var(--transition-normal, 200ms);
	}
	.avatar:hover,
	.avatar:focus-visible {
		transform: scale(1.03);
		box-shadow:
			0 0 0 4px var(--color-surface),
			0 0 0 5px var(--color-primary),
			var(--shadow-hover, var(--shadow-lg));
	}
	.avatar:disabled {
		cursor: progress;
	}
	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.avatar-initials {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		font-size: clamp(2rem, 7vw, 3rem);
		font-weight: 700;
		letter-spacing: 0.02em;
		color: var(--color-text-on-primary);
		background: linear-gradient(135deg, var(--color-primary), var(--color-primary-active, var(--color-primary)));
	}
	.avatar-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.2rem;
		font-size: var(--text-sm, 0.8rem);
		font-weight: 600;
		color: white;
		background: rgba(10, 14, 20, 0.55);
		opacity: 0;
		transition: opacity var(--transition-normal, 200ms);
	}
	.avatar:hover .avatar-overlay,
	.avatar:focus-visible .avatar-overlay,
	.avatar.busy .avatar-overlay {
		opacity: 1;
	}

	/* Identity main column */
	.identity-main {
		position: relative;
		min-width: 0;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.name-form {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.name-input {
		flex: 1;
		min-width: 0;
		font-size: clamp(1.4rem, 4vw, 1.9rem);
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		border-radius: 0;
		padding: 0.1rem 0;
		transition: border-color var(--transition-fast, 100ms);
	}
	.name-input:hover {
		border-bottom-color: var(--color-border);
	}
	.name-input:focus {
		outline: none;
		border-bottom-color: var(--color-primary);
	}
	.name-save {
		all: unset;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		cursor: pointer;
		padding: 0.3rem 0.75rem;
		font-size: var(--text-sm, 0.8rem);
		font-weight: 600;
		color: var(--color-text-on-primary);
		background: var(--color-primary);
		border-radius: var(--radius-pill);
		transition: var(--transition-fast, 100ms);
	}
	.name-save:hover {
		background: var(--color-primary-hover);
		scale: 1.05;
	}
	.name-save:disabled {
		opacity: 0.6;
		cursor: progress;
	}
	.saved-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--text-sm, 0.8rem);
		font-weight: 600;
		color: var(--green);
	}

	.handle {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin: 0;
		width: fit-content;
		color: var(--color-text-secondary);
		font-size: var(--text-md, 0.95rem);
	}
	.handle :global(svg) {
		opacity: 0.6;
	}

	.meta {
		list-style: none;
		margin: 0.15rem 0 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1.1rem;
	}
	.meta li {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: var(--text-sm, 0.85rem);
		color: var(--color-text-tertiary);
	}
	.meta :global(svg) {
		opacity: 0.6;
	}

	.groups {
		list-style: none;
		margin: 0.25rem 0 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.groups .pill {
		padding: 0.35rem 0.85rem;
		border-radius: var(--radius-pill);
		font-size: var(--text-sm, 0.85rem);
		font-weight: 600;
		color: var(--color-text-secondary);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
	}

	/* Cards */
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
	.card.danger {
		border-color: color-mix(in srgb, var(--red) 45%, var(--color-border));
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
	.card-icon.danger-icon {
		color: var(--red);
		background: color-mix(in srgb, var(--red) 12%, transparent);
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

	/* Forms */
	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.grid-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
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
	.field input.err {
		border-color: var(--red);
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

	.muted {
		margin: 0.5rem 0 0;
		font-size: var(--text-sm, 0.85rem);
		color: var(--color-text-tertiary);
	}

	/* Group request */
	.group-request {
		margin-top: 1.25rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--color-border);
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

	/* Buttons */
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
	.danger-btn {
		background: var(--red);
		color: white;
	}
	.danger-btn:not(:disabled):hover {
		background: var(--nord11);
		scale: 1.03;
	}

	/* Spinner + entrance */
	:global(.spin) {
		animation: spin 0.7s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 560px) {
		.identity {
			flex-direction: column;
			text-align: center;
		}
		.identity-main {
			align-items: center;
			width: 100%;
		}
		.name-form,
		.meta,
		.groups {
			justify-content: center;
		}
		.grid-2 {
			grid-template-columns: 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.spin) {
			animation-duration: 1.4s;
		}
	}
</style>
