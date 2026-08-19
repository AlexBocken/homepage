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

	// Anki's own name for the deck list, in the languages this deployment serves.
	var BACK = { de: "Stapel", fr: "Paquets", it: "Mazzi", es: "Mazos" };

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
			return;
		}

		// ── 3. A header for the SvelteKit pages ───────────────────────────────────
		// Those pages are vendored whole and have no toolbar, so deck options and
		// the importers otherwise look like a different application opening on top
		// of this one. They get the same pill, cut down to the mark and the way
		// back.
		//
		// Only those pages. The other toolbar-less document is /edit, which is a
		// bare fragment inside the Browser's iframe — a floating pill there would
		// land on top of the note being edited.
		if (!document.body || !isSpaPath(location.pathname)) return;
		var spa = document.createElement("div");
		spa.id = "ankiweb-toolbar";
		// Marks it as the cut-down bar: anki.css gives the server-rendered screens
		// a content column to sit under the pill, and the SPA pages lay themselves
		// out.
		spa.dataset.spa = "1";
		spa.appendChild(markLink());
		var back = document.createElement("a");
		back.href = "/deckbrowser";
		// The app runs in whatever ANKIWEB_LANG says, and this is the one label
		// that is ours rather than Anki's, so it follows the browser instead of
		// shipping as English next to a German toolbar.
		back.textContent = BACK[(navigator.language || "en").slice(0, 2)] || "Decks";
		spa.appendChild(back);
		document.body.appendChild(spa);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", decorate);
	} else {
		decorate();
	}
	// SvelteKit mounts after DOMContentLoaded and may replace what it finds in
	// <body>, so the bar is put back if it went away.
	window.addEventListener("load", decorate);
})();
