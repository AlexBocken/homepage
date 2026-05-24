# Public responsive image assets

Drop public source images here, then render them with `$lib/components/Image.svelte`.

At build time `@sveltejs/enhanced-img` (vite-imagetools + sharp) processes every
raster image in this folder into AVIF/WebP at multiple widths and strips EXIF.
Output is a public, hashed, immutable build asset.

```svelte
<script>
	import Image from '$lib/components/Image.svelte';
</script>

<!-- lazy by default; `src` is relative to this folder -->
<Image src="hero.jpg" alt="…" />

<!-- above-the-fold / LCP image: load eagerly -->
<Image src="hero.jpg" alt="…" lazy={false} />

<!-- full-width image: pass `sizes` so smaller screens fetch smaller files -->
<Image src="banner.jpg" alt="…" sizes="min(1280px, 100vw)" />

<!-- subfolders work too -->
<Image src="blog/cover.png" alt="…" />
```

For **private, auth-gated** images use `<Image src="…" private />` and put the
source in `../private-images/` instead — see that folder's README.

Notes:

- Provide images at ~2× the displayed size so HiDPI screens stay sharp;
  processing only ever scales **down**.
- SVGs are not processed here — import them directly instead.
- First build is slow (encoding); results are cached in
  `node_modules/.cache/imagetools`.
- These sources are committed (they're public site assets).
