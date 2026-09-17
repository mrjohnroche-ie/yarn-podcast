#!/usr/bin/env node
/**
 * Yarn | A Story Podcast - static site builder.
 *
 *   node build.mjs
 *
 * Reads data/site.json + data/episodes.json, copies assets, and writes a
 * fully static site to dist/ (works over http or straight from the file
 * system - every path is relative).
 */

import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');

const site = JSON.parse(await readFile(path.join(ROOT, 'data/site.json'), 'utf8'));
const data = JSON.parse(await readFile(path.join(ROOT, 'data/episodes.json'), 'utf8'));
const docClub = JSON.parse(await readFile(path.join(ROOT, 'data/doc-club.json'), 'utf8'));
const press = JSON.parse(await readFile(path.join(ROOT, 'data/press.json'), 'utf8'));
const episodes = data.episodes;
const extras = data.extras;
const seasons = site.seasons;

/* The Squarespace site this replaces put every season on its own page, and the
   URLs are in the wild - they stay exactly as they were, season 4 and 6 spelling
   included. Anything else that used to resolve is redirected in vercel.json. */
const seasonOf = (n) => seasons.find((s) => s.n === n);

/* The stylesheet and the script are cached hard at the edge, so their URLs
   carry a hash of their contents: a deploy that changes them changes the URL. */
const stamp = createHash('sha1')
  .update(await readFile(path.join(ROOT, 'src/styles.css')))
  .update(await readFile(path.join(ROOT, 'src/app.js')))
  .digest('hex')
  .slice(0, 8);

/* ---- helpers --------------------------------------------------------- */

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function prettyDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function shortDate(iso) {
  if (!iso) return null;
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/* No theme param: left alone, the Spotify player tints itself from the
   episode artwork, the way the old site's embeds did. theme=0 would force
   every one of them to the same flat black. */
const spotifyEmbed = (id, title) =>
  `<iframe src="https://open.spotify.com/embed/episode/${esc(id)}?utm_source=generator" title="Spotify player: ${esc(title)}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>`;

/* ---- platform icons (inline, so there is nothing extra to load) ------- */

const ICONS = {
  apple: '<path d="M12 2a5.2 5.2 0 0 0-5.2 5.2v2.1H6A2.9 2.9 0 0 0 3 12.3v1.4a2.9 2.9 0 0 0 5.8 0v-1.4A2.9 2.9 0 0 0 7.5 9.7V7.2a4.5 4.5 0 0 1 9 0v2.5a2.9 2.9 0 0 0-1.3 2.6v1.4a2.9 2.9 0 0 0 5.8 0v-1.4a2.9 2.9 0 0 0-2.8-2.9V7.2A5.2 5.2 0 0 0 12 2Z"/><path d="M12 11.6a2.6 2.6 0 0 0-2.6 2.6c0 1 .6 1.9 1.4 2.3l-.7 4a1.9 1.9 0 0 0 1.9 2.2 1.9 1.9 0 0 0 1.9-2.2l-.7-4a2.6 2.6 0 0 0 1.4-2.3 2.6 2.6 0 0 0-2.6-2.6Z"/>',
  spotify: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.4a.8.8 0 0 1-1.1.3c-3-1.8-6.7-2.2-11.1-1.2a.8.8 0 1 1-.3-1.5c4.8-1.1 8.9-.6 12.2 1.4a.8.8 0 0 1 .3 1Zm1.2-2.8a1 1 0 0 1-1.3.3c-3.4-2.1-8.5-2.7-12.5-1.5a1 1 0 0 1-.6-1.9c4.5-1.4 10.2-.7 14.1 1.7a1 1 0 0 1 .3 1.4Zm.1-2.9C14.1 8.3 7.9 8.1 4.4 9.2a1.2 1.2 0 1 1-.7-2.3C7.8 5.6 14.6 5.8 19 8.4a1.2 1.2 0 0 1-1.2 2.1l.1.2Z"/>',
  pocketcasts: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3.1a6.9 6.9 0 0 1 6.9 6.9h-2.6A4.3 4.3 0 1 0 12 16.3v2.6A6.9 6.9 0 0 1 12 5.1Z"/>',
  overcast: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-4.3 5.3.9.9a4.8 4.8 0 0 0 0 6.7l-.9.9a6 6 0 0 1 0-8.5Zm8.6 0a6 6 0 0 1 0 8.5l-.9-.9a4.8 4.8 0 0 0 0-6.7l.9-.9ZM12 9.4a1.7 1.7 0 0 1 1 3.1l1.2 5.3c.1.5-.3.9-.8.9h-2.8c-.5 0-.9-.4-.8-.9L11 12.5a1.7 1.7 0 0 1 1-3.1Z"/>',
  youtube: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-2 5.8 7 4.2-7 4.2V7.8Z"/>',
  rss: '<path d="M5 3a1.5 1.5 0 0 0 0 3 13 13 0 0 1 13 13 1.5 1.5 0 0 0 3 0A16 16 0 0 0 5 3Zm0 6a1.5 1.5 0 0 0 0 3 7 7 0 0 1 7 7 1.5 1.5 0 0 0 3 0 10 10 0 0 0-10-10Zm1.6 7.9a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Z"/>',
  more: '<path d="M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>',
  link: '<path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.4-3.4a2.5 2.5 0 0 0-3.5-3.5L7.1 8.5a1 1 0 0 1-1.4-1.4l3.4-3.4a4.5 4.5 0 0 1 6.4 6.4l-3.5 3.3a1 1 0 0 1-1.4 0Z"/><path d="M13.4 10.6a1 1 0 0 1 0 1.4L10 15.4a2.5 2.5 0 0 0 3.5 3.5l3.4-3.4a1 1 0 0 1 1.4 1.4l-3.4 3.4a4.5 4.5 0 0 1-6.4-6.4l3.5-3.3a1 1 0 0 1 1.4 0Z"/>',
};

const icon = (id) =>
  `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS[id] || ICONS.link}</svg>`;

function platformList(links, extraClass = '') {
  return `<ul class="platforms${extraClass}">${links
    .map(
      (l) =>
        `<li><a class="platform" href="${esc(l.url)}"${
          l.url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''
        }>${icon(l.id)}<span>${esc(l.name)}</span></a></li>`
    )
    .join('')}</ul>`;
}

/* Per-episode links: deep links where the platform supports them, the show
   page everywhere else. */
function episodePlatforms(ep) {
  const out = [];
  const spotifyId = ep.spotify || (ep.parts[0] && ep.parts[0].spotify);
  const appleId = ep.apple || (ep.parts[0] && ep.parts[0].apple);
  if (spotifyId) out.push({ id: 'spotify', name: 'Spotify', url: `https://open.spotify.com/episode/${spotifyId}` });
  if (appleId)
    out.push({
      id: 'apple',
      name: 'Apple Podcasts',
      url: `https://podcasts.apple.com/ie/podcast/id${site.appleId}?i=${appleId}`,
    });
  for (const p of site.platforms) {
    if (p.id === 'spotify' && spotifyId) continue;
    if (p.id === 'apple' && appleId) continue;
    out.push(p);
  }
  return out;
}

/* ---- shared chrome --------------------------------------------------- */

function head({ title, description, rel, canonical, image, ogType = 'website' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#08061c">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="${rel}assets/favicon.ico" type="image/x-icon">
<link rel="apple-touch-icon" href="${rel}assets/favicon.png">
<meta property="og:site_name" content="Yarn | A Story Podcast">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="${rel}styles.css?v=${stamp}">
</head>
<body>`;
}

function header(rel, overHero = false) {
  return `<header class="site-header${overHero ? ' site-header--over-hero' : ' is-stuck'}">
  <div class="wrap">
    <a class="brand" href="${rel}index.html">
      <img src="${rel}assets/yarn-wordmark.png" alt="Yarn" width="1400" height="481">
      <span>A Story Podcast</span>
    </a>
    <nav class="site-nav" aria-label="Main">
      <a href="${rel}index.html#episodes">Episodes</a>
      <a href="${rel}index.html#extras">Extras</a>
      <a href="${rel}index.html#about">About</a>
    </nav>
  </div>
</header>`;
}

function footer(rel) {
  return `<footer class="site-footer" id="about">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <h2>About Yarn</h2>
        ${site.about.map((p) => `<p>${esc(p)}</p>`).join('\n        ')}
      </div>
      <div>
        <h2>Listen</h2>
        <ul class="footer-links">
          ${site.platforms
            .map((p) => `<li><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a></li>`)
            .join('\n          ')}
        </ul>
      </div>
      <div>
        <h2>Seasons</h2>
        <ul class="footer-links">
          ${seasons
            .map(
              (se) =>
                `<li><a href="${rel}${se.redirect || se.slug + '/index.html'}">${esc(se.title)}</a></li>`
            )
            .join('\n          ')}
          <li><a href="${rel}extras/index.html">Extras</a></li>
          <li><a href="${rel}documentary-club/index.html">Documentary club</a></li>
        </ul>
      </div>
      <div>
        <h2>Get in touch</h2>
        <ul class="footer-links">
          <li>Email: ${esc(site.emailDisplay)}</li>
          <li><a href="${esc(site.instagram)}" target="_blank" rel="noopener">@yarnstorypod on Instagram</a></li>
          <li><a href="${rel}extras/yarn-podcast-production/index.html">Podcast production services</a></li>
        </ul>
      </div>
    </div>
    <div class="colophon">
      <span>&copy; ${new Date().getFullYear()} John Roche &middot; Dublin, Ireland</span>
      <span>${site.awards.map(esc).join(' &middot; ')}</span>
    </div>
  </div>
</footer>
</body>
</html>`;
}

/* ---- cards ----------------------------------------------------------- */

function cardMeta(ep) {
  if (ep.tile) return '';
  const bits = [ep.n ? `Yarn ${String(ep.n).padStart(2, '0')}` : 'Extra'];
  if (ep.durationText) bits.push(esc(ep.durationText));
  else if (ep.parts && ep.parts.length) bits.push(`${ep.parts.length} parts`);
  const sep = ' <span class="dot">/</span> ';
  // The date is dropped on narrow screens, where the meta line has to fit twice over.
  const date = shortDate(ep.date) ? `<span class="meta-date">${sep}${esc(shortDate(ep.date))}</span>` : '';
  return bits.join(sep) + date;
}

function card(ep, rel, hrefBase) {
  const blurb = (ep.description && ep.description[0]) || '';
  const href = ep.href ? `${rel}${ep.href}` : `${rel}${hrefBase}/${ep.slug}/index.html`;
  /* Not everything in the extras has cover art - those get a typographic tile
     rather than a borrowed or invented image. */
  const art = ep.tile
    ? `<div class="card-art card-art--tile">
      <span class="tile-kicker">${esc(ep.tile.kicker)}</span>
      <span class="tile-label">${esc(ep.tile.label)}</span>
    </div>`
    : `<div class="card-art">
      <img src="${rel}${ep.art.replace('assets/art/', 'assets/thumb/')}" alt="Cover art for ${esc(
        ep.title
      )}" loading="lazy" width="460" height="460">
      <span class="card-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5Z"/></svg></span>
    </div>`;
  return `<li class="card" data-season="${ep.season || 'extras'}">
  <a href="${href}">
    ${art}
    <p class="card-meta">${cardMeta(ep)}</p>
    <h3 class="card-title">${esc(ep.title)}</h3>
    <p class="card-blurb">${esc(blurb)}</p>
  </a>
</li>`;
}

/* ---- landing page ---------------------------------------------------- */

function landing() {
  const seasons = [...new Set(episodes.map((e) => e.season))].sort((a, b) => b - a);
  const filters = [
    `<button class="filter" type="button" data-filter="all" aria-pressed="true">All ${episodes.length}</button>`,
    ...seasons.map((s) => `<button class="filter" type="button" data-filter="${s}" aria-pressed="false">Season ${s}</button>`),
  ].join('\n      ');

  return `${head({
    title: 'Yarn | A Story Podcast',
    description: site.intro,
    rel: '',
    canonical: site.url + '/',
    image: site.url + '/assets/cover.jpg',
  })}
${header('', true)}
<main>
  <section class="hero">
    <div class="hero-banner">
      <img src="assets/yarn-hero.jpg" alt="Yarn - A Story Podcast" width="1622" height="842" fetchpriority="high">
    </div>
    <span id="hero-end" aria-hidden="true"></span>
    <div class="wrap hero-copy">
      <p class="hero-intro">${esc(site.intro)}</p>
      ${platformList(site.platforms)}
      <ul class="hero-awards">
        ${site.awards.map((a) => `<li class="hero-award">${esc(a)}</li>`).join('\n        ')}
      </ul>
    </div>
  </section>

  <section class="section" id="episodes">
    <div class="wrap">
      <div class="section-head">
        <h2 class="section-title">Episodes</h2>
        <p class="section-note">${episodes.length} stories, six seasons, newest first.</p>
      </div>
      <div class="filters" role="group" aria-label="Filter episodes by season">
      ${filters}
      </div>
      <ul class="grid" id="episode-grid">
        ${episodes.map((e) => card(e, '', 'episodes')).join('\n        ')}
      </ul>
      <p class="grid-empty" id="grid-empty" hidden>No episodes in that season.</p>
    </div>
  </section>

  <section class="section" id="extras">
    <div class="wrap">
      <div class="section-head">
        <h2 class="section-title">Extras</h2>
        <p class="section-note">${esc(site.extrasBlurb)}</p>
      </div>
      <ul class="grid" style="margin-top:26px">
        ${extras.map((e) => card(e, '', 'extras')).join('\n        ')}
      </ul>
    </div>
  </section>
</main>
${footer('')}`.replace('</body>', `<script src="app.js?v=${stamp}" defer></script>\n</body>`);
}

/* ---- episode page ---------------------------------------------------- */

function episodePage(ep, prev, next, { rel, hrefBase }) {
  const eyebrow = [];
  if (ep.n) eyebrow.push(`Yarn ${String(ep.n).padStart(2, '0')}`);
  if (ep.season) eyebrow.push(`Season ${ep.season}`);
  if (prettyDate(ep.date)) eyebrow.push(prettyDate(ep.date));
  if (ep.durationText) eyebrow.push(ep.durationText);

  let players = '';
  if (ep.parts && ep.parts.length) {
    players = ep.parts
      .map(
        (p) => `<div class="part">
      ${
        p.banner
          ? `<img class="part-banner" src="${rel}${p.banner}" alt="${esc(ep.title)} - ${esc(p.label)}" loading="lazy">`
          : ''
      }
      <div class="part-head"><span>${esc(p.label)}</span>${
        p.durationText ? `<span class="part-meta">${esc(p.durationText)}${p.date ? ' &middot; ' + esc(prettyDate(p.date)) : ''}</span>` : ''
      }</div>
      <div class="player">${spotifyEmbed(p.spotify, ep.title + ' - ' + p.label)}</div>
    </div>`
      )
      .join('\n    ');
  } else if (ep.spotify) {
    players = `<div class="player">${spotifyEmbed(ep.spotify, ep.title)}</div>`;
  } else if (ep.youtube) {
    players = `<div class="player player--video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(
      ep.youtube
    )}" title="${esc(ep.title)} on YouTube" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  } else if (ep.note) {
    players = `<p class="player-note">${esc(ep.note)}</p>`;
  }

  const links = (ep.links || []).length
    ? `<ul class="episode-links">${ep.links
        .map(
          (l) =>
            `<li><a class="text-link" href="${esc(l.url)}"${
              l.url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''
            }>${icon('link')}${esc(l.label)}</a></li>`
        )
        .join('')}</ul>`
    : '';

  const credits = (ep.credits || []).length
    ? `<ul class="episode-credits">${ep.credits.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`
    : '';

  const pager =
    prev || next
      ? `<nav class="pager" aria-label="Episodes">
    ${
      prev
        ? `<a href="${rel}${hrefBase}/${prev.slug}/index.html"><span class="pager-label">&larr; Previous</span><span class="pager-title">${esc(prev.title)}</span></a>`
        : '<span></span>'
    }
    ${
      next
        ? `<a class="next" href="${rel}${hrefBase}/${next.slug}/index.html"><span class="pager-label">Next &rarr;</span><span class="pager-title">${esc(next.title)}</span></a>`
        : '<span></span>'
    }
  </nav>`
      : '';

  const description = (ep.description && ep.description[0]) || site.intro;
  const isSeries = Boolean(ep.parts && ep.parts.length);
  const pressList = ep.press
    ? `<ul class="press-list">${press
        .map(
          (item) =>
            `<li><a href="${esc(item.url)}" target="_blank" rel="noopener"><span class="press-outlet">${esc(
              item.outlet
            )}</span><span class="press-headline">${esc(item.headline)}</span></a></li>`
        )
        .join('')}</ul>`
    : '';
  const body = `<div class="episode-body">
        ${(ep.description || []).map((p) => `<p>${esc(p)}</p>`).join('\n        ')}
      </div>`;

  return `${head({
    title: `${ep.title} | Yarn`,
    description,
    rel,
    canonical: `${site.url}/${hrefBase}/${ep.slug}/`,
    image: `${site.url}/${ep.art || 'assets/cover.jpg'}`,
    ogType: 'article',
  })}
${header(rel)}
<main class="wrap">
  <a class="back-link" href="${rel}index.html">&larr; Episodes</a>
  <article class="episode${ep.art ? '' : ' episode--no-art'}">
    ${
      ep.art
        ? `<div class="episode-art">
      <img src="${rel}${ep.art}" alt="Cover art for ${esc(ep.title)}" width="900" height="900" fetchpriority="high">
    </div>`
        : ''
    }
    <div>
      <p class="episode-eyebrow">${eyebrow.map(esc).join(' <span class="dot">/</span> ')}</p>
      <h1 class="episode-title">${esc(ep.title)}</h1>
      ${isSeries ? body : players}
      ${isSeries ? players : body}
      ${credits}
      ${pressList}
      ${links}
      ${
        ep.press
          ? ''
          : `<div class="listen-block">
        <h2>Also listen on</h2>
        ${platformList(episodePlatforms(ep), ' platforms--left')}
      </div>`
      }
    </div>
  </article>
  ${pager}
</main>
${footer(rel)}`;
}

/* ---- season / extras index pages -------------------------------------- */

function listingPage({ title, heading, blurb, items, hrefBase, slug, crumbs }) {
  const rel = '../';
  return `${head({
    title: `${title} | Yarn`,
    description: blurb,
    rel,
    canonical: `${site.url}/${slug}/`,
    image: `${site.url}/assets/cover.jpg`,
  })}
${header(rel)}
<main class="wrap">
  <a class="back-link" href="${rel}index.html">&larr; Episodes</a>
  <section class="section">
    <div class="section-head">
      <h1 class="section-title">${esc(heading)}</h1>
      <p class="section-note">${esc(crumbs)}</p>
    </div>
    <p class="listing-blurb">${esc(blurb)}</p>
    <ul class="grid">
      ${items.map((e) => card(e, rel, hrefBase)).join('\n      ')}
    </ul>
  </section>
</main>
${footer(rel)}`;
}

/* ---- documentary club ------------------------------------------------- */

function docClubPage() {
  const rel = '../';
  const stars = (n) => (n ? `<span class="stars" title="${n} of 3">${'\u2605'.repeat(n)}</span>` : '');
  const linkify = (p) =>
    esc(p).replace(
      '#yarndocclub',
      '<a class="text-link" href="https://www.instagram.com/explore/search/keyword/?q=%23yarndocclub" target="_blank" rel="noopener">#yarndocclub</a>'
    );
  const count = docClub.sections.reduce((n, sec) => n + sec.films.length, 0);

  return `${head({
    title: `${docClub.title} | Yarn`,
    description: `${count} favourite documentaries made since 1985, grouped by theme by John Roche of Yarn.`,
    rel,
    canonical: `${site.url}/documentary-club/`,
    image: `${site.url}/assets/cover.jpg`,
  })}
${header(rel)}
<main class="wrap">
  <a class="back-link" href="${rel}index.html">&larr; Episodes</a>
  <section class="section doc-club">
    <h1 class="doc-title">${esc(docClub.title)}</h1>
    <p class="doc-subtitle">${esc(docClub.subtitle)}</p>
    <div class="doc-intro">
      ${docClub.intro.map((p) => `<p>${linkify(p).replace(/\n/g, '<br>')}</p>`).join('\n      ')}
    </div>
    <p class="doc-count">${count} documentaries in ${docClub.sections.length} themes. Ratings are one to three stars, and everything listed is worth a watch.</p>
    ${docClub.sections
      .map(
        (sec) => `<section class="doc-section">
      <h2>${esc(sec.title)}</h2>
      ${sec.blurb.map((b) => `<p>${esc(b)}</p>`).join('\n      ')}
      <ul class="doc-films">
        ${sec.films
          .map(
            (f) =>
              `<li><span class="film-title">${esc(f.title)}</span>${
                f.year ? `<span class="film-year">${esc(f.year)}</span>` : ''
              }${stars(f.stars)}</li>`
          )
          .join('\n        ')}
      </ul>
    </section>`
      )
      .join('\n    ')}
  </section>
</main>
${footer(rel)}`;
}

/* ---- write it all out ------------------------------------------------ */

if (existsSync(DIST)) await rm(DIST, { recursive: true });
await mkdir(DIST, { recursive: true });
await cp(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });
await cp(path.join(ROOT, 'assets/favicon.ico'), path.join(DIST, 'favicon.ico'));
await cp(path.join(ROOT, 'src/styles.css'), path.join(DIST, 'styles.css'));
await cp(path.join(ROOT, 'src/app.js'), path.join(DIST, 'app.js'));

await writeFile(path.join(DIST, 'index.html'), landing());

for (let i = 0; i < episodes.length; i++) {
  const ep = episodes[i];
  const dir = path.join(DIST, 'episodes', ep.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'index.html'),
    episodePage(ep, episodes[i + 1], episodes[i - 1], { rel: '../../', hrefBase: 'episodes' })
  );
}

for (const ex of extras) {
  if (ex.href) continue;
  const dir = path.join(DIST, 'extras', ex.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'index.html'),
    episodePage({ ...ex, parts: ex.parts || [] }, null, null, { rel: '../../', hrefBase: 'extras' })
  );
}

for (const se of seasons) {
  if (se.redirect) continue;
  const items = episodes.filter((e) => e.season === se.n);
  const dir = path.join(DIST, se.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'index.html'),
    listingPage({
      title: se.title,
      heading: se.title,
      blurb: se.blurb,
      items,
      hrefBase: 'episodes',
      slug: se.slug,
      crumbs: `${items.length} ${items.length === 1 ? 'story' : 'stories'}`,
    })
  );
}

await writeFile(
  path.join(DIST, 'extras', 'index.html'),
  listingPage({
    title: 'Extras',
    heading: 'Extras',
    blurb: site.extrasBlurb,
    items: extras,
    hrefBase: 'extras',
    slug: 'extras',
    crumbs: `${extras.length} things`,
  })
);

await mkdir(path.join(DIST, 'documentary-club'), { recursive: true });
await writeFile(path.join(DIST, 'documentary-club', 'index.html'), docClubPage());

const urls = [
  `${site.url}/`,
  ...seasons.filter((se) => !se.redirect).map((se) => `${site.url}/${se.slug}/`),
  `${site.url}/extras/`,
  ...episodes.map((e) => `${site.url}/episodes/${e.slug}/`),
  ...extras.filter((e) => !e.href).map((e) => `${site.url}/extras/${e.slug}/`),
  `${site.url}/documentary-club/`,
];
await writeFile(
  path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`
);
await writeFile(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);

console.log(
  `built ${episodes.length} episodes + ${extras.length} extras + ${seasons.length} season pages -> dist/`
);
