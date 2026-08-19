/*
Companion to anki.css — the two are loaded together by the ankiweb deployment:

    ANKIWEB_THEME_CSS=https://bocken.org/other/anki.css
    ANKIWEB_THEME_JS=https://bocken.org/other/anki.js

It runs synchronously in <head>, before ankiweb's own bootstrap.js, and does three things
that CSS cannot: follow the system colour scheme, put the mark in the header as a real
link home, and give the vendored SvelteKit pages a header at all.

Nothing in here patches ankiweb. It only writes the preference ankiweb already reads, so
an upgrade of the app cannot break it and this file cannot break an upgrade.
*/
(function () {
	"use strict";

	// The key ankiweb's bootstrap reads. We write it; we never own it.
	var ANKI_KEY = "ankiweb-night";
	// Ours: "auto" (follow the system, the default) or "manual" (the user pressed the
	// moon button and meant it). bocken.org behaves the same way.
	var MODE_KEY = "bocken-anki-theme";

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
	function auto() {
		return read(MODE_KEY) !== "manual";
	}
	function systemNight() {
		return mq && mq.matches ? "1" : "0";
	}

	// ── 1. Follow the system ────────────────────────────────────────────────────
	// Stock ankiweb defaults to light and only goes dark when you press the moon. The
	// rest of bocken.org follows the system, so opening study.bocken.org at night should
	// not be the one white page. Written before bootstrap.js runs, so the class lands in
	// <head> and no light frame is ever painted.
	if (auto()) store(ANKI_KEY, systemNight());

	var night = read(ANKI_KEY) === "1" || location.hash.indexOf("night") !== -1;

	// The vendored SvelteKit pages (graphs, deck options, card info, the importers) do
	// not load bootstrap.js — they read a #night hash at boot. Set it before they boot.
	if (night && location.hash.indexOf("night") === -1) {
		location.hash = location.hash ? location.hash + "night" : "night";
	}

	// A live system change is worth following while we are still on auto. Applied by
	// toggling the class rather than reloading: the OS flipping to dark mid-review must
	// not throw away the answer you are looking at.
	if (mq && mq.addEventListener) {
		mq.addEventListener("change", function () {
			if (!auto()) return;
			var on = systemNight() === "1";
			store(ANKI_KEY, on ? "1" : "0");
			document.documentElement.classList.toggle("night-mode", on);
			document.documentElement.setAttribute("data-bs-theme", on ? "dark" : "light");
		});
	}

	// ── 2. The mark, and the moon ───────────────────────────────────────────────

	// Anki's own name for the deck list, in the languages this deployment is served in.
	var BACK = { de: "Stapel", fr: "Paquets", it: "Mazzi", es: "Mazos" };

	function markLink() {
		// The image itself is anki.css's business (#bocken-home), so the mark and the
		// palette stay in one file. This only makes it a link.
		var a = document.createElement("a");
		a.id = "bocken-home";
		a.href = "https://bocken.org";
		a.title = "bocken.org";
		a.setAttribute("aria-label", "bocken.org");
		return a;
	}

	function decorate() {
		var bar = document.getElementById("ankiweb-toolbar");
		if (bar) {
			if (!document.getElementById("bocken-home")) {
				bar.insertBefore(markLink(), bar.firstChild);
			}
			// Pressing the moon is a decision; stop tracking the system from then on.
			var moon = bar.querySelector(".nm");
			if (moon && !moon.dataset.bockenBound) {
				moon.dataset.bockenBound = "1";
				moon.addEventListener("click", function () {
					store(MODE_KEY, "manual");
				});
			}
			return;
		}

		// ── 3. A header for the SvelteKit pages ───────────────────────────────────
		// Those pages are vendored whole and have no toolbar, so deck options and the
		// importers otherwise look like a different application opening on top of this
		// one. They get the same pill, cut down to the mark and the way back.
		if (!document.body) return;
		var spa = document.createElement("div");
		spa.id = "ankiweb-toolbar";
		// Marks it as the cut-down bar: anki.css gives the server-rendered screens a
		// content column to sit under the pill, and the SPA pages lay themselves out.
		spa.dataset.spa = "1";
		spa.appendChild(markLink());
		var back = document.createElement("a");
		back.href = "/deckbrowser";
		// The app itself runs in whatever ANKIWEB_LANG says, and this is the one label
		// that is ours rather than Anki's, so it follows the browser instead of shipping
		// as English next to a German toolbar.
		back.textContent = "\u2190 " + (BACK[(navigator.language || "en").slice(0, 2)] || "Decks");
		spa.appendChild(back);
		document.body.appendChild(spa);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", decorate);
	} else {
		decorate();
	}
	// SvelteKit mounts after DOMContentLoaded and may replace what it finds in <body>.
	window.addEventListener("load", decorate);
})();
