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
        var match = value === 'all' || card.dataset.season === value;
        card.hidden = !match;
        if (match) shown++;
      });
      if (empty) empty.hidden = shown !== 0;
      filters.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.dataset.filter === value));
      });
      history.replaceState(null, '', value === 'all' ? location.pathname + '#episodes' : '#season-' + value);
    };

    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        apply(btn.dataset.filter);
      });
    });

    var season = location.hash.match(/^#season-(\w+)$/);
    if (season) apply(season[1]);
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

  var target = LEGACY[location.hash.replace('#', '')];
  if (target) location.replace(target);
})();
