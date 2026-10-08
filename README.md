# Jinay Shah: portfolio site

A static, single-page portfolio: "Problem in. Software out." Ideas and problems turned into working
software, end to end, with AI in the loop. Eight case studies (backend, AI and one full-stack SaaS)
serve as proof of work.

Plain HTML, CSS and JavaScript. No build step, no CDN at runtime, no trackers.

## What's inside

```
Portfolio/
├── index.html                 All page content: hero, capabilities, work rail, stack, experience,
│                              process, about, FAQ, contact, footer, and the full case studies
├── favicon.svg                The "J." mark
├── robots.txt                 Allows all crawlers
├── README.md                  This file
└── assets/
    ├── css/styles.css         Design tokens (dark + light), type scale, layout, components, motion
    ├── js/core.js             Theme, header, mobile menu, active nav, reveal, counters, scroll
    │                          progress, copy email + toast, email-draft form, dialog focus trap
    ├── js/cases.js            Case-study dialog (#case/<slug> deep links) and the animated SVG
    │                          architecture diagrams drawn from each "How it works" list
    ├── js/palette.js          Ctrl/Cmd + K command palette
    ├── js/fx.js               Motion layer: smooth scroll, intro, split text, scramble labels,
    │                          "Bring me" rotator, build card, magnetic buttons, spotlight/tilt,
    │                          cursor ring, pinned horizontal work rail
    ├── js/field.js            WebGL "liquid light" background (hand-written shader)
    ├── vendor/lenis.min.js    Lenis 1.3.26 smooth scroll (MIT), LICENSE-lenis.txt next to it
    ├── fonts/                 Self-hosted WOFF2 (Latin subsets) + OFL licence texts
    └── img/og-image.png       1200x630 social preview (ready, not referenced yet; see below)
```

How it behaves:

- **Themes:** dark by default, with an equally designed light theme. On a first visit it follows
  `prefers-color-scheme`; once the visitor uses the toggle (or the palette), the choice is saved in
  `localStorage`. If storage is blocked the toggle still works for that visit.
- **Progressive enhancement:** with JavaScript off, everything is readable: the hero, all sections,
  and the full case studies (shown as a "Case studies in full" section that the cards link to).
  Animations only hide content after the script confirms it can reveal it again.
- **Reduced motion:** with `prefers-reduced-motion: reduce` there is no intro, smooth scrolling,
  cursor ring, pinned rail, marquee, text effects or diagram animation, and the background is one
  static frame. Everything stays usable.
- **Background:** WebGL is initialised after load, renders at low internal resolution with a capped
  pixel ratio, drops to 30 fps on touch or low-power devices and below the hero, and pauses when
  the tab is hidden. Without WebGL a CSS gradient takes its place.
- **Case studies:** cards open an accessible `<dialog>` (focus moves in and stays in, Esc or a
  backdrop click closes, focus returns to the card). Links look like `index.html#case/spc-analytics-engine`.
- **Command palette:** Ctrl+K (Cmd+K on Mac) or the search button: jump to sections, open any case
  study, copy the email, write an email, toggle the theme, open LinkedIn or GitHub.
- **Contact:** `mailto:` links with a prefilled subject, copy-email buttons with a toast, and a form
  that only builds an email draft in the visitor's own mail app. Nothing leaves the browser.

## Preview locally

```bash
cd Portfolio
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` straight from disk mostly works, but use a local server: fonts and the
clipboard API behave more reliably over `http://localhost`.

## Deploy

The folder is the site. Upload it as it is.

- **GitHub Pages:** push the folder's contents to a repository (for example `jinshah0322.github.io`),
  then Settings → Pages → *Deploy from a branch* → `main` / root.
- **Netlify:** app.netlify.com → *Add new site* → *Deploy manually*, drag the `Portfolio` folder in.
- **Vercel:** run `npx vercel` inside the folder (framework "Other", no build command, output `.`),
  or import the Git repo in the dashboard.

## Editing content

All copy is in **`index.html`**; search for the section comments `<!-- HERO -->`, `<!-- BUILD / CAPABILITIES -->`,
`<!-- WORK -->`, `<!-- STACK -->`, `<!-- EXPERIENCE -->`, `<!-- PROCESS -->`, `<!-- ABOUT -->`,
`<!-- FAQ -->`, `<!-- CONTACT -->`, `<!-- CASE FILES -->`.

- **Hero "Bring me" phrases:** the JSON array in the `data-rotate` attribute.
- **Capability tiles:** `<ul class="bento">`. The label (`Core`, `Built before`, `AI-assisted`,
  `Open`) and the "Backed by" line should stay honest: only list evidence you can talk about.
- **Case studies** have two parts that share a slug:
  1. the card in `<ul class="rail-track">` (`href="#case-<slug>"` and `data-case-link="<slug>"`), and
  2. the article in `<section class="case-store">` (`id="case-<slug>"`, `data-slug="<slug>"`).
  The diagram is redrawn from the article's `<ol class="flow-steps">`. Steps mentioning failure,
  retry or fallback become a *recovery path*; steps mentioning a reviewer, approval or confirmation
  become *human in the loop*; the last step is the *result*. Prev/next, the counter and the command
  palette update automatically. If you add a card, also update the hero "case studies" count, the
  "Eight real systems" heading in `#work`, the number in the closing "Your project" card and the
  rail total in `.rail-hud` (it counts every rail item, so it is currently `/ 09`: eight case
  studies plus that card), and keep the "Your project" card last.
- **Colours and type:** CSS custom properties at the top of `assets/css/styles.css`. `:root` holds
  the dark palette; `:root[data-theme="light"]` and the `prefers-color-scheme: light` block hold the
  light palette (keep those two in sync). The WebGL colours are in `PALETTES` in `assets/js/field.js`.

## Licences of bundled assets

| Asset | Licence | File |
| --- | --- | --- |
| Unbounded (variable, Latin subset), display | SIL OFL 1.1 | `assets/fonts/OFL-unbounded.txt` |
| Bricolage Grotesque (variable weight, Latin subset), body | SIL OFL 1.1 | `assets/fonts/OFL-bricolage-grotesque.txt` |
| JetBrains Mono (variable weight, Latin subset), labels | SIL OFL 1.1 | `assets/fonts/OFL-jetbrains-mono.txt` |
| Lenis 1.3.26 smooth scroll | MIT | `assets/vendor/LICENSE-lenis.txt` |

Fonts came from the Fontsource npm packages (`@fontsource-variable/*` 5.3.0). Everything else is
original code for this site.

## Optional extras

- [ ] **GitHub profile:** pin a few public repos or add a profile README so the GitHub link has
      something to show.
- [ ] **Contact form service:** the site has no backend, so the form only opens an email draft. To
      receive submissions directly, connect Formspree, Netlify Forms or Basin and update the note
      above the form.
- [ ] **Domain tags, once there is a domain:** add `<link rel="canonical">`, `og:url`, `og:image`
      and `twitter:image` to `<head>`, pointing at `assets/img/og-image.png` (already generated).
