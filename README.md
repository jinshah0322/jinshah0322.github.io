# Jinay Shah: portfolio site

A static, single-page portfolio for freelance full-stack work: five projects shown end to end
(screens, server, data and AI), each with a short story, a system map, the hard problems and
sample screens.

Plain HTML, CSS and JavaScript. No build step, no CDN at runtime, no trackers.

## What's inside

```
├── index.html     All page content and the project tabs
├── robots.txt     Allows all crawlers
├── css/           Styles: light and dark themes, layout, components, motion
├── js/            Theme toggle, menu, tabs, reveal-on-scroll, copy email
├── fonts/         Self-hosted WOFF2 (Latin subset) with the OFL licence text
└── img/           Favicons and the 1200x630 social preview image
```

How it behaves:

- **Themes:** light by default, with a dark theme. On a first visit it follows the device setting;
  the toggle saves the choice in `localStorage` (if storage is blocked it still works for that visit).
- **Accessibility:** keyboard-operable menu, FAQ and tabs; visible focus; reduced-motion respected.
- **Responsive:** from 280px wide up to 2560px.

## Run it locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

## Deploy

Hosted on GitHub Pages from the `main` branch root (`.nojekyll` is present).
