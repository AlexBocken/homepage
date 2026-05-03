/**
 * Postbuild: turn each prerendered /errors/<status> route into a self-contained
 * HTML file at build/client/errors/<status>.html for nginx error_page use.
 *
 *   - Inlines every <link rel="stylesheet"> by replacing it with <style>.
 *   - Strips <script type="module"> and <link rel="modulepreload"> (csr=false,
 *     so JS is dead weight and a missing-asset risk if upstream is dead).
 *   - Leaves font/image URLs alone — nginx serves them from the same root.
 *   - Emits matching .gz + .br for nginx gzip_static / brotli_static.
 *
 * Run: pnpm exec vite-node scripts/build-error-page.ts
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, brotliCompressSync, constants as zlib } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const PRERENDER_DIR = join(ROOT, 'build/prerendered/errors');
const CLIENT = join(ROOT, 'build/client');
const OUT_DIR = join(CLIENT, 'errors');

// Error pages may be served from arbitrary domains via nginx's default_server
// catchall. Rewrite the home-link to an absolute canonical URL so clicking
// the logo always lands on the real site.
const CANONICAL_HOME = 'https://bocken.org/';

// Marker for idempotent script injection (so re-runs don't stack copies).
const LANG_SCRIPT_MARKER = 'data-error-toggles';
// Wires up language + theme toggles without Svelte hydration. Runs early
// so <html data-lang="…"> is set before paint (avoids flash of both langs).
// The icon inside the theme button is Svelte-reactive and stays at the
// SSR-rendered shape; the actual theme cycle + persistence still works.
const LANG_SCRIPT = `
<script ${LANG_SCRIPT_MARKER}>
(function(){try{
  var html=document.documentElement;
  var pref=localStorage.getItem('preferredLanguage');
  var lang=(pref==='en'||pref==='de')?pref:'de';
  html.setAttribute('data-lang',lang);
  var wire=function(){
    var langBtn=document.getElementById('lang-toggle');
    if(langBtn){
      var refresh=function(){
        var cur=html.getAttribute('data-lang')||'de';
        var next=cur==='de'?'en':'de';
        langBtn.textContent=next.toUpperCase();
        langBtn.setAttribute('aria-label',next==='en'?'Switch to English':'Auf Deutsch wechseln');
      };
      refresh();
      langBtn.addEventListener('click',function(){
        var cur=html.getAttribute('data-lang')||'de';
        var next=cur==='de'?'en':'de';
        html.setAttribute('data-lang',next);
        try{localStorage.setItem('preferredLanguage',next);}catch(_){}
        refresh();
      });
    }
    var themeBtn=document.querySelector('button[aria-label^="Toggle theme"]');
    if(themeBtn){
      var CYCLE=['system','light','dark'];
      var getTheme=function(){
        var s=localStorage.getItem('theme');
        return (s==='light'||s==='dark')?s:'system';
      };
      var applyTheme=function(t){
        if(t==='system'){delete html.dataset.theme;try{localStorage.removeItem('theme');}catch(_){}}
        else{html.dataset.theme=t;try{localStorage.setItem('theme',t);}catch(_){}}
        themeBtn.setAttribute('aria-label','Toggle theme ('+t+')');
        themeBtn.setAttribute('title','Theme: '+t);
      };
      themeBtn.addEventListener('click',function(){
        var cur=getTheme();
        var next=CYCLE[(CYCLE.indexOf(cur)+1)%CYCLE.length];
        applyTheme(next);
      });
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);
  else wire();
}catch(_){}})();
</script>`;

if (!existsSync(PRERENDER_DIR)) {
  console.error(`[error-page] missing prerender dir: ${PRERENDER_DIR}`);
  console.error('[error-page] is /errors/[status=httpStatus]/+page.ts setting `prerender = true` with `entries()`?');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

// Recursively collect every prerendered html under build/prerendered/errors,
// so we pick up nested language variants (errors/en/<status>.html).
function walk(dir: string, prefix = ''): { rel: string; abs: string }[] {
  const out: { rel: string; abs: string }[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, ent.name);
    const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
    if (ent.isDirectory()) out.push(...walk(abs, rel));
    else if (ent.isFile() && ent.name.endsWith('.html')) out.push({ rel, abs });
  }
  return out;
}

const sources = walk(PRERENDER_DIR);
if (sources.length === 0) {
  console.error(`[error-page] no .html files under ${PRERENDER_DIR}`);
  process.exit(1);
}

// Resolve a possibly-relative href (../foo, ./foo, /foo) against the page's
// path (e.g. /errors/503.html) into a path inside CLIENT.
function resolveAsset(href: string, pagePath: string): string {
  const abs = posix.resolve(posix.dirname(pagePath), href); // e.g. /_app/immutable/assets/x.css
  return join(CLIENT, abs.replace(/^\//, ''));
}

function inline(html: string, pagePath: string): string {
  // Inline <link rel="stylesheet"> regardless of attribute order.
  html = html.replace(/<link\b[^>]*>/g, (tag) => {
    if (!/\brel=["']stylesheet["']/.test(tag)) return tag;
    const m = tag.match(/\bhref=["']([^"']+)["']/);
    if (!m) return tag;
    const cssPath = resolveAsset(m[1], pagePath);
    if (!existsSync(cssPath)) {
      console.warn(`[error-page] stylesheet not found, leaving link tag: ${m[1]}`);
      return tag;
    }
    return `<style>${readFileSync(cssPath, 'utf8')}</style>`;
  });
  // Drop module preloads and module scripts — nothing should hydrate.
  html = html.replace(/<link[^>]*\brel=["']modulepreload["'][^>]*>\s*/g, '');
  html = html.replace(/<script[^>]*\btype=["']module["'][^>]*>[\s\S]*?<\/script>\s*/g, '');

  // Point the brand/home link at the canonical site (the page may be served
  // from any domain when used as nginx's default_server fallback).
  html = html.replace(/<a\b[^>]*\bclass="[^"]*\bhome-link\b[^"]*"[^>]*>/g, (tag) =>
    tag.replace(/\bhref="[^"]*"/, `href="${CANONICAL_HOME}"`)
  );

  // Inject the language-toggle bootstrap script just before </head> so
  // <html data-lang="…"> is set before the body paints (avoids flash of
  // both languages). Idempotent — if the marker is already present, skip.
  if (!html.includes(LANG_SCRIPT_MARKER)) {
    html = html.replace('</head>', `${LANG_SCRIPT}</head>`);
  }
  return html;
}

for (const { rel, abs } of sources) {
  const dst = join(OUT_DIR, rel);
  mkdirSync(dirname(dst), { recursive: true });
  const html = inline(readFileSync(abs, 'utf8'), `/errors/${rel}`);
  const buf = Buffer.from(html, 'utf8');
  writeFileSync(dst, buf);
  writeFileSync(`${dst}.gz`, gzipSync(buf, { level: 9 }));
  writeFileSync(`${dst}.br`, brotliCompressSync(buf, {
    params: { [zlib.BROTLI_PARAM_QUALITY]: 11 }
  }));
  console.log(`[error-page] wrote errors/${rel} (${(buf.length / 1024).toFixed(1)} kB) + .gz + .br`);
}
