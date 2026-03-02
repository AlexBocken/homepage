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
   2. Click card thumbnail to play video
      + play triangle overlay on cards
   ═══════════════════════════════════════════ */
(function () {
  /* Add play overlay and click-to-play on card thumbnails */
  function processCards() {
    var cards = document.querySelectorAll('.cardImageContainer.coveredImage');
    cards.forEach(function (card) {
      if (card.dataset.bockenPlay) return;
      card.dataset.bockenPlay = '1';
      card.style.cursor = 'pointer';

      /* Add play triangle overlay */
      var overlay = document.createElement('div');
      overlay.className = 'bocken-play-overlay';
      overlay.innerHTML = '<span class="material-icons" aria-hidden="true">play_arrow</span>';
      card.appendChild(overlay);

      /* Click to play */
      card.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        /* Find the detail page's play/resume button */
        var playBtn = document.querySelector('.btnPlay[title="Resume"], .btnPlay[title="Play"]');
        if (playBtn) {
          playBtn.click();
          return;
        }

        /* If we're on the homepage, navigate to the item first */
        var itemCard = card.closest('.card');
        if (!itemCard) return;
        var link = itemCard.querySelector('a[data-id], button[data-id]');
        var id = link ? link.dataset.id : null;
        var serverId = link ? link.dataset.serverid : null;
        if (id && serverId) {
          window.location.hash = '/details?id=' + id + '&serverId=' + serverId;
          /* Wait for page to load, then click play */
          setTimeout(function () {
            var btn = document.querySelector('.btnPlay[title="Resume"], .btnPlay[title="Play"]');
            if (btn) btn.click();
          }, 1000);
        }
      });
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
