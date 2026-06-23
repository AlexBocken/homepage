<script>
  /**
   * A dashed/dotted outline that follows a sticker's silhouette. The contour
   * path is traced offline (scripts/trace-sticker-silhouettes.mjs) and passed in
   * as `d`, so the dashes run along the cat's actual outline.
   *
   * @type {{ d: string, size?: number, stroke?: string, strokeWidth?: number, dash?: string }}
   */
  let { d, size = 64, stroke = 'currentColor', strokeWidth = 9, dash = '0.5 16' } = $props();
</script>

{#if d}
  <svg
    class="sticker-outline"
    viewBox="0 0 200 200"
    width={size}
    height={size}
    aria-hidden="true"
  >
    <path
      {d}
      fill="none"
      style="stroke: {stroke}"
      stroke-width={strokeWidth}
      stroke-dasharray={dash}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
{/if}

<style>
  .sticker-outline {
    display: block;
    overflow: visible;
  }
</style>
