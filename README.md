<div align="center">

<img src="docs/banner.svg" alt="Ajay Kumar, AI/ML engineer. A cinematic, scroll-driven portfolio." width="100%">

<br>

![HTML5](https://img.shields.io/badge/HTML5-070605?style=flat-square&logo=html5&logoColor=f5b41f)
![CSS3](https://img.shields.io/badge/CSS3-070605?style=flat-square&logo=css3&logoColor=f5b41f)
![JavaScript](https://img.shields.io/badge/JavaScript-070605?style=flat-square&logo=javascript&logoColor=f5b41f)
![GSAP](https://img.shields.io/badge/GSAP_3-070605?style=flat-square&logo=greensock&logoColor=f5b41f)
![Three.js](https://img.shields.io/badge/Three.js_r160-070605?style=flat-square&logo=threedotjs&logoColor=f5b41f)
![WebGL](https://img.shields.io/badge/WebGL-070605?style=flat-square&logo=webgl&logoColor=f5b41f)
![Vercel](https://img.shields.io/badge/Deployed_on_Vercel-070605?style=flat-square&logo=vercel&logoColor=f5b41f)
![No build step](https://img.shields.io/badge/build_step-none-070605?style=flat-square&labelColor=070605&color=f5b41f)

**A film-noir portfolio you scroll like a short film.**
A living WebGL eye, a timeline that fires a beam of light, and a name that shatters into metal.

[![Live site](https://img.shields.io/badge/%E2%96%B6%20Live%20site-open%20the%20portfolio-f5b41f?style=for-the-badge&labelColor=070605)](https://ajaykumar-ml.vercel.app/)

</div>

<br>

<p align="center">
  <img src="docs/screens/hero.jpg" alt="Hero: the name, the portrait, and the WebGL eye in the top-right corner" width="100%">
</p>

## The tour

| Scene | What happens |
| :-- | :-- |
| **Story** | A title card. Hover the name (tap it on a phone) and the letters break into a frozen, metallic shatter, then pull back together. |
| **Manifesto** | The statement resolves word by word as you scroll. |
| **Work** | A pinned horizontal gallery. Each project opens through an inset frame, with a live canvas artwork behind it. |
| **Path** | Education, internships, talks and research on a film strip. The eye flies down, docks on the clock and fires a soft beam at the chapter you pick. One fixed-size screen shows the details, so nothing grows, scrolls or flips. |
| **Craft** | Skills slide past in horizontal reels that light up near your cursor. |
| **Proof** | A bone-paper panel of numbers that count up. The eye switches to ink so it stays readable on the pale background. |
| **Contact** | A closing portrait and a headline that rises line by line. |

Between the scenes, eased multi-stop gradients carry the page from black through amber and gold to cream and back, so there are no hard edges.

<p align="center">
  <img src="docs/screens/work.jpg" alt="Work: a pinned horizontal gallery of projects" width="49%">
  <img src="docs/screens/path.jpg" alt="Path: film strip timeline with the eye docked on the clock, firing a beam" width="49%">
</p>
<p align="center">
  <img src="docs/screens/numbers.jpg" alt="Proof in numbers on a paper-coloured panel" width="49%">
  <img src="docs/screens/contact.jpg" alt="Contact: the closing headline and portrait" width="49%">
</p>

## Details worth poking at

- **The eye.** A Three.js sphere of synapses that follows the cursor, blinks, spins with scroll, and shatters when you click it. It travels down the page's margins and docks on the Path clock.
- **The beam.** Rendered per pixel on a small canvas (a Gaussian cone plus an inverse-square pool of light), so it stays soft instead of banding.
- **The name shatter.** Dependency-free WebGL: every glyph becomes shards with procedural metal shading. Hover on desktop, tap on touch screens.
- **The music disc.** A spinning record in the corner plays the first minute of a theme. Click to play or pause; open the deck for mute, volume and a timeline you can drag anywhere. It loops with a fade at the seam and remembers your choice.
- **Film-camera HUD.** A REC light, a running timecode and a scene counter follow you down the page.

## Built to stay smooth

Most of the engineering is invisible. It is there so the page holds its frame rate on an integrated GPU:

- **Adaptive quality.** A frame-rate watchdog trims the eye's resolution and drops the decorative full-screen layers only if the machine genuinely can't keep up, and only after start-up work has settled.
- **Baked, not blurred.** The hero portrait's colour grade and drop-shadows are baked into the image, so the GPU is not re-blurring a photo-sized shadow on every scroll frame.
- **Lazy by default.** The music file, the shatter shaders and the shatter-glow image are prepared when the browser is idle after the intro, or the moment they are first needed.
- **Work only when seen.** Canvas artworks run at slow, adaptive rates and only while on screen. Layout is read only when the eye is near the sections that need it.
- **Graceful fallbacks.** Reduced-motion is respected, a blocked CDN falls back to a plain scrollable layout, and the layout switches to a dedicated mobile design below 900 px.
- **Keyboard and screen readers.** The Path timeline is a proper tablist (←/→/Home/End), controls have labels, and focus states are visible.

## Project structure

```
.
├── index.html        markup, all CSS, and the main script (intro, scroll choreography, counters, HUD)
├── js/
│   ├── relic.js      the WebGL eye: scroll path, docking, shatter, post-processing
│   ├── path.js       the Path section: film strip, fixed screen, light beam, keyboard support
│   ├── thumbs.js     procedural canvas artwork for the work scenes and Path frames
│   ├── player.js     the music disc: play/pause, mute, volume, seekable minute
│   └── shatter.js    the metallic name shatter (WebGL, hover and tap)
├── assets/           baked portraits (WebP) and the theme clip
├── docs/             README banner and screenshots
└── vercel.json       caching and security headers
```

Libraries load from a CDN: [GSAP](https://gsap.com) + ScrollTrigger, [Lenis](https://lenis.darkroom.engineering) and [Three.js](https://threejs.org). There is no `package.json`, bundler or build step.

## Run it locally

Any static file server works. From the project folder:

```bash
python -m http.server 4173
```

Then open <http://localhost:4173>. Use a desktop-width window: the layout intentionally changes below 900 px.

## Deploy

The repository root is the site, so it deploys as-is on any static host. On **Vercel**: import the repo, set *Framework Preset* to **Other**, and leave the build command and output directory empty. `vercel.json` adds caching and security headers.

Files in `js/` are cached for a year. When you change one, bump the `?v=` number on its `<script>` tag in `index.html`.

## Contact

**Ajay Kumar** · AI/ML engineer, NLP &amp; LLM research · Chennai / Taiwan

[Email](mailto:akofficiala10@gmail.com) · [LinkedIn](https://www.linkedin.com/in/ajay-kumar-124215372/) · [GitHub](https://github.com/AjayKumar-repo)

<sub>© 2026 Ajay Kumar. The portraits and written content are not licensed for reuse.</sub>
