/*
 * Custom Jellyfin UI enhancements
 * Import via custom JS plugin
 */

/* ═══════════════════════════════════════════
   1. Home/Favorites icon buttons in header
   ═══════════════════════════════════════════ */
(function () {
  var homeBtn = null;
  var favBtn = null;

  function ensureButtons() {
    var header = document.querySelector('.skinHeader:not(.osdHeader)');
    if (!header) return;

    var headerRight = header.querySelector('.headerRight');
    if (!headerRight) return;

    /* Already injected and still in the DOM — just update state */
    if (homeBtn && homeBtn.parentNode && favBtn && favBtn.parentNode) {
      updateActiveStates(header);
      return;
    }

    /* Clean up any orphans */
    document.querySelectorAll('.bocken-home-btn, .bocken-fav-btn').forEach(
      function (el) { el.remove(); }
    );

    /* Create home button */
    homeBtn = document.createElement('button');
    homeBtn.type = 'button';
    homeBtn.className =
      'headerButton headerButtonRight bocken-home-btn paper-icon-button-light';
    homeBtn.title = 'Home';
    homeBtn.innerHTML =
      '<span class="material-icons" aria-hidden="true">home</span>';

    /* Create favorites button */
    favBtn = document.createElement('button');
    favBtn.type = 'button';
    favBtn.className =
      'headerButton headerButtonRight bocken-fav-btn paper-icon-button-light';
    favBtn.title = 'Favorites';
    favBtn.innerHTML =
      '<span class="material-icons" aria-hidden="true">favorite_border</span>';

    /* Insert at the beginning of headerRight (before dice/cast/etc) */
    headerRight.prepend(favBtn);
    headerRight.prepend(homeBtn);

    function isHomePage() {
      return window.location.hash === '#/home'
        || window.location.hash.startsWith('#/home?');
    }

    /* Click handlers */
    homeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (isHomePage()) {
        var tab = header.querySelector('.emby-tab-button[data-index="0"]');
        if (tab) { tab.click(); return; }
      }
      window.location.hash = '/home';
    });

    favBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (isHomePage()) {
        var tab = header.querySelector('.emby-tab-button[data-index="1"]');
        if (tab) { tab.click(); return; }
      }
      /* Navigate to home first, then activate favorites tab */
      window.location.hash = '/home';
      setTimeout(function () {
        var t = document.querySelector('.emby-tab-button[data-index="1"]');
        if (t) t.click();
      }, 500);
    });

    updateActiveStates(header);

    /* Watch for tab changes */
    var tabs = header.querySelector('.headerTabs');
    if (tabs) {
      new MutationObserver(function () {
        updateActiveStates(header);
      }).observe(tabs, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  }

  function updateActiveStates(header) {
    if (!homeBtn || !favBtn) return;
    var activeTab = header.querySelector('.emby-tab-button-active');
    var activeText = activeTab
      ? activeTab.textContent.trim().toLowerCase()
      : '';

    homeBtn.classList.toggle('bocken-nav-active', activeText === 'home');
    favBtn.classList.toggle('bocken-nav-active', activeText === 'favorites');

    var icon = favBtn.querySelector('.material-icons');
    if (icon) {
      icon.textContent =
        activeText === 'favorites' ? 'favorite' : 'favorite_border';
    }
  }

  var pending = null;
  function scheduleCheck() {
    if (pending) return;
    pending = setTimeout(function () {
      pending = null;
      ensureButtons();
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleCheck);
  } else {
    scheduleCheck();
  }

  new MutationObserver(scheduleCheck).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();

/* ═══════════════════════════════════════════
   2. Make Bocken logo link to bocken.org
   Uses click delegation so we don't wrap the
   DOM — Jellyfin reuses the same <h3> across
   navigations and swaps its class between
   .pageTitleWithDefaultLogo (home) and
   .pageTitle (collection pages), which would
   leak the wrapper onto unrelated titles.
   ═══════════════════════════════════════════ */
(function () {
  var isMobileApp = /wv\)|Jellyfin Mobile/.test(navigator.userAgent);

  /* One-time cleanup of legacy <a.bocken-logo-link> wrappers
     left behind by older versions of this script. */
  function unwrapLegacy() {
    document.querySelectorAll('a.bocken-logo-link').forEach(function (a) {
      while (a.firstChild) a.parentNode.insertBefore(a.firstChild, a);
      a.remove();
    });
    document.querySelectorAll('[data-bocken-linked]').forEach(function (el) {
      delete el.dataset.bockenLinked;
    });
  }

  function openBocken() {
    if (isMobileApp) {
      navigator.clipboard.writeText('https://bocken.org').then(function () {
        var toast = document.createElement('div');
        toast.className = 'bocken-toast';
        toast.textContent = 'Link copied — open in browser';
        document.body.appendChild(toast);
        setTimeout(function () { toast.classList.add('bocken-toast-hide'); }, 2000);
        setTimeout(function () { toast.remove(); }, 2500);
      });
    } else {
      window.location.href = 'https://bocken.org';
    }
  }

  document.addEventListener('click', function (e) {
    var logo = e.target.closest(
      '.skinHeader:not(.osdHeader) .pageTitleWithDefaultLogo'
    );
    if (!logo) return;
    e.preventDefault();
    e.stopPropagation();
    openBocken();
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', unwrapLegacy);
  } else {
    unwrapLegacy();
  }

  /* Catch wrappers that re-appear from cached SPA state */
  new MutationObserver(unwrapLegacy).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();

/* ═══════════════════════════════════════════
   3. Click card thumbnail to play video
      + play triangle overlay on cards
   ═══════════════════════════════════════════ */
(function () {
  var PLAY_BTN_SELECTOR = '.btnPlay[title="Resume"], .btnPlay[title="Play"]';

  /* Leaf items that play directly. Folders (Series, Season, BoxSet,
     CollectionFolder/UserView = library covers) open a detail page
     instead — clicking their cover must not start playback. */
  var PLAYABLE_TYPES = ['Movie', 'Episode', 'Video', 'MusicVideo', 'Audio', 'AudioBook'];

  /* The play/resume button of the details page currently on screen.
     Hidden pages stay in the DOM, so visibility is what qualifies it. */
  function pagePlayButton() {
    var btns = document.querySelectorAll(PLAY_BTN_SELECTOR);
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].offsetParent !== null) return btns[i];
    }
    return null;
  }

  /* Card data lives on .card, but some layouts put it on the inner
     anchor/button instead. Merge both, preferring the outer element. */
  function getCardInfo(imageContainer) {
    var card = imageContainer.closest('.card');
    if (!card) return null;
    var inner = card.querySelector('[data-id]');
    function attr(name) {
      return card.getAttribute('data-' + name)
        || (inner && inner.getAttribute('data-' + name))
        || '';
    }
    var id = attr('id');
    if (!id) return null;
    return {
      id: id,
      serverId: attr('serverid'),
      type: attr('type'),
      isFolder: attr('isfolder') === 'true',
      collectionType: attr('collectiontype'),
    };
  }

  function isPlayable(info) {
    if (!info || !info.id || !info.serverId) return false;
    if (info.isFolder) return false;
    if (info.collectionType) return false;
    return PLAYABLE_TYPES.indexOf(info.type) !== -1;
  }

  function currentDetailsId() {
    var m = /[#&?]id=([^&]+)/.exec(window.location.hash);
    return m && window.location.hash.indexOf('/details') !== -1
      ? decodeURIComponent(m[1])
      : null;
  }

  /* Poll until the details page for `id` has rendered its own play
     button, so we never click a stale button left from the page we
     navigated away from. */
  function playWhenReady(id, deadline) {
    if (currentDetailsId() !== id) return;
    var btn = pagePlayButton();
    if (btn) {
      btn.click();
      return;
    }
    if (Date.now() > deadline) return;
    setTimeout(function () { playWhenReady(id, deadline); }, 100);
  }

  /* What clicking this image container should do, or null for
     "nothing — let Jellyfin handle it".
       kind 'page'  → the details page's own poster: press this page's
                      play button (a Series poster plays next unwatched,
                      which is what its button already does).
       kind 'item'  → a card in a row: play that specific item.
     The poster carries no data-id of its own, hence the split. */
  function getTarget(imageContainer) {
    if (imageContainer.closest('.detailImageContainer')) {
      var pageId = currentDetailsId();
      /* No visible play button = nothing playable on this page. */
      if (!pageId || !pagePlayButton()) return null;
      return { kind: 'page', id: pageId };
    }
    var info = getCardInfo(imageContainer);
    if (!isPlayable(info)) return null;
    return { kind: 'item', id: info.id, serverId: info.serverId };
  }

  function onCardClick(e) {
    var info = getTarget(e.currentTarget);
    if (!info) return; /* let Jellyfin navigate normally */

    e.preventDefault();
    e.stopPropagation();

    /* The page's own poster, or a card for the item already open —
       either way this page's button is the right one. */
    if (info.kind === 'page' || currentDetailsId() === info.id) {
      var btn = pagePlayButton();
      if (btn) btn.click();
      return;
    }

    window.location.hash =
      '/details?id=' + encodeURIComponent(info.id) +
      '&serverId=' + encodeURIComponent(info.serverId);
    playWhenReady(info.id, Date.now() + 5000);
  }

  /* Add play overlay and click-to-play on card thumbnails */
  function processCards() {
    var cards = document.querySelectorAll(
      '.cardImageContainer.coveredImage, .detailImageContainer .cardImageContainer'
    );
    cards.forEach(function (card) {
      var info = getTarget(card);
      var playable = !!info;

      /* Jellyfin recycles card elements across views, and the details
         poster renders before its play button does, so re-evaluate
         whenever what's behind this container changes. */
      var stamp = playable ? info.kind + ':' + info.id : 'none';
      if (card.dataset.bockenPlayId === stamp) return;
      card.dataset.bockenPlayId = stamp;

      card.style.cursor = playable ? 'pointer' : '';

      var overlay = card.querySelector('.bocken-play-overlay');
      if (playable && !overlay) {
        overlay = document.createElement('div');
        overlay.className = 'bocken-play-overlay';
        overlay.innerHTML =
          '<span class="material-icons" aria-hidden="true">play_arrow</span>';
        card.appendChild(overlay);
      } else if (!playable && overlay) {
        overlay.remove();
      }

      if (!card.dataset.bockenPlay) {
        card.dataset.bockenPlay = '1';
        card.addEventListener('click', onCardClick);
      }
    });
  }

  var pending = null;
  function scheduleProcess() {
    if (pending) return;
    pending = setTimeout(function () {
      pending = null;
      processCards();
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleProcess);
  } else {
    scheduleProcess();
  }

  new MutationObserver(scheduleProcess).observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
