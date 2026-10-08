/* Core behaviour (works without the motion layer):
   theme, header, mobile menu, active nav, scroll reveal, counters, scroll progress,
   copy email + toast, the email-draft helper form, footer year.
   Exposes a tiny API on window.Site for the other scripts. */
(function () {
  'use strict';

  var EMAIL = 'workwithjinayshah@gmail.com';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var Site = window.Site = window.Site || {};
  Site.EMAIL = EMAIL;
  Site.reduce = reduce;

  /* ---------- storage (may be blocked) ---------- */
  function getStore(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setStore(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  /* ---------- toast ---------- */
  var toastEl = document.querySelector('.toast');
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 2800);
  }
  Site.toast = toast;

  /* ---------- theme ---------- */
  var mqLight = window.matchMedia('(prefers-color-scheme: light)');
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return mqLight.matches ? 'light' : 'dark';
  }
  function syncThemeUi() {
    var t = currentTheme();
    var next = t === 'dark' ? 'light' : 'dark';
    document.querySelectorAll('.theme-toggle').forEach(function (b) {
      b.setAttribute('aria-label', 'Switch to ' + next + ' theme');
      b.setAttribute('title', 'Switch to ' + next + ' theme');
    });
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      m.setAttribute('content', t === 'dark' ? '#07070d' : '#f1eff8');
    });
    document.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  }
  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    setStore('theme', next);
    syncThemeUi();
    toast(next === 'dark' ? 'Dark theme on' : 'Light theme on');
  }
  Site.theme = currentTheme;
  Site.toggleTheme = toggleTheme;
  document.querySelectorAll('.theme-toggle').forEach(function (b) { b.addEventListener('click', toggleTheme); });
  if (mqLight.addEventListener) mqLight.addEventListener('change', function () { if (!getStore('theme')) syncThemeUi(); });
  syncThemeUi();

  /* ---------- keyboard hint (Cmd on Apple, Ctrl elsewhere) ---------- */
  var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
  if (isMac) document.querySelectorAll('[data-kbd-mod]').forEach(function (k) { k.textContent = '⌘'; });

  /* ---------- scroll-linked: header state, progress bar, scrim, timeline ---------- */
  var header = document.querySelector('.site-header');
  var timeline = document.querySelector('[data-timeline]');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || 0;
      var vh = window.innerHeight || 1;
      var max = Math.max(1, document.documentElement.scrollHeight - vh);
      header.classList.toggle('is-scrolled', y > 8);
      root.style.setProperty('--progress', (y / max).toFixed(4));
      // scrim: light over the hero, denser once reading starts (keeps text contrast high)
      var s = Math.min(1, y / (vh * 0.8));
      root.style.setProperty('--scrim', (0.18 + s * 0.5).toFixed(3));
      if (timeline && !reduce.matches) {
        var r = timeline.getBoundingClientRect();
        var p = (vh * 0.65 - r.top) / Math.max(1, r.height);
        timeline.style.setProperty('--tl', Math.max(0, Math.min(1, p)).toFixed(3));
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  var menuBtn = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  function setMenu(open, returnFocus) {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-open', open);
    if (open) { var first = nav.querySelector('a'); if (first) first.focus(); }
    else if (returnFocus) menuBtn.focus();
  }
  Site.closeMenu = function () { if (menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false); };
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, true);
  });
  document.addEventListener('click', function (e) {
    if (menuBtn.getAttribute('aria-expanded') === 'true' && !nav.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
  });
  var mqWide = window.matchMedia('(min-width: 1101px)');
  if (mqWide.addEventListener) mqWide.addEventListener('change', function (m) { if (m.matches) setMenu(false); });

  /* ---------- active section highlight ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-list a[href^="#"]'));
  var sections = navLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    var visible = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
      var best = null, bestRatio = 0;
      sections.forEach(function (s) { var r = visible[s.id] || 0; if (r > bestRatio) { bestRatio = r; best = s.id; } });
      navLinks.forEach(function (a) {
        var on = best && a.getAttribute('href') === '#' + best;
        a.classList.toggle('is-active', !!on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: [0, .01, .25, .5, 1] });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- scroll reveal + counters ---------- */
  var reveals = document.querySelectorAll('.reveal');
  var counters = document.querySelectorAll('[data-count]');
  function runCounter(el) {
    var end = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduce.matches || end < 2) { el.textContent = String(end); return; }
    var t0 = null, dur = 1400;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(end * e));
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }
  if (!('IntersectionObserver' in window) || reduce.matches) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    // stagger siblings in grids
    document.querySelectorAll('.bento, .rail-track, .stack-grid, .steps, .principles, .faq, .timeline').forEach(function (g) {
      Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--d', (Math.min(i % 4, 3) * 0.07) + 's'); });
    });
    root.classList.add('reveal-ready');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    reveals.forEach(function (el) { io.observe(el); });
    // safety net: never leave content hidden (e.g. if an observer misses an element)
    setTimeout(function () {
      reveals.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
      });
    }, 2500);
  }
  if ('IntersectionObserver' in window && counters.length) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { runCounter(en.target); co.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { co.observe(c); });
  }
  Site.revealAll = function () { reveals.forEach(function (el) { el.classList.add('is-in'); }); };

  /* ---------- copy email ---------- */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function copyEmail() {
    var done = function () { toast('Email copied: ' + EMAIL); };
    var fail = function () { toast(fallbackCopy(EMAIL) ? 'Email copied: ' + EMAIL : 'Could not copy. The address is ' + EMAIL); };
    try {
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(EMAIL).then(done, fail);
      else fail();
    } catch (e) { fail(); }
  }
  Site.copyEmail = copyEmail;
  document.querySelectorAll('[data-copy-email]').forEach(function (b) { b.addEventListener('click', copyEmail); });

  /* ---------- email-draft helper (nothing leaves the browser) ---------- */
  var form = document.getElementById('brief');
  if (form) {
    var desc = form.querySelector('#b-desc');
    var err = form.querySelector('#b-desc-err');
    desc.addEventListener('input', function () {
      if (desc.value.trim()) { err.hidden = true; desc.removeAttribute('aria-invalid'); }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('#b-name').value.trim();
      var type = form.querySelector('#b-type').value;
      var text = desc.value.trim();
      var timeline = form.querySelector('#b-time').value.trim();
      if (!text) {
        err.hidden = false;
        desc.setAttribute('aria-invalid', 'true');
        desc.focus();
        return;
      }
      var lines = ['Hi Jinay,', '', 'What I need: ' + type, '', text];
      if (timeline) lines.push('', 'Timeline: ' + timeline);
      lines.push('', 'Thanks,', name || '');
      var subject = 'Project enquiry: ' + type + (name ? ' (' + name + ')' : '');
      var href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      Site.lastDraft = href;
      toast('Opening your email app…');
      window.location.href = href;
    });
  }

  /* ---------- keep Tab inside an open modal dialog ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var dlg = document.querySelector('dialog[open]');
    if (!dlg) return;
    var f = Array.prototype.filter.call(dlg.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'), function (el) {
      return el.offsetWidth || el.offsetHeight || el.getClientRects().length;
    });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    var a = document.activeElement;
    var inside = dlg.contains(a);
    var after = f.filter(function (el) { return a.compareDocumentPosition(el) & 4; });
    var before = f.filter(function (el) { return a.compareDocumentPosition(el) & 2; });
    if (!inside) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && !before.length) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && !after.length) { e.preventDefault(); first.focus(); }
  });

  /* ---------- work grid: never leave the "your project" card alone next to an empty cell ---------- */
  var railTrack = document.querySelector('.rail-track');
  if (railTrack && railTrack.querySelector('.case-card--cta')) {
    var ctaW = -1;
    var fitCta = function () {
      var w = railTrack.clientWidth;
      if (w === ctaW) return; // only width changes the column count
      ctaW = w;
      var cs = getComputedStyle(railTrack);
      var cols = cs.display === 'grid' ? cs.gridTemplateColumns.split(' ').filter(Boolean).length : 0;
      railTrack.classList.toggle('cta-span', cols > 1 && railTrack.children.length % cols === 1);
    };
    fitCta();
    if ('ResizeObserver' in window) new ResizeObserver(fitCta).observe(railTrack);
    else window.addEventListener('resize', fitCta);
  }

  /* ---------- footer year ---------- */
  var y = document.querySelector('[data-year]');
  if (y) y.textContent = String(new Date().getFullYear());
})();
