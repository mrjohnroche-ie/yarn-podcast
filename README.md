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

## Notes

- Content was lifted from the live Squarespace site, the podcast RSS feed and
  the iTunes lookup API in September 2026.
- Yarn 06, Anthem, is not on Spotify or in the RSS feed any more, so its page
  carries a short note where the player would be.
