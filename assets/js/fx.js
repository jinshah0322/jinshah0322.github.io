/* Motion layer. Everything here is optional polish on top of a page that already works:
   smooth scrolling (Lenis), a short skippable intro, split-text reveals, scramble labels,
   the rotating "Bring me" line, the hero build card, magnetic buttons, spotlight + tilt cards,
   a cursor follower, the pinned horizontal work rail, and the footer word shimmer.
   With prefers-reduced-motion: reduce, only the non-moving parts run. */
(function () {
  'use strict';

  var root = document.documentElement;
  var Site = window.Site = window.Site || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var HEADER_OFFSET = 88;

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (!reduce && typeof window.Lenis === 'function') {
    try {
      lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1, anchors: false });
      Site.lenis = lenis;
      var rafLenis = function (t) { lenis.raf(t); requestAnimationFrame(rafLenis); };
      requestAnimationFrame(rafLenis);
    } catch (e) { lenis = null; }
  }
  Site.scrollTo = function (target, opts) {
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el === document.getElementById('top') ? 0 : el, Object.assign({ duration: 1.2 }, opts || {})); // Lenis applies html scroll-padding-top itself
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  // in-page links: smooth with Lenis, then move focus to the target for keyboard users
  if (lenis) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-case-link') || a.classList.contains('skip-link') || a.closest('dialog')) return;
      var hash = a.getAttribute('href');
      if (hash.length < 2 || hash.indexOf('#case') === 0) return;
      var t = document.querySelector(hash);
      if (!t) return;
      e.preventDefault();
      Site.scrollTo(t);
      if (hash !== '#top') {
        if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
        t.focus({ preventScroll: true });
      }
      try { history.pushState(null, '', hash === '#top' ? location.pathname + location.search : hash); } catch (err) { /* ignore */ }
    });
  }

  /* ---------- split text ---------- */
  function splitNode(node, mode, counter, out) {
    Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
      if (ch.nodeType === 3) {
        var parts = ch.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (p) {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
          if (mode === 'chars') {
            var w = document.createElement('span');
            w.className = 'split-chars';
            w.style.display = 'inline-block';
            w.style.whiteSpace = 'nowrap';
            p.split('').forEach(function (c) {
              var s = document.createElement('span');
              s.className = 'char';
              s.style.setProperty('--i', counter.n++);
              s.textContent = c;
              w.appendChild(s);
            });
            frag.appendChild(w);
          } else {
            var outer = document.createElement('span');
            outer.className = 'split-word';
            var inner = document.createElement('span');
            inner.style.setProperty('--i', counter.n++);
            inner.textContent = p;
            outer.appendChild(inner);
            frag.appendChild(outer);
          }
        });
        ch.parentNode.replaceChild(frag, ch);
      } else if (ch.nodeType === 1) {
        if (ch.classList.contains('prism-text')) {
          // gradient text stays one unit so background-clip keeps working
          var unit = document.createElement('span');
          unit.className = mode === 'chars' ? 'char' : 'split-word';
          if (mode === 'chars') { unit.style.setProperty('--i', counter.n); counter.n += 4; ch.parentNode.replaceChild(unit, ch); unit.appendChild(ch); }
          else { var inn = document.createElement('span'); inn.style.setProperty('--i', counter.n++); ch.parentNode.replaceChild(unit, ch); inn.appendChild(ch); unit.appendChild(inn); }
        } else {
          splitNode(ch, mode, counter, out);
        }
      }
    });
  }
  var splits = document.querySelectorAll('[data-split]');
  if (!reduce && 'IntersectionObserver' in window) {
    splits.forEach(function (h) {
      var text = h.textContent.replace(/\s+/g, ' ').trim();
      var vis = document.createElement('span');
      vis.setAttribute('aria-hidden', 'true');
      while (h.firstChild) vis.appendChild(h.firstChild);
      splitNode(vis, h.getAttribute('data-split'), { n: 0 });
      var sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      h.appendChild(sr);
      h.appendChild(vis);
      if (h.classList.contains('hero-title')) vis.style.display = 'block';
    });
    root.classList.add('split-ready');
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); so.unobserve(en.target); } });
    }, { threshold: 0.2 });
    splits.forEach(function (h) { if (!h.classList.contains('hero-title')) so.observe(h); });
  }

  /* ---------- scramble labels ---------- */
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>*#';
  function scrambleTo(node, finalText, dur, cb) {
    var start = null, len = finalText.length;
    function frame(t) {
      if (!start) start = t;
      var p = Math.min(1, (t - start) / dur);
      var reveal = Math.floor(p * len);
      var s = finalText.slice(0, reveal);
      for (var i = reveal; i < len; i++) s += finalText[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      node.textContent = s;
      if (p < 1) requestAnimationFrame(frame); else { node.textContent = finalText; if (cb) cb(); }
    }
    requestAnimationFrame(frame);
  }
  if (!reduce && 'IntersectionObserver' in window) {
    var sco = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        sco.unobserve(en.target);
        var tn = en.target.lastChild;
        if (tn && tn.nodeType === 3 && tn.textContent.trim()) scrambleTo(tn, tn.textContent, 700);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('[data-scramble]').forEach(function (e) { sco.observe(e); });
  }

  /* ---------- "Bring me ..." rotator ---------- */
  var bring = document.querySelector('[data-rotate]');
  var heroVisible = true;
  if (bring) {
    var phrases = [];
    try { phrases = JSON.parse(bring.getAttribute('data-rotate')); } catch (e) { phrases = []; }
    if (phrases.length > 1) {
      var sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = phrases.slice(0, -1).join(', ') + ', or ' + phrases[phrases.length - 1];
      bring.setAttribute('aria-hidden', 'true');
      bring.parentNode.insertBefore(sr, bring);
      if (!reduce) {
        var pi = 0;
        setInterval(function () {
          if (document.hidden || !heroVisible) return;
          pi = (pi + 1) % phrases.length;
          scrambleTo(bring, phrases[pi], 650);
        }, 2800);
      }
    }
  }

  /* ---------- hero build card ---------- */
  var ship = document.querySelector('.ship-card');
  if (ship && !reduce) {
    var stages = ship.querySelectorAll('[data-stage]');
    var k = -1;
    ship.classList.add('is-live');
    var stepShip = function () {
      if (!document.hidden && heroVisible) {
        k = (k + 1) % 6; // 0..4 stages, 5 = hold
        if (k < 5) {
          stages.forEach(function (s) { s.classList.toggle('is-on', +s.getAttribute('data-stage') <= k); });
          ship.style.setProperty('--ship', (k / 4).toFixed(2));
        }
      }
      setTimeout(stepShip, k === 4 ? 2600 : 1100);
    };
    stepShip();
  }
  var hero = document.querySelector('.hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; }, { threshold: 0.05 }).observe(hero);
  }

  /* ---------- pointer effects: magnetic, spotlight, tilt, cursor ---------- */
  if (finePointer && !reduce) {
    root.classList.add('tilt-on');
    document.querySelectorAll('[data-magnetic]').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px');
        b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function () { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
    });
    document.querySelectorAll('[data-spot], [data-tilt]').forEach(function (c) {
      var spot = c.hasAttribute('data-spot'), tilt = c.hasAttribute('data-tilt');
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        if (spot) { c.style.setProperty('--sx', (x * 100).toFixed(1) + '%'); c.style.setProperty('--sy', (y * 100).toFixed(1) + '%'); c.style.setProperty('--so', '1'); }
        if (tilt) { c.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg'); c.style.setProperty('--rx', ((0.5 - y) * 6).toFixed(2) + 'deg'); }
      });
      c.addEventListener('pointerleave', function () {
        c.style.setProperty('--so', '0'); c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg');
      });
    });

    // cursor follower (the native cursor stays visible; this only adds a ring)
    var cur = document.createElement('div');
    cur.className = 'cursor is-hidden';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<div class="cursor-ring"></div><div class="cursor-dot"></div>';
    document.body.appendChild(cur);
    var ring = cur.firstChild, dot = cur.lastChild;
    var mx = -100, my = -100, rx = -100, ry = -100, running = false;
    var loop = function () {
      rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2;
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) requestAnimationFrame(loop); else running = false;
    };
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      cur.classList.remove('is-hidden');
      if (!running) { running = true; requestAnimationFrame(loop); }
      var hov = e.target.closest && e.target.closest('a, button, summary, label, select, input, textarea, [data-tilt], .palette-item');
      cur.classList.toggle('is-hover', !!hov);
    }, { passive: true });
    document.addEventListener('pointerdown', function () { cur.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { cur.classList.remove('is-down'); });
    document.documentElement.addEventListener('pointerleave', function () { cur.classList.add('is-hidden'); });
    // the ring would sit under top-layer dialogs; hide it while one is open
    new MutationObserver(function () {
      cur.style.display = document.querySelector('dialog[open]') ? 'none' : '';
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });

    // footer word shimmer follows the pointer
    var fw = document.querySelector('.footer-word');
    if (fw) fw.parentNode.addEventListener('pointermove', function (e) {
      fw.style.setProperty('--fw', ((e.clientX / window.innerWidth) * 100).toFixed(1) + '%');
    });
  }

  /* ---------- pinned horizontal work rail ---------- */
  var rail = document.querySelector('[data-rail]');
  var track = rail && rail.querySelector('.rail-track');
  var railN = rail && rail.querySelector('[data-rail-n]');
  var railOn = false, railTop = 0, railRange = 0, railDist = 0;
  var mqRail = window.matchMedia('(min-width: 1000px) and (min-height: 620px)');
  function measureRail() {
    if (!railOn) return;
    rail.style.height = '';
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    railDist = Math.max(0, track.scrollWidth - vw);
    rail.style.height = (vh + railDist) + 'px';
    var r = rail.getBoundingClientRect();
    railTop = r.top + window.scrollY;
    railRange = Math.max(1, railDist);
    updateRail();
  }
  function updateRail() {
    if (!railOn) return;
    var p = Math.max(0, Math.min(1, (window.scrollY - railTop) / railRange));
    track.style.setProperty('--rail-x', (-p * railDist).toFixed(1) + 'px');
    rail.style.setProperty('--rail-p', p.toFixed(4));
    var cards = track.children.length;
    if (railN) railN.textContent = String(Math.min(cards, Math.round(p * (cards - 1)) + 1)).padStart(2, '0');
  }
  function setRail(on) {
    railOn = on;
    root.classList.toggle('rail-on', on);
    if (!on) { rail.style.height = ''; track.style.removeProperty('--rail-x'); return; }
    measureRail();
  }
  // bring a card into view when focus (keyboard) or a dialog close lands on it
  Site.revealRail = function (el) {
    if (!railOn || !el || !track.contains(el)) return;
    var card = el.closest('.rail-track > li');
    if (!card) return;
    var sticky = rail.querySelector('.rail-sticky');
    if (sticky.scrollLeft) sticky.scrollLeft = 0;
    var vw = document.documentElement.clientWidth;
    var left = card.offsetLeft - (vw - card.offsetWidth) / 2;
    var p = Math.max(0, Math.min(1, left / Math.max(1, railDist)));
    var y = railTop + p * railRange;
    if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
    updateRail();
  };
  if (rail && track && !reduce) {
    setRail(mqRail.matches);
    if (mqRail.addEventListener) mqRail.addEventListener('change', function (m) { setRail(m.matches); });
    window.addEventListener('scroll', function () { if (railOn) requestAnimationFrame(updateRail); }, { passive: true });
    window.addEventListener('resize', function () { if (railOn) measureRail(); });
    window.addEventListener('load', function () { if (railOn) measureRail(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (railOn) measureRail(); });
    track.addEventListener('focusin', function (e) { Site.revealRail(e.target); });
  }

  /* ---------- intro (short, skippable, never blocks content) ---------- */
  var heroTitle = document.querySelector('.hero-title');
  var seen = false;
  try { seen = sessionStorage.getItem('intro-seen') === '1'; } catch (e) { seen = true; }
  var startHero = function () {
    root.classList.remove('intro-wait');
    document.querySelectorAll('[data-intro]').forEach(function (e, i) { e.style.setProperty('--d', (0.25 + i * 0.08).toFixed(2) + 's'); });
    if (heroTitle) heroTitle.classList.add('is-in');
  };
  if (reduce || seen || location.hash.length > 1 || window.scrollY > 50) {
    if (heroTitle) heroTitle.classList.add('is-in');
  } else {
    try { sessionStorage.setItem('intro-seen', '1'); } catch (e) { /* ignore */ }
    root.classList.add('intro-wait');
    var intro = document.createElement('div');
    intro.className = 'intro';
    intro.setAttribute('aria-hidden', 'true');
    intro.innerHTML = '<div class="intro-inner"><svg class="mark"><use href="#i-mark"/></svg><p class="intro-word">problem</p><div class="intro-bar"><i></i></div></div><button class="intro-skip" type="button" tabindex="-1">skip intro</button>';
    document.body.appendChild(intro);
    var word = intro.querySelector('.intro-word');
    var words = ['problem', 'scope', 'build', 'ship'];
    var wi = 0;
    var wt = setInterval(function () { wi++; if (wi < words.length) scrambleTo(word, words[wi], 220); }, 300);
    var finished = false;
    var finish = function () {
      if (finished) return;
      finished = true;
      clearInterval(wt);
      intro.classList.add('is-done');
      startHero();
      ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(function (ev) { window.removeEventListener(ev, finish, true); });
      setTimeout(function () { if (intro.parentNode) intro.parentNode.removeChild(intro); }, 1000);
    };
    ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, finish, { capture: true, passive: true }); });
    setTimeout(finish, 1350);
  }
})();
