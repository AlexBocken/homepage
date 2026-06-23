<script>
  import { stickerOutlineUrl } from '$lib/utils/stickers';

  /**
   * Dashed-outline placeholder for a not-yet-collected sticker. The outline
   * *shape* (dash pattern, padding) is baked into a static SVG by
   * scripts/trace-sticker-silhouettes.mjs and served by nginx; the *colour* is
   * applied here via a CSS mask, so callers can tint it per context.
   *
   * @type {{ image: string, size?: number, color?: string }}
   */
  let { image, size = 64, color = 'rgba(90, 74, 44, 0.5)' } = $props();
</script>

{#if image}
  <span
    class="sticker-outline"
    style="--u: url('{stickerOutlineUrl(image)}'); width: {size}px; height: {size}px; background: {color};"
    aria-hidden="true"
  ></span>
{/if}

<style>
  .sticker-outline {
    display: inline-block;
    -webkit-mask: var(--u) center / contain no-repeat;
    mask: var(--u) center / contain no-repeat;
  }
</style>
