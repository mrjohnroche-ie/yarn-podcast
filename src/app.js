/* Season filtering on the landing page. Progressive enhancement only:
   without JS every episode is already in the grid. */
(function () {
  var filters = document.querySelectorAll('.filter');
  var grid = document.getElementById('episode-grid');
  var empty = document.getElementById('grid-empty');
  if (!filters.length || !grid) return;

  var cards = grid.querySelectorAll('.card');

  function apply(value) {
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
    var hash = value === 'all' ? '' : '#season-' + value;
    history.replaceState(null, '', hash || location.pathname + '#episodes');
  }

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      apply(btn.dataset.filter);
    });
  });

  var m = location.hash.match(/^#season-(\w+)$/);
  if (m) apply(m[1]);
})();
