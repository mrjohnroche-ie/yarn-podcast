/* Landing page behaviour. Progressive enhancement only: without JS every
   episode is in the grid and the header is simply always solid. */
(function () {
  /* ---- header: transparent over the hero, solid once you scroll past it -- */
  var header = document.querySelector('.site-header--over-hero');
  var heroEnd = document.getElementById('hero-end');

  if (header && heroEnd) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        function (entries) {
          header.classList.toggle('is-stuck', !entries[0].isIntersecting);
        },
        { rootMargin: '-60px 0px 0px 0px' }
      ).observe(heroEnd);
    } else {
      window.addEventListener('scroll', function () {
        header.classList.toggle('is-stuck', window.scrollY > heroEnd.offsetTop - 60);
      });
    }
  }

  /* ---- season filtering ------------------------------------------------- */
  var filters = document.querySelectorAll('.filter');
  var grid = document.getElementById('episode-grid');
  var empty = document.getElementById('grid-empty');

  if (filters.length && grid) {
    var cards = grid.querySelectorAll('.card');

    var apply = function (value) {
      var shown = 0;
      cards.forEach(function (card) {
        var tags = (card.dataset.tags || '').split(' ');
        var match = value === 'all' || tags.indexOf(value) !== -1;
        card.hidden = !match;
        if (match) shown++;
      });
      if (empty) empty.hidden = shown !== 0;
      filters.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.dataset.filter === value));
      });
      history.replaceState(null, '', value === 'all' ? location.pathname + '#episodes' : '#' + value);
    };

    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        apply(btn.dataset.filter);
      });
    });

    /* Deep links like /#true-crime open on that subject. */
    var wanted = location.hash.replace('#', '');
    if (wanted && grid.querySelector('[data-tags~="' + wanted + '"]')) apply(wanted);
  }

  /* ---- old Squarespace anchors ----------------------------------------- */
  /* The previous site was one long index page, so links to an episode look
     like yarnpodcast.com/#hotel. Those now live on their own pages. */
  var LEGACY = {
    hotel: 'episodes/hotel-on-the-edge-of-europe/',
    'judys-callers': 'episodes/judys-callers/',
    'escape-from-madrid': 'episodes/escape-from-madrid/',
    'highest-cyclist': 'episodes/the-highest-cyclist-in-the-world/',
    stalker: 'episodes/the-stalker/',
    jury: 'episodes/ladies-and-gentlemen-of-the-jury/',
    'lone-actors': 'episodes/lone-actor-terrorism/',
    'secret-palace': 'episodes/the-secret-palace/',
    'new-page-3': 'episodes/disability-a-parallel-history/',
    'how-not-to-be-a-spy-episode-1': 'episodes/how-not-to-be-a-spy/',
    stammer: 'episodes/stammer/',
    chernobyl: 'episodes/chernobyl/',
    'eyes-dont-lie': 'episodes/eyes-dont-lie/',
    'blak-bisnis': 'episodes/blak-bisnis/',
    billy: 'episodes/billy/',
    'bomber-boxer': 'episodes/the-boxer-and-the-bomber/',
    'lefty-1': 'episodes/lefty/',
    'new-page': 'episodes/the-absence-of-gary/'
  };

  /* Only from the landing page: the paths above are relative to the root. */
  var target = grid && LEGACY[location.hash.replace('#', '')];
  if (target) location.replace(target);
})();

/* ---- documentary club: filter as you type ----------------------------- */
(function () {
  var input = document.getElementById('doc-search-input');
  if (!input) return;

  var status = document.getElementById('doc-search-status');
  var sections = [].slice.call(document.querySelectorAll('.doc-section'));
  var index = document.querySelector('.doc-index');
  var count = document.querySelector('.doc-count');

  var entries = sections.map(function (section) {
    var films = [].slice.call(section.querySelectorAll('.doc-films li')).map(function (li) {
      return { li: li, text: li.textContent.toLowerCase() };
    });
    return {
      section: section,
      theme: section.querySelector('h2').textContent.toLowerCase(),
      /* The blurbs name films and years of their own, so they are noise in a
         set of results - they go while a search is running. */
      blurbs: [].slice.call(section.querySelectorAll('p')),
      films: films,
    };
  });

  var total = entries.reduce(function (n, e) { return n + e.films.length; }, 0);

  function run(raw) {
    var q = raw.trim().toLowerCase();
    if (!q) {
      entries.forEach(function (entry) {
        entry.section.hidden = false;
        entry.blurbs.forEach(function (b) { b.hidden = false; });
        entry.films.forEach(function (f) { f.li.hidden = false; });
      });
      if (index) index.hidden = false;
      if (count) count.hidden = false;
      if (status) status.textContent = '';
      return;
    }

    var shown = 0;
    entries.forEach(function (entry) {
      /* A theme name match keeps the whole section, so "war" finds the war ones. */
      var themeHit = entry.theme.indexOf(q) !== -1;
      var hits = 0;
      entry.films.forEach(function (f) {
        var match = themeHit || f.text.indexOf(q) !== -1;
        f.li.hidden = !match;
        if (match) hits++;
      });
      entry.section.hidden = hits === 0;
      entry.blurbs.forEach(function (b) { b.hidden = true; });
      shown += hits;
    });

    if (index) index.hidden = true;
    if (count) count.hidden = true;
    if (status) {
      status.textContent = shown
        ? shown + (shown === 1 ? ' documentary' : ' documentaries') + ' of ' + total
        : 'Nothing matches "' + raw.trim() + '"';
    }
  }

  input.addEventListener('input', function () { run(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { input.value = ''; run(''); }
  });
})();
