<script>
  /**
   * One-shot "peel-on" of a sticker image, drawn on a canvas so the actual
   * alpha pixels are sampled — concave silhouettes just work, no masks. The
   * sticker wipes on along a fold line tilted `angle`° (bottom-left → top-right);
   * the lifted flap curls back on a cylinder, showing a cream underside and
   * casting a soft shadow on the part already stuck down.
   *
   * @type {{ src: string, size?: number, angle?: number, duration?: number, oncomplete?: () => void }}
   */
  let { src, size = 64, angle = 30, duration = 800, oncomplete } = $props();

  // Tunables — flip DIR if the peel runs the wrong way; CURL is radius vs flap.
  const DIR = 1;
  const CURL = 5; // higher = tighter radius / more aggressive curl-back
  const BACK_COLOR = '#c7ccd4'; // silver sticker backing

  /** @param {HTMLCanvasElement} canvas */
  function peel(canvas) {
    let raf = 0;
    let start = 0;
    let cancelled = false;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const A = (DIR * angle * Math.PI) / 180;

    // Canvas is generously larger than the sticker so the lifted flap + shadow
    // have room to overflow the footprint.
    const wcss = Math.round(size * 2.6);
    const cw = Math.round(wcss * dpr);
    canvas.width = cw;
    canvas.height = cw;
    canvas.style.width = wcss + 'px';
    canvas.style.height = wcss + 'px';
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));

    // Peel-space offscreens (square big enough to hold the rotated sticker).
    const Sd = Math.round(size * 1.7 * dpr);
    const drawSize = Math.round(size * dpr);
    /** @type {HTMLCanvasElement} */ let front;
    /** @type {HTMLCanvasElement} */ let back;

    /** @param {HTMLImageElement} img */
    function buildOffscreens(img) {
      front = document.createElement('canvas');
      front.width = Sd;
      front.height = Sd;
      const fc = /** @type {CanvasRenderingContext2D} */ (front.getContext('2d'));
      fc.translate(Sd / 2, Sd / 2);
      fc.rotate(-A); // pre-rotate so the main ctx.rotate(A) lands the cat upright
      fc.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);

      back = document.createElement('canvas');
      back.width = Sd;
      back.height = Sd;
      const bc = /** @type {CanvasRenderingContext2D} */ (back.getContext('2d'));
      bc.drawImage(front, 0, 0);
      bc.globalCompositeOperation = 'source-in'; // backing, clipped to the cat's alpha
      bc.fillStyle = BACK_COLOR;
      bc.fillRect(0, 0, Sd, Sd);
    }

    /** @param {number} t */
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    /** @param {number} p  0 = fully peeled off, 1 = flat/placed */
    function draw(p) {
      ctx.clearRect(0, 0, cw, cw);
      ctx.save();
      ctx.translate(cw / 2, cw / 2);
      ctx.rotate(A); // peel space → screen

      const half = Sd / 2;
      const top = -half;
      const bottom = half;
      // Stuck (flat) region grows from the bottom up as p → 1.
      const foldY = bottom - p * (bottom - top);

      // 1) Stuck part: the flat cat below the fold.
      ctx.save();
      ctx.beginPath();
      ctx.rect(-half, foldY, Sd, bottom - foldY);
      ctx.clip();
      ctx.drawImage(front, -half, -half);
      ctx.restore();

      // 2) Curling flap: thin bands from the tip down to the fold.
      const flapLen = foldY - top;
      if (flapLen > 1) {
        const r = Math.max(flapLen / CURL, 6 * dpr);
        const step = Math.max(1, Math.round(1.5 * dpr));
        for (let a = flapLen; a >= 0; a -= step) {
          const theta = a / r;
          if (theta > Math.PI) continue;
          const c = Math.cos(theta);
          const yScreen = foldY - r * Math.sin(theta);
          const sy = foldY - a + half; // source band top (pixel coords)
          if (sy < 0 || sy > Sd - step) continue;
          const sheet = c >= 0 ? front : back;
          const dh = Math.max(0.5, Math.abs(c) * step);
          const dy = c >= 0 ? yScreen - dh : yScreen;
          ctx.drawImage(sheet, 0, sy, Sd, step, -half, dy, Sd, dh);
        }
      }
      ctx.restore();
    }

    /** @param {number} ts */
    function frame(ts) {
      if (cancelled) return;
      if (!start) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      draw(easeOut(t));
      if (t < 1) raf = requestAnimationFrame(frame);
      else oncomplete?.();
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const img = new Image();
    const begin = () => {
      if (cancelled) return;
      buildOffscreens(img);
      if (reduce) {
        draw(1);
        oncomplete?.();
      } else {
        raf = requestAnimationFrame(frame);
      }
    };
    img.onload = begin;
    img.src = src;
    if (img.complete && img.naturalWidth) begin();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }
</script>

<span class="peel-host" style="width:{size}px;height:{size}px">
  <canvas class="peel-canvas" {@attach peel}></canvas>
</span>

<style>
  .peel-host {
    position: relative;
    display: inline-block;
    line-height: 0;
  }
  .peel-canvas {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
</style>
