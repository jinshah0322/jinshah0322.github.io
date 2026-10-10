# Jinay Shah: portfolio site

A static, single-page portfolio for freelance full-stack work. Five projects are shown end to end,
each with three tabs: the story, a system map and the hard problems that were solved. The page also
covers the services offered (including deployment on-premises, in the cloud or hybrid, and support
after launch), how a project runs, FAQs and contact details.

Plain HTML, CSS and JavaScript. No build step, no CDN at runtime, no trackers.

## What's inside

```
├── index.html     All page content, including the project tabs
├── robots.txt     Allows all crawlers
├── css/           Styles: light and dark themes, layout, components, motion
├── js/            Theme toggle, menu, project tabs, reveal-on-scroll, copy email and phone
├── fonts/         Self-hosted WOFF2 (Latin subset) with the OFL licence text
└── img/           Favicons and the 1200x630 social preview image
```

How it behaves:

- **Themes:** light by default, with a dark theme. On a first visit it follows the device setting;
  the toggle saves the choice in `localStorage` (if storage is blocked it still works for that visit).
- **Project tabs:** Story, System map and Hard problems for every project, operable with the arrow
  keys; the system maps are drawn with HTML, CSS and SVG, and animate in when opened.
- **Accessibility:** keyboard-operable menu, FAQ and tabs; visible focus; reduced motion respected.
- **Responsive:** from 280px wide up to 2560px.
- **Contact:** email, phone, LinkedIn and GitHub, with copy buttons for email and phone.
- **Social preview:** `img/og-image.png` (1200x630) is used by the `og:image` and `twitter:image`
  tags, which use absolute `https://jinshah0322.github.io/` URLs.

## Run it locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

## Deploy

Hosted on GitHub Pages from the `main` branch root (`.nojekyll` is present). Pushing to `main`
updates the live site within a minute or two.
