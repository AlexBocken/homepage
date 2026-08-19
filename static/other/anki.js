/*
Companion to anki.css — the two are loaded together by the ankiweb deployment:

    ANKIWEB_THEME_CSS=https://bocken.org/other/anki.css
    ANKIWEB_THEME_JS=https://bocken.org/other/anki.js

It runs synchronously in <head>, before ankiweb's own bootstrap.js, and does the
things CSS cannot: work the site's three-state theme control, put the mark in the
header, mark the page you are on, and give the vendored SvelteKit pages a header
at all.

Nothing in here patches ankiweb. It writes the preference ankiweb already reads
and sets the class ankiweb already looks for, so an upgrade of the app cannot
break it and this file cannot break an upgrade.
*/
(function () {
	"use strict";

	// The key ankiweb's bootstrap reads. We write it; we never own it.
	var ANKI_KEY = "ankiweb-night";
	// Ours, and the same three states as the site's toggle: "system" (the
	// default), "light", "dark".
	var MODE_KEY = "bocken-anki-theme";
	var MODES = ["system", "light", "dark"];

	// The pages that do not load ankiweb's bootstrap. They are vendored whole and
	// read a #night hash at boot instead, so the hash is the only way to tell them
	// which theme to start in. Kept in step with SPA_NIGHT_PREFIXES in
	// shell_src/bootstrap.ts.
	var SPA_PREFIXES = [
		"/graphs", "/deck-options", "/change-notetype", "/card-info",
		"/import-csv", "/import-anki-package", "/image-occlusion", "/congrats"
	];

	var mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");

	function store(key, value) {
		try {
			localStorage.setItem(key, value);
		} catch (e) {
			/* private mode, or storage disabled: the theme just stops being sticky */
		}
	}
	function read(key) {
		try {
			return localStorage.getItem(key);
		} catch (e) {
			return null;
		}
	}
	function mode() {
		var m = read(MODE_KEY);
		return MODES.indexOf(m) === -1 ? "system" : m;
	}
	function systemNight() {
		return !!(mq && mq.matches);
	}
	function nightFor(m) {
		return m === "dark" || (m === "system" && systemNight());
	}
	function isSpaPath(path) {
		for (var i = 0; i < SPA_PREFIXES.length; i++) {
			if (path === SPA_PREFIXES[i] || path.indexOf(SPA_PREFIXES[i] + "/") === 0) return true;
		}
		return false;
	}

	// ── Applying a theme ────────────────────────────────────────────────────────
	// Everything the app looks at, set in one place. Anki's night mode is a class
	// on <html>; ankiweb's bootstrap decides from localStorage; the vendored
	// SvelteKit pages read a #night hash. Miss one and the theme half-applies,
	// which is what made the button look unreliable — the hash kept saying dark
	// long after the button had been switched to light, and the next load read the
	// hash first.

	function setHash(night) {
		if (!isSpaPath(location.pathname)) return;
		var has = location.hash.indexOf("night") !== -1;
		if (night === has) return;
		var hash = night ? "#night" : "";
		// replaceState, not location.hash: assigning the hash pushes a history
		// entry, so Back would walk through every theme change instead of leaving.
		try {
			history.replaceState(null, "", location.pathname + location.search + hash);
		} catch (e) {
			location.hash = hash;
		}
	}

	function apply(night) {
		var root = document.documentElement;
		root.classList.toggle("night-mode", night);
		root.setAttribute("data-bs-theme", night ? "dark" : "light");
		store(ANKI_KEY, night ? "1" : "0");
		setHash(night);
		applyCardTheme(night);
	}

	// ── The theme, inside the card ──────────────────────────────────────────────
	// Anki's convention for "this card is being shown in the dark" is a class on the
	// body, which the desktop client sets and this fork does not. Setting it is the
	// cheap half of the job: it turns on three rules the vendored reviewer.css is
	// already waiting for — the canvas/fg body colours, `.nightMode .latex`,
	// `.nightMode img.drawing` — and every notetype written to the documented
	// convention starts working. Both spellings, because both are in the wild.
	function applyCardTheme(night) {
		if (!document.body) return; // called from <head>; decorate() repeats it
		document.body.classList.toggle("nightMode", night);
		document.body.classList.toggle("night_mode", night);
		repairCards(night);
	}

	// Links into the SvelteKit pages have to carry the hash, or opening deck
	// options from a dark deck list lands on a light page. ankiweb's bootstrap
	// does this once at DOMContentLoaded and for night mode only; this keeps it
	// true after every toggle, in both directions.
	function patchSpaLinks(night) {
		var links = document.querySelectorAll('a[href^="/"]');
		for (var i = 0; i < links.length; i++) {
			var base = (links[i].getAttribute("href") || "").split("#")[0];
			if (isSpaPath(base.split("?")[0])) {
				links[i].setAttribute("href", night ? base + "#night" : base);
			}
		}
	}

	// ── 1. Before anything is painted ───────────────────────────────────────────
	// Stock ankiweb defaults to light and only goes dark when you press the moon.
	// The rest of bocken.org follows the system, so opening study.bocken.org at
	// night should not be the one white page. Applied here in <head>, before
	// bootstrap.js and before <body> exists, so no light frame is ever painted.
	apply(nightFor(mode()));

	// A live system change is followed while the mode is "system", by toggling the
	// class rather than reloading: the OS flipping to dark mid-review must not
	// throw away the answer on screen.
	if (mq && mq.addEventListener) {
		mq.addEventListener("change", function () {
			if (mode() !== "system") return;
			var night = systemNight();
			apply(night);
			patchSpaLinks(night);
		});
	}


	// ── Colour maths ────────────────────────────────────────────────────────────
	// Two measures, for two different questions, and they are not interchangeable.
	//
	//   "which side of the theme is this colour on?"  → CIE L*, perceptual lightness
	//   "can you read this on that?"                  → WCAG 2.1 contrast ratio
	//
	// Relative luminance is the wrong tool for the first: mid grey #808080 has a
	// luminance of 0.22 but an L* of 53.6, so a 0.5 threshold on luminance would
	// call almost every colour dark.

	//: Below this, a background is too light for the dark theme; above it, too dark
	//: for the light one. The band between is left alone in both — a mid grey works
	//: on either ground, and repainting it would be churn.
	var L_TOO_LIGHT = 60;
	var L_TOO_DARK = 40;
	//: WCAG AA. Large text is 24px, or 18.66px at weight 700 and up.
	var MIN_CONTRAST = 4.5;
	var MIN_CONTRAST_LARGE = 3.0;

	function parseColor(value) {
		var m = /rgba?\(([^)]+)\)/.exec(value || "");
		if (!m) return null;
		var parts = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
		if (parts.length < 3 || parts.some(isNaN)) return null;
		return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
	}

	function toCss(c) {
		function b(n) { return Math.max(0, Math.min(255, Math.round(n))); }
		return "rgb(" + b(c.r) + ", " + b(c.g) + ", " + b(c.b) + ")";
	}

	function channel(v) {
		v /= 255;
		return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	}

	function luminance(c) {
		return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
	}

	function lstar(c) {
		var y = luminance(c);
		return y <= 216 / 24389 ? y * 24389 / 27 : Math.pow(y, 1 / 3) * 116 - 16;
	}

	function contrast(a, b) {
		var la = luminance(a), lb = luminance(b);
		return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
	}

	// Flip in HSL rather than inverting the channels: hue and saturation survive, so
	// a dark red panel comes back as a light red one instead of cyan.
	function flipLightness(c) {
		var r = c.r / 255, g = c.g / 255, b = c.b / 255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b);
		var l = (max + min) / 2, h = 0, s = 0;
		if (max !== min) {
			var d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
			else if (max === g) h = (b - r) / d + 2;
			else h = (r - g) / d + 4;
			h /= 6;
		}
		l = 1 - l;
		if (s === 0) return { r: l * 255, g: l * 255, b: l * 255, a: c.a };
		var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		var p = 2 * l - q;
		function hue(tt) {
			if (tt < 0) tt += 1;
			if (tt > 1) tt -= 1;
			if (tt < 1 / 6) return p + (q - p) * 6 * tt;
			if (tt < 1 / 2) return q;
			if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
			return p;
		}
		return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255, a: c.a };
	}

	function isWrongSide(color, night) {
		if (!color || color.a < 0.5) return false; // see-through: whatever is behind it decides
		var l = lstar(color);
		return night ? l > L_TOO_LIGHT : l < L_TOO_DARK;
	}

	function minContrastFor(px, weight) {
		var large = px >= 24 || (px >= 18.66 && weight >= 700);
		return large ? MIN_CONTRAST_LARGE : MIN_CONTRAST;
	}

	// null when the text is already readable — the whole policy in one function.
	function repairTextColor(fg, bg, threshold, tokenFg) {
		if (!fg || !bg) return null;
		if (contrast(fg, bg) >= threshold) return null;
		var flipped = flipLightness(fg);
		if (contrast(flipped, bg) >= threshold) return flipped;
		if (tokenFg && contrast(tokenFg, bg) >= threshold) return tokenFg;
		var white = { r: 255, g: 255, b: 255, a: 1 }, black = { r: 0, g: 0, b: 0, a: 1 };
		return contrast(white, bg) >= contrast(black, bg) ? white : black;
	}

	// ── The repair pass ─────────────────────────────────────────────────────────
	// Only what fails. A notetype that handles both themes measures fine and is left
	// exactly as its author wrote it — which is the point of doing this after the
	// class above rather than instead of it.

	//: Anki inverts LaTeX and drawings itself, and there is no safe automatic repair
	//: for a photo, a gradient or a background image.
	var SKIP = "img, svg, canvas, video, iframe, .latex, [data-bocken-skip]";
	//: Where cards render: the reviewer, and the preview screen's two sides.
	var CARD_ROOTS = "#qa, .preview-side";

	function token(name, fallback) {
		var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
		return parseColor(v) || parseColor(swatch(v)) || fallback;
	}

	//: Resolve a token that is a hex or a name by letting the browser do it.
	function swatch(value) {
		if (!value) return "";
		var probe = document.createElement("span");
		probe.style.cssText = "display:none;color:" + value;
		document.body.appendChild(probe);
		var out = getComputedStyle(probe).color;
		probe.remove();
		return out;
	}

	function effectiveBg(el, canvas) {
		for (var node = el; node && node.nodeType === 1; node = node.parentElement) {
			var c = parseColor(getComputedStyle(node).backgroundColor);
			if (c && c.a >= 0.5) return c;
		}
		return canvas;
	}

	function repairOne(root, night, canvas, tokenFg, selfOnly) {
		var nodes = selfOnly
			? [root]
			: [root].concat(Array.prototype.slice.call(root.querySelectorAll("*")));
		for (var i = 0; i < nodes.length; i++) {
			var el = nodes[i];
			if (el.matches && el.matches(SKIP)) continue;
			if (el.closest && el.closest(SKIP)) continue;
			var style = getComputedStyle(el);
			var parent = el.parentElement;
			var parentStyle = parent ? getComputedStyle(parent) : null;

			// Backgrounds. An image or a gradient is left alone: a flipped colour
			// underneath artwork is worse than the artwork being bright.
			if (style.backgroundImage === "none") {
				var bg = parseColor(style.backgroundColor);
				if (isWrongSide(bg, night)) {
					// The outermost surface blends into the app rather than staying a
					// slab in the middle of it; anything inside keeps its identity and
					// only changes side.
					var isSurface = el === root || (el.matches && el.matches(".card, body"));
					el.style.setProperty(
						"background-color",
						toCss(isSurface ? canvas : flipLightness(bg)),
						"important"
					);
				}
			}

			// Text, but only where this element is the one choosing the colour —
			// inherited values are already handled by whichever ancestor set them.
			if (parentStyle && style.color === parentStyle.color && el !== root) continue;
			var fg = parseColor(style.color);
			var fixed = repairTextColor(
				fg,
				effectiveBg(el, canvas),
				minContrastFor(parseFloat(style.fontSize) || 16, parseInt(style.fontWeight, 10) || 400),
				tokenFg
			);
			if (fixed) el.style.setProperty("color", toCss(fixed), "important");
		}
	}

	var repairQueued = false;

	function repairCards(night) {
		if (!document.body) return;
		if (repairQueued) return;
		repairQueued = true;
		var run = function () {
			repairQueued = false;
			var roots = document.querySelectorAll(CARD_ROOTS);
			if (!roots.length) return;
			var canvas = token("--canvas", night
				? { r: 0, g: 0, b: 0, a: 1 }
				: { r: 248, g: 246, b: 241, a: 1 });
			var tokenFg = token("--fg", night
				? { r: 229, g: 229, b: 229, a: 1 }
				: { r: 42, g: 42, b: 42, a: 1 });
			// The body first, and not only because it is the outer surface: Anki puts
			// the card's own class there (`<body class="card card1">`), so
			// `.card{background-color:white}` is a rule about the body, not about
			// anything inside #qa.
			repairOne(document.body, night, canvas, tokenFg, true);
			for (var i = 0; i < roots.length; i++) {
				repairOne(roots[i], night, canvas, tokenFg, false);
			}
		};
		// A timeout rather than requestAnimationFrame, which is suspended whenever the
		// page is not painting — a card rendered in a background tab would keep the
		// colours it was authored with until you looked at it, and then keep them
		// anyway, because the queued pass had never run and the flag stayed raised.
		setTimeout(run, 0);
	}

	// The reviewer replaces the card's markup in place on every question and answer,
	// so the pass has to follow the DOM rather than the page load.
	//
	// Two observers, because one is not enough. reviewer.js writes the card into #qa
	// and *then* assigns `body.className` wholesale from the card's own classes —
	// which drops the nightMode class and brings the notetype's `.card` rules into
	// play in that order. Watching only #qa means running just before both of those
	// land and being undone; watching the class as well means running again once the
	// card is really the card. Re-applying is idempotent: classList.toggle to a state
	// that already holds mutates nothing, so this settles rather than loops.
	var watching = false;

	function watchCards() {
		if (watching || !window.MutationObserver || !document.body) return;
		var roots = document.querySelectorAll(CARD_ROOTS);
		if (!roots.length) return;
		watching = true;
		var again = function () { applyCardTheme(nightFor(mode())); };
		var content = new MutationObserver(again);
		for (var i = 0; i < roots.length; i++) {
			content.observe(roots[i], { childList: true, subtree: true });
		}
		new MutationObserver(again).observe(document.body, {
			attributes: true,
			attributeFilter: ["class"],
		});
	}

	// ── 2. The header ───────────────────────────────────────────────────────────

	function markLink() {
		// The artwork is anki.css's business (#bocken-home), so the mark and the
		// palette stay in one file. This only makes it a link.
		var a = document.createElement("a");
		a.id = "bocken-home";
		a.href = "https://bocken.org";
		a.title = "bocken.org";
		a.setAttribute("aria-label", "bocken.org");
		return a;
	}

	// The deck list answers to two paths; every other item is its own href.
	function markCurrent(bar) {
		var here = location.pathname.replace(/\/+$/, "") || "/deckbrowser";
		var links = bar.querySelectorAll("a");
		for (var i = 0; i < links.length; i++) {
			var href = (links[i].getAttribute("href") || "").split("?")[0];
			links[i].classList.toggle(
				"active", href === here && links[i].id !== "bocken-home"
			);
		}
	}

	function labelFor(m) {
		return m === "light" ? "Light" : m === "dark" ? "Dark" : "Follow system";
	}

	function takeOverThemeButton(button) {
		function render() {
			var m = mode();
			button.dataset.mode = m;
			button.title = "Theme: " + labelFor(m);
			button.setAttribute("aria-label", "Theme: " + labelFor(m));
		}
		// Replaces ankiwebToggleNight, which flips the stored flag and reloads. The
		// reload is most of why this felt unreliable: it raced the hash and the
		// system preference, and a page that reloads to the same colour reads as a
		// button that did nothing.
		button.onclick = function (event) {
			event.preventDefault();
			var next = MODES[(MODES.indexOf(mode()) + 1) % MODES.length];
			store(MODE_KEY, next);
			var night = nightFor(next);
			apply(night);
			patchSpaLinks(night);
			render();
		};
		render();
	}

	function decorate() {
		var bar = document.getElementById("ankiweb-toolbar");
		if (bar) {
			if (!document.getElementById("bocken-home")) {
				bar.insertBefore(markLink(), bar.firstChild);
			}
			var button = bar.querySelector(".nm");
			if (button && !button.dataset.bockenBound) {
				button.dataset.bockenBound = "1";
				takeOverThemeButton(button);
			}
			markCurrent(bar);
			patchSpaLinks(nightFor(mode()));
			applyCardTheme(nightFor(mode()));
			watchCards();
			return;
		}

		applyCardTheme(nightFor(mode()));
		watchCards();

		// No bar to decorate: /edit is a bare fragment inside the Browser's iframe
		// and is meant to have none. The SvelteKit pages get the real toolbar from
		// ankiweb itself, so there is nothing to build here any more.
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", decorate);
	} else {
		decorate();
	}
	// SvelteKit mounts after DOMContentLoaded, so the pages it owns are decorated
	// again once it has settled.
	window.addEventListener("load", decorate);

	// The colour maths, for tests/unit/anki. Pure functions only — the DOM pass is
	// exercised by eye and by the reviewer itself.
	window.__bockenAnkiTheme = {
		parseColor: parseColor,
		toCss: toCss,
		luminance: luminance,
		lstar: lstar,
		contrast: contrast,
		flipLightness: flipLightness,
		isWrongSide: isWrongSide,
		minContrastFor: minContrastFor,
		repairTextColor: repairTextColor,
	};
})();
