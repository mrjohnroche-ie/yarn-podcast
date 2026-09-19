# Yarn | A Story Podcast - website

A redesign of yarnpodcast.com: a landing page with the logo, description and
platform links, a scrollable grid of every episode, and a page per episode with
the square artwork, the description and the Spotify player.

The published site is `dist/` - plain HTML, CSS and one small JS file. No
framework, no bundler, no dependencies.

## Build

```bash
node build.mjs
```

That reads `data/`, copies `assets/` and `src/`, and rewrites `dist/`.

## Preview

```bash
node serve.mjs 4180
```

Then open http://localhost:4180. (Opening `dist/index.html` straight from the
Finder works too - every path in the site is relative.)

## Where things live

| Path | What it is |
| --- | --- |
| `data/site.json` | Podcast blurb, award line, contact details, platform links |
| `data/episodes.json` | Every episode: title, description, artwork, Spotify id, Apple id, date, duration |
| `assets/art/` | 900px square episode artwork (used on episode pages) |
| `assets/thumb/` | 460px square artwork (used in the grid) |
| `assets/banner/` | Wide part banners for the two multi-part stories |
| `assets/yarn-wordmark.png` | The Yarn wordmark, cut out of the cover art with a transparent background |
| `src/styles.css`, `src/app.js` | The stylesheet and the season filter |
| `build.mjs` | The generator |
| `dist/` | Generated. Don't edit by hand - it gets wiped on every build |

## Adding an episode

Add an object to the top of the `episodes` array in `data/episodes.json`, drop a
900px square JPG in `assets/art/` and a 460px one in `assets/thumb/` under the
same filename, then run `node build.mjs`.

```json
{
 "n": 30,
 "slug": "the-new-one",
 "title": "The New One",
 "season": 7,
 "description": ["First paragraph, also used as the card blurb and the share description.", "Second paragraph."],
 "credits": ["Written and narrated by John Roche"],
 "art": "assets/art/30-the-new-one.jpg",
 "links": [{ "label": "Full transcript", "url": "https://..." }],
 "spotify": "SPOTIFY_EPISODE_ID",
 "apple": 1000730664124,
 "parts": [],
 "date": "2026-01-20",
 "durationText": "42 min"
}
```

`spotify` is the id in an episode's Spotify URL (`open.spotify.com/episode/<id>`).
`apple` is the `i=` number in its Apple Podcasts URL - leave it out and the page
falls back to the show-level Apple link. A multi-part story leaves `spotify`
null and lists its parts instead, each with its own `label`, `spotify`,
`banner`, `date` and `durationText` (see Yarn 19 and Yarn 20).

## Keeping the old URLs working

The Squarespace site is being replaced in place, so every URL that resolves
today still resolves here. Three mechanisms:

1. **Same path, real page.** `/season-1`, `/season-2`, `/season-5`,
   `/season-06`, `/extras` and `/documentary-club` are pages on this site at
   exactly those paths, spelling and all. Seasons 3 and 4 are the exceptions:
   each is a single story, so `/season-3` and
   `/disability-a-parallel-history` redirect to the episode itself rather
   than to a listing page holding one card. Give any season a `redirect` in
   `data/site.json` to do the same.
2. **Redirects** (`vercel.json`). The old site was one long index page whose
   sections each had their own URL - `/hotel`, `/chernobyl`, `/lefty-1`,
   `/new-page-3` and so on. Each 308s to the episode it showed. `/home`,
   `/yarn`, `/new-index-1` and `/new-page-5` go to the landing page, and
   `/season-4` and `/season-6` are added as the spellings people guess.
3. **Old anchors** (`src/app.js`). Links shared as `yarnpodcast.com/#hotel`
   never reach the server, so the landing page reads the fragment and sends
   those visitors to the right episode.

Adding an episode does not need anything here. Only removing or renaming an
existing page does: if you change a slug, add a redirect from the old one.

The Squarespace sitemap did not list everything the site ever had. The
Wayback Machine's index does, and it turned up five more live URLs from
earlier versions - /about, /bricklane, /the-boxer-and-the-bomber,
/yarn-04-the-siren and /lefty-transcript - which are redirected too:

```bash
curl -s "http://web.archive.org/cdx/search/cdx?url=yarnpodcast.com*&fl=original,statuscode&collapse=urlkey&limit=400"
```

To check the lot after a change, run every legacy path against the site:

```bash
for p in / /home /documentary-club /season-1 /season-2 /season-3 /disability-a-parallel-history /season-5 /season-06 /extras /yarn /about-yarn /hotel /judys-callers /escape-from-madrid /highest-cyclist /stalker /jury /lone-actors /secret-palace /new-page-3 /how-not-to-be-a-spy-episode-1 /stammer /chernobyl /eyes-dont-lie /blak-bisnis /billy /bomber-boxer /lefty-1 /new-page /new-page-1 /new-index-1 /new-page-5 /season-4 /season-6; do printf "%-32s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code} %{url_effective}' -L "https://yarn-podcast.vercel.app$p")"; done
```

## Deploying

Live at https://yarn-podcast.vercel.app (Vercel project `yarn-podcast`).

```bash
vercel deploy --cwd yarn --prod
```

Vercel runs `node build.mjs` itself and serves `dist/`, so a deploy always
ships a fresh build.

## Analytics

Vercel Web Analytics. Two halves: `analytics.vercel` in `data/site.json`
puts `/_vercel/insights/script.js` in the head of every page, and Web
Analytics has to be enabled for the project in the Vercel dashboard. Both
are needed - the script only records anything on a deployment where the
feature is on, and 404s harmlessly on localhost.

It is cookieless and needs no consent banner, which is why it is here
rather than Google Analytics.

**Leaving your own visits out.** Load any page with `?no-analytics` once in
a browser - `https://www.yarnpodcast.com/?no-analytics` - and that browser
stops being counted. It works by setting a flag in localStorage that a
`beforeSend` handler checks: the analytics script drops any event whose
beforeSend returns null, so nothing is sent at all. `?analytics` undoes it.
It is per browser and per device, so do it on the phone as well as the
laptop, and again if you clear site data.

`analytics.googleId` is the other option, unused: put a GA4 measurement id
(`G-XXXXXXXXXX`) in it and the gtag snippet joins the head of every page.
GA4 does set cookies, so EU visitors would need a consent banner first, and
the site has none.

## Notes

- Content was lifted from the live Squarespace site, the podcast RSS feed and
  the iTunes lookup API in September 2026.
- Yarn 06, Anthem, is not on Spotify or in the RSS feed any more, so its page
  carries a short note where the player would be.
- The hero artwork, the wordmark and the favicon are the old site's own files.
- `data/doc-club.json` holds the documentary club list, 448 titles in 61
  themes, lifted from the Squarespace page. Each title links to IMDb:
  `data/imdb.json` maps "title|year" to the id IMDb's own search box returns,
  and anything that did not match confidently falls back to an IMDb search
  rather than guessing. To correct one, put the right `tt` id and a `score`
  of 6 or more against that key, or delete the entry to force the search.
