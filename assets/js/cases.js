/* Case-study detail view.
   - Content lives in index.html inside <section class="case-store"> (one <article> per case).
     Without JavaScript that section is simply visible and the cards link to it.
   - With JavaScript, cards open a native <dialog> (focus trapped, ESC closes, focus returns
     to the card). Deep links: #case/<slug> (and #case-<slug>).
   - The architecture diagram is drawn as inline SVG from each case's "How it works" <ol>;
     nodes light up in sequence and a highlight then walks the flow (off for reduced motion). */
(function () {
  'use strict';

  var dialog = document.getElementById('case-dialog');
  var store = document.querySelector('.case-store');
  if (!dialog || !store || typeof dialog.showModal !== 'function') {
    document.documentElement.classList.add('no-dialog');
    if (store) store.style.display = 'block';
    return;
  }

  var Site = window.Site = window.Site || {};
  var body = dialog.querySelector('[data-case-body]');
  var pos = dialog.querySelector('[data-case-pos]');
  var prevLink = dialog.querySelector('[data-case-prev]');
  var nextLink = dialog.querySelector('[data-case-next]');
  var articles = Array.prototype.slice.call(store.querySelectorAll('article.case'));
  var slugs = articles.map(function (a) { return a.getAttribute('data-slug'); });
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var currentSlug = null;
  var opener = null;
  var animatedFor = null;
  var hotTimer = null;
  var SVGNS = 'http://www.w3.org/2000/svg';

  body.setAttribute('tabindex', '-1');

  /* ---------- diagram ---------- */
  var measureCtx = null;
  function textWidth(str, font) {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = font;
    return measureCtx.measureText(str).width;
  }
  function wrap(text, maxW, font) {
    var words = text.split(/\s+/), lines = [], line = '';
    words.forEach(function (w) {
      var test = line ? line + ' ' + w : w;
      if (textWidth(test, font) <= maxW || !line) line = test;
      else { lines.push(line); line = w; }
    });
    if (line) lines.push(line);
    return lines;
  }
  function classify(text, i, n) {
    if (/on failure|fallback|falls back|retry|exhaust/i.test(text)) return { cls: 'is-warn', tag: 'Recovery path' };
    if (/reviewer|human review|approv|confirms/i.test(text)) return { cls: 'is-human', tag: 'Human in the loop' };
    if (i === 0) return { cls: 'is-start', tag: 'Entry' };
    if (i === n - 1) return { cls: 'is-end', tag: 'Result' };
    return { cls: '', tag: '' };
  }
  function el(name, attrs, parent) {
    var e = document.createElementNS(SVGNS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function drawDiagram(host, steps, uid, animate) {
    var W = Math.floor(host.clientWidth);
    if (!W) return;
    host.innerHTML = '';
    host.classList.remove('is-seq');
    var font = '400 14px ' + getComputedStyle(document.body).fontFamily;
    var cols = W >= 560 ? 2 : 1;
    var gapX = 46, gapY = 36, padL = 52, padR = 16, lineH = 20, padY = 15, tagH = 16;
    var nodeW = (W - (cols - 1) * gapX) / cols;
    var n = steps.length;

    var info = steps.map(function (t, i) {
      var c = classify(t, i, n);
      var lines = wrap(t, nodeW - padL - padR, font);
      var h = padY * 2 + lines.length * lineH + (c.tag ? tagH : 0);
      return { text: t, lines: lines, h: Math.max(h, 56), c: c };
    });

    // grid positions (snake order)
    var rows = Math.ceil(n / cols), rowY = [], rowH = [], y = 2;
    for (var r = 0; r < rows; r++) {
      var mh = 0;
      for (var c = 0; c < cols; c++) { var k = r * cols + c; if (k < n) mh = Math.max(mh, info[k].h); }
      rowH.push(mh); rowY.push(y); y += mh + gapY;
    }
    var H = y - gapY + 4;
    info.forEach(function (o, i) {
      var rr = Math.floor(i / cols), cc = i % cols;
      if (rr % 2 === 1) cc = cols - 1 - cc;
      o.x = cc * (nodeW + gapX); o.y = rowY[rr]; o.w = nodeW; o.hh = rowH[rr]; o.row = rr;
    });

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-labelledby': uid + '-t' });
    var title = el('title', { id: uid + '-t' }, svg);
    title.textContent = 'Flow diagram: ' + steps.map(function (s, i) { return (i + 1) + '. ' + s; }).join(' → ');
    var defs = el('defs', {}, svg);
    var marker = el('marker', { id: uid + '-arr', viewBox: '0 0 10 10', refX: '8.5', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0 0 L10 5 L0 10 z', class: 'd-arrow' }, marker);

    var edges = el('g', {}, svg);
    for (var i = 0; i < n - 1; i++) {
      var a = info[i], b = info[i + 1], d, len;
      if (a.row === b.row) {
        var cy = a.y + a.hh / 2;
        if (b.x > a.x) { d = 'M' + (a.x + a.w) + ' ' + cy + ' H' + (b.x - 2); len = b.x - 2 - a.x - a.w; }
        else { d = 'M' + a.x + ' ' + cy + ' H' + (b.x + b.w + 2); len = a.x - b.x - b.w - 2; }
      } else {
        var cx = a.x + 26;
        d = 'M' + cx + ' ' + (a.y + a.hh) + ' V' + (b.y - 2);
        len = b.y - 2 - a.y - a.hh;
      }
      len = Math.max(1, Math.round(len));
      el('path', { d: d, class: 'd-edge', 'marker-end': 'url(#' + uid + '-arr)', style: '--i:' + i + ';--len:' + len }, edges);
      if (!reduce.matches) el('path', { d: d, class: 'd-edge-flow' }, edges);
    }

    info.forEach(function (o, i) {
      var g = el('g', { class: 'd-node ' + o.c.cls, transform: 'translate(' + o.x + ' ' + o.y + ')', style: '--i:' + i }, svg);
      el('rect', { x: 0, y: 0, width: o.w, height: o.hh, rx: 14 }, g);
      el('circle', { class: 'd-num-bg', cx: 26, cy: o.hh / 2, r: 14 }, g);
      var num = el('text', { class: 'd-num', x: 26, y: o.hh / 2 }, g);
      num.textContent = String(i + 1);
      var blockH = o.lines.length * lineH + (o.c.tag ? tagH : 0);
      var ty = (o.hh - blockH) / 2;
      if (o.c.tag) {
        var tg = el('text', { class: 'd-tag', x: padL, y: ty + 10 }, g);
        tg.textContent = o.c.tag;
        ty += tagH;
      }
      o.lines.forEach(function (ln, j) {
        var t = el('text', { class: 'd-text', x: padL, y: ty + j * lineH + 14.5 }, g);
        t.textContent = ln;
      });
    });

    host.appendChild(svg);
    if (animate && !reduce.matches) host.classList.add('is-seq');

    var kinds = {};
    info.forEach(function (o) { kinds[o.c.cls] = true; });
    var leg = document.createElement('p');
    leg.className = 'diagram-legend';
    leg.setAttribute('aria-hidden', 'true');
    var html = '<span><i></i>Step</span>';
    if (kinds['is-warn']) html += '<span><i class="lg-warn"></i>Recovery path</span>';
    if (kinds['is-human']) html += '<span><i class="lg-human"></i>Human in the loop</span>';
    if (kinds['is-end']) html += '<span><i class="lg-end"></i>Result</span>';
    leg.innerHTML = html;
    host.appendChild(leg);
    return n;
  }

  function startHot(host, n) {
    clearInterval(hotTimer);
    if (reduce.matches || !n) return;
    var k = -1;
    var delay = n * 160 + 700;
    hotTimer = setTimeout(function tick() {
      var nodes = host.querySelectorAll('.d-node');
      if (!nodes.length || !dialog.open) return;
      nodes.forEach(function (nd) { nd.classList.remove('is-hot'); });
      k = (k + 1) % nodes.length;
      nodes[k].classList.add('is-hot');
      hotTimer = setTimeout(tick, k === nodes.length - 1 ? 1600 : 900);
    }, delay);
  }

  function renderDiagrams(scope) {
    scope.querySelectorAll('.case-flow').forEach(function (sec, k) {
      var host = sec.querySelector('[data-diagram]');
      var steps = Array.prototype.map.call(sec.querySelectorAll('.flow-steps li'), function (li) { return li.textContent.trim(); });
      if (!host || !steps.length) return;
      try {
        var first = animatedFor !== currentSlug;
        var n = drawDiagram(host, steps, 'dg-' + (currentSlug || 'x') + '-' + k, first);
        sec.classList.add('has-diagram');
        if (first) { animatedFor = currentSlug; startHot(host, n); }
      } catch (e) {
        sec.classList.remove('has-diagram'); // the plain numbered list stays visible
      }
    });
  }

  /* ---------- dialog ---------- */
  function caseFromHash() {
    var m = /^#case[\/-]([a-z0-9-]+)$/.exec(location.hash);
    return m && slugs.indexOf(m[1]) !== -1 ? m[1] : null;
  }
  function titleOf(slug) {
    var a = articles[slugs.indexOf(slug)];
    var t = a && a.querySelector('.case-title');
    return t ? t.textContent : slug;
  }

  function fill(slug) {
    var idx = slugs.indexOf(slug);
    var clone = articles[idx].cloneNode(true);
    clone.removeAttribute('id');
    var h = clone.querySelector('.case-title');
    if (h) h.id = 'case-dialog-title';
    body.innerHTML = '';
    body.appendChild(clone);
    currentSlug = slug;
    pos.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(slugs.length).padStart(2, '0');
    var prev = slugs[(idx - 1 + slugs.length) % slugs.length];
    var next = slugs[(idx + 1) % slugs.length];
    prevLink.href = '#case/' + prev;
    nextLink.href = '#case/' + next;
    prevLink.setAttribute('aria-label', 'Previous case study: ' + titleOf(prev));
    nextLink.setAttribute('aria-label', 'Next case study: ' + titleOf(next));
    body.scrollTop = 0;
  }

  function open(slug) {
    if (!dialog.open) {
      opener = document.activeElement;
      fill(slug);
      dialog.showModal();
      if (Site.lenis) Site.lenis.stop();
    } else {
      fill(slug);
    }
    renderDiagrams(body);
    body.focus({ preventScroll: true });
  }
  Site.openCase = function (slug) {
    if (slugs.indexOf(slug) === -1) return;
    try { history.pushState(null, '', '#case/' + slug); } catch (e) { location.hash = 'case/' + slug; return; }
    open(slug);
  };
  Site.caseList = function () { return slugs.map(function (s) { return { slug: s, title: titleOf(s), kicker: (articles[slugs.indexOf(s)].querySelector('.case-kicker') || {}).textContent || '' }; }); };

  function cardLink(slug) { return document.querySelector('[data-case-link="' + slug + '"]'); }

  dialog.addEventListener('close', function () {
    var slug = currentSlug;
    currentSlug = null;
    animatedFor = null;
    clearTimeout(hotTimer);
    if (Site.lenis) Site.lenis.start();
    if (caseFromHash()) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
    }
    var back = cardLink(slug) || opener;
    if (back && typeof back.focus === 'function') back.focus({ preventScroll: true });
    if (Site.revealRail) Site.revealRail(back);
    body.innerHTML = '';
  });

  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
  dialog.querySelector('[data-case-close]').addEventListener('click', function () { dialog.close(); });

  [prevLink, nextLink].forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var slug = a.getAttribute('href').replace('#case/', '');
      try { history.replaceState(null, '', '#case/' + slug); } catch (err) { /* ignore */ }
      open(slug);
    });
  });

  // card links point at the in-page article (no-JS fallback); with JS they open the dialog
  document.querySelectorAll('[data-case-link]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      Site.openCase(a.getAttribute('data-case-link'));
    });
  });

  function onHash() {
    var slug = caseFromHash();
    if (slug) open(slug);
    else if (dialog.open) dialog.close();
  }
  window.addEventListener('hashchange', onHash);
  window.addEventListener('popstate', onHash);
  onHash();

  if ('ResizeObserver' in window) {
    var lastW = 0, raf = 0;
    new ResizeObserver(function (entries) {
      var w = Math.floor(entries[0].contentRect.width);
      if (w === lastW || !dialog.open) return;
      lastW = w;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () { renderDiagrams(body); });
    }).observe(body);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (dialog.open) renderDiagrams(body); });
  }
})();
