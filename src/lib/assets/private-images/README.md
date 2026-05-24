# Private (auth-gated) image sources

Drop **private** source images here, then render them with
`<Image src="…" private />` from `$lib/components/Image.svelte`.

These can't use `@sveltejs/enhanced-img` — its output is a public asset. Instead
`scripts/build-private-images.ts` (runs at `prebuild`) encodes each image into
AVIF/WebP at multiple widths into `private-assets/` (gitignored, outside the
client bundle) and writes `src/lib/data/privateImages.generated.ts`. The bytes
are served only through the auth-gated endpoint
`src/routes/private-images/[...file]/+server.ts`.

```svelte
<script>
	import Image from '$lib/components/Image.svelte';
</script>

<!-- `src` is relative to THIS folder; shows a lock badge -->
<Image src="receipt.jpg" private alt="…" />

<!-- gate rendering behind your own auth check too -->
{#if data.session}
	<Image src="family/2024.jpg" private alt="…" sizes="min(1000px, 100vw)" />
{/if}
```

Setup / notes:

- **Dev:** run `pnpm exec vite-node scripts/build-private-images.ts` once (and
  after adding/changing images) so the manifest + `private-assets/` exist. You
  must be logged in for the gated endpoint to serve the bytes.
- **Prod (one-time):** add an nginx `internal` location so the bytes are only
  reachable via the endpoint's `X-Accel-Redirect`:

  ```nginx
  location /protected-images/ {
      internal;
      alias /var/www/static/private-images/;
  }
  ```

  `scripts/deploy.sh` rsyncs `private-assets/` → `/var/www/static/private-images/`.
- These source images are **gitignored** (private + large). Back them up
  separately.
- SVGs are not processed here.
