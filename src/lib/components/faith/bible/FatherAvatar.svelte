<script lang="ts">
	/**
	 * A commentator as a round portrait, face-centred, or two initials on a
	 * tinted disc when there is no painting of him. The crops come from
	 * `pnpm bible:fathers`; `size` picks the nearest of 48, 96 and 192 px.
	 */
	import { fatherInitials, portraitUrl, PORTRAIT_SIZES } from '$lib/faith/fathers';
	import { FATHERS_BLUR } from '$lib/data/fathersBlur.generated';

	interface Props {
		id: string;
		name: string;
		hasPortrait: boolean;
		size?: number;
		/** Screen-reader text; the visible name comes from the caller's tooltip. */
		label?: string;
	}
	const { id, name, hasPortrait, size = 24, label }: Props = $props();
	// Retina: fetch about twice the CSS size.
	const px = $derived(PORTRAIT_SIZES.find((s) => s >= size * 2) ?? PORTRAIT_SIZES[PORTRAIT_SIZES.length - 1]);
	let broken = $state(false);
	// The blurred stand-in painted under the crop while it loads (`pnpm bible:fathers:blur`).
	const blur = $derived(FATHERS_BLUR[id]);
	// No painting: a disc in one of the palette's accents, chosen by the name so it stays the same everywhere.
	const ACCENTS = ['--blue', '--red', '--green', '--orange', '--nord7', '--nord9', '--nord13', '--nord15'];
	const accent = $derived.by(() => {
		let h = 0;
		for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
		return ACCENTS[h % ACCENTS.length];
	});
</script>

<span class="avatar" style="--size: {size}px; --accent: var({accent})" role={label ? 'img' : undefined} aria-label={label}>
	{#if hasPortrait && !broken}
		<img src={portraitUrl(id, px)} srcset="{portraitUrl(id, 48)} 48w, {portraitUrl(id, 96)} 96w, {portraitUrl(id, 192)} 192w" sizes="{size}px" alt="" width={size} height={size} loading="lazy" decoding="async" style:--lqip={blur ? `url("${blur}")` : null} onerror={() => (broken = true)} />
	{:else}
		<span class="initials" aria-hidden="true">{fatherInitials(name)}</span>
	{/if}
</span>

<style>
	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		overflow: hidden;
		flex: 0 0 auto;
		background: color-mix(in srgb, var(--accent) 18%, var(--color-surface));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent);
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		/* The placeholder plus its dither, as on every other image with one
		   (see --lqip-grain in app.css); covered the moment the crop decodes. */
		background-image: var(--lqip-grain), var(--lqip, none);
		background-size: 96px 96px, cover;
		background-position: center;
		background-repeat: repeat, no-repeat;
	}
	.initials {
		font-family: 'Linux Libertine', Georgia, serif;
		font-size: calc(var(--size) * 0.42);
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--accent);
		line-height: 1;
	}
</style>
