<script lang="ts">
	import { page } from '$app/state';
	import Lock from '@lucide/svelte/icons/lock';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Show the small "privat" lock chip above the content (default true). */
		badge?: boolean;
		children: Snippet;
	}

	let { badge = true, children }: Props = $props();

	// Visible only to logged-in viewers. Pages that use this should be rendered
	// per request (e.g. the hike detail page is `prerender = false`) so the
	// session is live and, for anonymous visitors, the content is omitted from
	// the SSR HTML.
	//
	// NOTE: this is *cosmetic* gating, not byte-gating like a private image.
	// The prose is compiled into the page's JS chunk, which ships to every
	// visitor — a determined anonymous user can read it in the bundle. Use it
	// for "members-only" notes, never for secrets.
	const canSee = $derived(!!page.data.session?.user);
</script>

{#if canSee}
	<div class="private-prose">
		{#if badge}
			<span class="badge" title="Privat — nur für eingeloggte Benutzer sichtbar">
				<Lock size={11} strokeWidth={2.25} aria-hidden="true" />
				privat
			</span>
		{/if}
		{@render children()}
	</div>
{/if}

<style>
	.private-prose {
		position: relative;
		margin: 1.5rem 0;
		padding: 0.85rem 1rem;
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--color-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-tertiary);
	}

	/* Trim the first/last rendered block's margins so the box hugs its content. */
	.private-prose :global(> :first-child) {
		margin-top: 0;
	}
	.private-prose :global(> :last-child) {
		margin-bottom: 0;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-bottom: 0.5rem;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding: 0.18rem 0.5rem;
		border-radius: var(--radius-pill);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
</style>
