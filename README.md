# Ajay Kumar — Portfolio

A cinematic, film-noir scrolling portfolio for Ajay Kumar, AI/ML engineer. It is a plain static site: no build step, no framework.

## Structure

```
index.html        page markup, all CSS, and the main inline script (intro, scroll choreography, counters, HUD)
js/
  relic.js        the WebGL eye (Three.js): scroll path, docking on the Path clock, shatter, post-processing
  path.js         the "Path" section: film strip, fixed-size screen, light beam, keyboard support
  thumbs.js       procedural canvas artwork for the work scenes and Path frames
  player.js       the music disc: play/pause, mute, volume, seekable first minute of the theme
  shatter.js      the metallic shatter effect on the name (hover on desktop, tap on phones)
assets/           hero and contact portraits (baked WebP), theme.mp3 (60 s)
vercel.json       Vercel headers and caching
```

Third-party libraries load from a CDN (GSAP + ScrollTrigger, Lenis, Three.js r160). If a CDN is blocked, the page falls back to a plain scrollable layout.

## Run locally

Any static server works. From this folder:

```bash
python -m http.server 4173
```

then open http://localhost:4173.

## Deploy (Vercel)

Import the repository in Vercel. Framework preset: **Other**. Leave build command and output directory empty (the repository root is the site). `vercel.json` sets caching and security headers.

Script files are cached for a year, so when you change one, bump the `?v=` number on its `<script>` tag in `index.html`.

## Notes

- `hero_cut3.webp` has the colour grade and drop-shadows baked in (with 200 px of padding for the shadow). Do not add CSS `filter` to it: a live blurred shadow on a photo this size made the hero scroll-out stutter on integrated GPUs.
