(() => {
  "use strict";
  const doc = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hasIO = "IntersectionObserver" in window;

  /* ---------- Theme toggle (initial theme is set inline in <head>) ---------- */
  const themeBtn = document.querySelector(".theme-btn");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const applyTheme = (t) => {
    doc.setAttribute("data-theme", t);
    if (themeMeta) themeMeta.setAttribute("content", t === "dark" ? "#1A1714" : "#F4F0E8");
    if (themeBtn) {
      themeBtn.setAttribute("aria-pressed", String(t === "dark"));
    }
  };
  applyTheme(doc.getAttribute("data-theme") === "dark" ? "dark" : "light");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const next = doc.getAttribute("data-theme") === "dark" ? "light" : "dark";
      try { localStorage.setItem("theme", next); } catch (_) { /* private mode: still switch */ }
      if (document.startViewTransition && !reduce.matches) document.startViewTransition(() => applyTheme(next));
      else applyTheme(next);
    });
  }

  /* ---------- Mobile menu (below 1024px) ---------- */
  const menuBtn = document.querySelector(".menu-btn");
  const menu = document.getElementById("mobile-menu");
  if (menuBtn && menu) {
    const focusables = () => [menuBtn, ...menu.querySelectorAll("a")];
    const isOpen = () => menuBtn.getAttribute("aria-expanded") === "true";
    const setOpen = (open, returnFocus) => {
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("open", open);
      if (open) {
        const first = menu.querySelector("a");
        requestAnimationFrame(() => first && first.focus({ preventScroll: true }));
      } else if (returnFocus) {
        menuBtn.focus();
      }
    };
    menuBtn.addEventListener("click", () => setOpen(!isOpen(), false));
    menu.addEventListener("click", (ev) => { if (ev.target.closest("a")) setOpen(false, false); });
    document.addEventListener("keydown", (ev) => {
      if (!isOpen()) return;
      if (ev.key === "Escape") { ev.preventDefault(); setOpen(false, true); return; }
      if (ev.key === "Tab") {
        const f = focusables(), first = f[0], last = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
    });
    document.addEventListener("pointerdown", (ev) => {
      if (isOpen() && !menu.contains(ev.target) && !menuBtn.contains(ev.target)) setOpen(false, false);
    });
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = (ev) => { if (ev.matches && isOpen()) setOpen(false, false); };
    if (wide.addEventListener) wide.addEventListener("change", onWide);
  }

  /* ---------- Rolling step numbers ---------- */
  document.querySelectorAll(".step-num").forEach((el) => {
    const n = parseInt(el.dataset.n, 10) || 0;
    const col = el.querySelector(".digits");
    const from = reduce.matches || !hasIO ? n : 0;
    for (let d = from; d <= n; d++) {
      const s = document.createElement("span");
      s.textContent = String(d);
      col.appendChild(s);
    }
  });
  const rollIn = (step) => {
    const num = step.querySelector(".step-num");
    if (!num) return;
    const col = num.querySelector(".digits");
    const count = col.children.length;
    col.style.transform = "translateY(" + -(count - 1) + "em)";
  };

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll(".reveal, .reveal-line, .pt-flow");
  const settle = (el) => {
    const delay = (parseFloat(getComputedStyle(el).getPropertyValue("--i")) || 0) * 90 + 1000;
    setTimeout(() => el.classList.add("settled"), delay);
  };
  if (hasIO && !reduce.matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.classList.add("in");
        if (el.classList.contains("step")) rollIn(el);
        settle(el);
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => { el.classList.add("in", "settled"); if (el.classList.contains("step")) rollIn(el); });
  }

  /* ---------- Loop animations only run while on screen ---------- */
  const players = document.querySelectorAll(".hero-visual, .pt-flow, .svc-ico");
  if (hasIO && !reduce.matches) {
    const pio = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.target.classList.toggle("play", en.isIntersecting));
    }, { threshold: 0.05 });
    players.forEach((el) => pio.observe(el));
  }

  /* ---------- Disclosure helper (FAQ panels, smooth height via grid rows) ---------- */
  const togglePanelOpen = (btn, panel, openCls) => {
    const open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!open));
    if (!open) {
      panel.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add(openCls)));
    } else {
      panel.classList.remove(openCls);
      const done = () => { if (!panel.classList.contains(openCls)) panel.hidden = true; };
      if (reduce.matches) done();
      else setTimeout(done, 420);
    }
  };
  document.querySelectorAll(".faq-btn").forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute("aria-controls"));
    if (panel) btn.addEventListener("click", () => togglePanelOpen(btn, panel, "open"));
  });

  document.querySelectorAll(".qa-btn").forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute("aria-controls"));
    if (panel) btn.addEventListener("click", () => togglePanelOpen(btn, panel, "open"));
  });

  /* ---------- "What's inside": collapsed by default ---------- */
  document.querySelectorAll(".mods-more").forEach((btn) => {
    const list = document.getElementById(btn.getAttribute("aria-controls"));
    const label = btn.querySelector(".mm-label");
    if (!list) return;
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      list.classList.toggle("all", open);
      label.textContent = open ? btn.dataset.less : btn.dataset.more;
    });
  });

  /* ---------- Lane diagrams: route arrows between boxes ---------- */
  const SVGNS = "http://www.w3.org/2000/svg";
  const overlaps = (a1, a2, b1, b2, pad) => Math.min(a1, a2) < Math.max(b1, b2) + pad && Math.max(a1, a2) > Math.min(b1, b2) - pad;
  // interval colouring: returns level per item so overlapping intervals get different levels
  const levels = (items, pad) => {
    const placed = [];
    items.slice().sort((a, b) => (Math.abs(a.hi - a.lo) - Math.abs(b.hi - b.lo))).forEach((it) => {
      let lv = 0;
      while (placed.some((p) => p.lv === lv && p.key === it.key && overlaps(p.lo, p.hi, it.lo, it.hi, pad))) lv++;
      it.lv = lv; placed.push(it);
    });
  };
  const rounded = (pts, r) => {
    const q = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = q[q.length - 1], b = pts[i];
      if (Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) < 0.5) continue;
      q.push(b);
    }
    let d = "M" + q[0][0].toFixed(1) + " " + q[0][1].toFixed(1);
    for (let i = 1; i < q.length - 1; i++) {
      const p0 = q[i - 1], p1 = q[i], p2 = q[i + 1];
      const l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const rr = Math.min(r, l1 / 2, l2 / 2);
      const a = [p1[0] - (p1[0] - p0[0]) / l1 * rr, p1[1] - (p1[1] - p0[1]) / l1 * rr];
      const b = [p1[0] + (p2[0] - p1[0]) / l2 * rr, p1[1] + (p2[1] - p1[1]) / l2 * rr];
      d += "L" + a[0].toFixed(1) + " " + a[1].toFixed(1) + "Q" + p1[0].toFixed(1) + " " + p1[1].toFixed(1) + " " + b[0].toFixed(1) + " " + b[1].toFixed(1);
    }
    const e = q[q.length - 1];
    return d + "L" + e[0].toFixed(1) + " " + e[1].toFixed(1);
  };
  const HEAD = 7;
  const routeDiagram = (grid, animate) => {
    const svg = grid.querySelector(".dg-svg");
    if (!svg || grid.offsetParent === null) return;
    const g = grid.getBoundingClientRect();
    if (g.width < 10) return;
    const wide = getComputedStyle(grid).getPropertyValue("--wide").trim() === "1";
    const boxes = {};
    const all = [];
    grid.querySelectorAll(".dg-box").forEach((el, idx) => {
      const r = el.getBoundingClientRect();
      const b = { el, id: el.dataset.b, c: +el.dataset.c, idx, l: r.left - g.left, t: r.top - g.top, r: r.right - g.left, b: r.bottom - g.top };
      b.cx = (b.l + b.r) / 2; b.cy = (b.t + b.b) / 2;
      boxes[b.id] = b; all.push(b);
    });
    const heads = Array.from(grid.querySelectorAll(".dg-lh")).map((el) => { const r = el.getBoundingClientRect(); return { l: r.left - g.left, t: r.top - g.top, r: r.right - g.left, b: r.bottom - g.top }; });
    const obstacles = all.concat(heads);
    // "a>b*" marks an outside connection: drawn dashed and kept on the outer lane of each channel
    const arrows = (grid.dataset.arrows || "").split("|").filter(Boolean).map((s, k) => { const [f, t0] = s.split(">"); const ext = t0.endsWith("*"); const t = ext ? t0.slice(0, -1) : t0; return { f: boxes[f], t: boxes[t], k, ext }; }).filter((a) => a.f && a.t);
    const ports = {}; // key box|side -> list
    const addPort = (box, side, arrow, end) => { const key = box.id + "|" + side; (ports[key] = ports[key] || []).push({ arrow, end }); };
    let minL = Infinity, maxR = -Infinity, maxB = 0;
    all.forEach((b) => { minL = Math.min(minL, b.l); maxR = Math.max(maxR, b.r); maxB = Math.max(maxB, b.b); });
    const cols = {};
    if (wide) {
      all.concat([]).forEach((b) => { const c = cols[b.c] || (cols[b.c] = { l: Infinity, r: -Infinity }); c.l = Math.min(c.l, b.l); c.r = Math.max(c.r, b.r); });
    }
    const chanX = (k) => { // centre of channel k (between column k-1 and k)
      const left = cols[k - 1], right = cols[k];
      if (left && right) return (left.r + right.l) / 2;
      if (right) return right.l - 14;
      return left.r + 14;
    };
    // pick a free horizontal y between x1..x2 avoiding obstacles, near target y
    const freeY = (x1, x2, want, lo, hi) => {
      const xa = Math.min(x1, x2), xb = Math.max(x1, x2);
      const blocks = obstacles.filter((o) => o.r > xa - 2 && o.l < xb + 2).map((o) => [o.t - 7, o.b + 7]).sort((a, b) => a[0] - b[0]);
      const cands = [];
      let y0 = -1e4;
      blocks.forEach(([t, b]) => { if (t > y0) cands.push([y0, t]); y0 = Math.max(y0, b); });
      cands.push([y0, 1e5]);
      let best = null, bestScore = Infinity;
      cands.forEach(([a, b]) => {
        if (b - a < 4) return;
        const y = Math.min(Math.max(want, a + 2), b - 2);
        const score = Math.abs(y - want) + (y < lo - 1 || y > hi + 1 ? 0.25 * Math.min(Math.abs(y - lo), Math.abs(y - hi)) : 0);
        if (score < bestScore) { bestScore = score; best = y; }
      });
      return best === null ? maxB + 16 : best;
    };
    // narrow layout: each arrow runs in the left or right gutter; pick sides so spans never partly overlap (which forces a crossing)
    const side = new Map();
    if (!wide) {
      const span = (a) => [Math.min(a.f.idx, a.t.idx), Math.max(a.f.idx, a.t.idx)];
      const clash = (a, b) => { const [p, q] = span(a), [u, v] = span(b); return (p < u && u < q && q < v) || (u < p && p < v && v < q); };
      const placed = { l: [], r: [] };
      arrows.filter((a) => !(Math.abs(a.f.idx - a.t.idx) === 1 && a.f.c === a.t.c))
        .sort((a, b) => (span(b)[1] - span(b)[0]) - (span(a)[1] - span(a)[0]))
        .forEach((a) => {
          let sd = a.t.t >= a.f.b - 1 ? "l" : "r";
          const alt = sd === "l" ? "r" : "l";
          if (placed[sd].some((o) => clash(o, a)) && !placed[alt].some((o) => clash(o, a))) sd = alt;
          placed[sd].push(a); side.set(a, sd);
        });
    }
    arrows.forEach((a) => {
      const S = a.f, T = a.t;
      if (wide) {
        if (S.c === T.c) {
          const below = T.t >= S.b - 1;
          const between = all.some((o) => o !== S && o !== T && o.c === S.c && o.t >= Math.min(S.b, T.b) - 1 && o.b <= Math.max(S.t, T.t) + 1);
          if (!between) { a.kind = "v"; a.sOut = below ? "b" : "t"; a.tIn = below ? "t" : "b"; }
          else { a.kind = "ch"; a.sOut = a.tIn = below ? "r" : "l"; a.ch1 = a.ch2 = below ? S.c + 1 : S.c; }
        } else if (T.c > S.c) { a.kind = "ch"; a.sOut = "r"; a.tIn = "l"; a.ch1 = S.c + 1; a.ch2 = T.c; }
        else { a.kind = "ch"; a.sOut = "l"; a.tIn = "r"; a.ch1 = S.c; a.ch2 = T.c + 1; }
      } else {
        const adjacent = Math.abs(S.idx - T.idx) === 1 && S.c === T.c;
        const below = T.t >= S.b - 1;
        if (adjacent) { a.kind = "v"; a.sOut = below ? "b" : "t"; a.tIn = below ? "t" : "b"; }
        else { a.kind = "gut"; a.sOut = a.tIn = side.get(a) || (below ? "l" : "r"); }
      }
      addPort(S, a.sOut, a, "s"); addPort(T, a.tIn, a, "t");
    });
    // distribute ports along each side, ordered by the far end
    Object.keys(ports).forEach((key) => {
      const [id, side] = key.split("|");
      const b = boxes[id], list = ports[key];
      const other = (p) => (p.end === "s" ? p.arrow.t : p.arrow.f);
      const horiz = side === "t" || side === "b";
      if (horiz || wide) list.sort((p, q) => (horiz ? other(p).cx - other(q).cx : other(p).cy - other(q).cy));
      else {
        // gutter ports: links to boxes above sit on top, links below underneath; within each group the farther link
        // (on the outer lane) takes the port nearer the middle so it never crosses a nearer one
        const grp = (p) => (other(p).cy < b.cy ? 0 : 1);
        list.sort((p, q) => grp(p) - grp(q) || other(q).cy - other(p).cy);
      }
      const n = list.length;
      list.forEach((p, i) => {
        const f = n === 1 ? 0.5 : 0.28 + (0.44 * i) / (n - 1);
        const pt = horiz ? [b.l + (b.r - b.l) * f, side === "t" ? b.t : b.b] : [side === "l" ? b.l : b.r, b.t + Math.min(b.b - b.t, 120) * f];
        if (!horiz && b.b - b.t > 120) pt[1] = b.t + (b.b - b.t) * f;
        p.arrow[p.end === "s" ? "p0" : "p1"] = pt;
      });
    });
    // channel / gutter lane levels
    const segs = [];
    arrows.forEach((a) => {
      if (a.kind === "ch") {
        a.mid = a.ch1 === a.ch2 ? null : freeY(chanX(a.ch1), chanX(a.ch2), (a.p0[1] + a.p1[1]) / 2, Math.min(a.p0[1], a.p1[1]), Math.max(a.p0[1], a.p1[1]));
        if (a.mid === null) { a.v1 = { key: "c" + a.ch1, lo: a.p0[1], hi: a.p1[1], a }; segs.push(a.v1); }
        else { a.v1 = { key: "c" + a.ch1, lo: a.p0[1], hi: a.mid, a }; a.v2 = { key: "c" + a.ch2, lo: a.mid, hi: a.p1[1], a }; segs.push(a.v1, a.v2); }
      } else if (a.kind === "gut") {
        a.v1 = { key: "g" + a.sOut, lo: a.p0[1], hi: a.p1[1], a }; segs.push(a.v1);
      }
    });
    levels(segs.filter((sg) => !sg.a.ext), 6);
    segs.filter((sg) => sg.a.ext).forEach((sg) => { sg.lv = 1 + Math.max(-1, ...segs.filter((o) => o !== sg && !o.a.ext && o.key === sg.key && overlaps(o.lo, o.hi, sg.lo, sg.hi, 6)).map((o) => o.lv)); });
    const nLv = {};
    segs.forEach((s) => { nLv[s.key] = Math.max(nLv[s.key] || 0, s.lv + 1); });
    const segX = (s) => {
      if (s.key[0] === "c") {
        const k = +s.key.slice(1), n = nLv[s.key], step = Math.min(7, 30 / Math.max(1, n));
        return chanX(k) + (s.lv - (n - 1) / 2) * step;
      }
      const n = nLv[s.key], room = s.key === "gl" ? minL - 4 : g.width - maxR - 4;
      const step = Math.min(7, Math.max(3, room / (n + 0.5)));
      return s.key === "gl" ? minL - 9 - s.lv * step : maxR + 9 + s.lv * step;
    };
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", "0 0 " + g.width.toFixed(1) + " " + g.height.toFixed(1));
    const frag = document.createDocumentFragment();
    arrows.forEach((a) => {
      let pts;
      const [x0, y0] = a.p0; const [x1, y1] = a.p1;
      const end = (side) => (side === "l" ? [x1 - HEAD, y1] : side === "r" ? [x1 + HEAD, y1] : side === "t" ? [x1, y1 - HEAD] : [x1, y1 + HEAD]);
      const e = end(a.tIn);
      if (a.kind === "v") {
        const mx = (x0 + e[0]) / 2, my = (y0 + e[1]) / 2;
        pts = Math.abs(x0 - e[0]) < 2 ? [[x0, y0], e] : [[x0, y0], [x0, my], [e[0], my], e];
        void mx;
      } else if (a.kind === "gut") {
        const x = segX(a.v1);
        pts = [[x0, y0], [x, y0], [x, y1], e];
      } else if (a.mid === null) {
        const x = segX(a.v1);
        pts = [[x0, y0], [x, y0], [x, y1], e];
      } else {
        const xa = segX(a.v1), xb = segX(a.v2);
        pts = [[x0, y0], [xa, y0], [xa, a.mid], [xb, a.mid], [xb, y1], e];
      }
      const path = document.createElementNS(SVGNS, "path");
      path.setAttribute("d", rounded(pts, 7));
      if (a.ext) path.setAttribute("class", "ln ext");
      else { path.setAttribute("pathLength", "1"); path.setAttribute("class", "ln"); }
      path.style.setProperty("--k", a.k);
      const hd = document.createElementNS(SVGNS, "path");
      const s = HEAD, w = 4.2;
      let d;
      if (a.tIn === "l") d = `M${x1} ${y1}L${x1 - s} ${y1 - w}L${x1 - s} ${y1 + w}Z`;
      else if (a.tIn === "r") d = `M${x1} ${y1}L${x1 + s} ${y1 - w}L${x1 + s} ${y1 + w}Z`;
      else if (a.tIn === "t") d = `M${x1} ${y1}L${x1 - w} ${y1 - s}L${x1 + w} ${y1 - s}Z`;
      else d = `M${x1} ${y1}L${x1 - w} ${y1 + s}L${x1 + w} ${y1 + s}Z`;
      hd.setAttribute("d", d); hd.setAttribute("class", "hd"); hd.style.setProperty("--k", a.k);
      path.dataset.f = hd.dataset.f = a.f.id; path.dataset.t = hd.dataset.t = a.t.id;
      frag.appendChild(path); frag.appendChild(hd);
    });
    svg.appendChild(frag);
    if (animate && !reduce.matches) {
      svg.classList.remove("go"); svg.classList.add("pre");
      void svg.getBoundingClientRect();
      requestAnimationFrame(() => { svg.classList.remove("pre"); svg.classList.add("go"); });
    } else { svg.classList.remove("pre"); svg.classList.add("go"); }
  };
  const grids = Array.from(document.querySelectorAll(".dg-grid"));
  grids.forEach((grid) => {
    const hl = (id) => {
      grid.classList.toggle("hl", !!id);
      grid.querySelectorAll(".ln, .hd").forEach((p) => p.classList.toggle("on", !!id && (p.dataset.f === id || p.dataset.t === id)));
      grid.querySelectorAll(".dg-box").forEach((b) => b.classList.toggle("on", !!id && b.dataset.b === id));
    };
    grid.querySelectorAll(".dg-box").forEach((b) => {
      b.addEventListener("pointerenter", (ev) => { if (ev.pointerType === "mouse") hl(b.dataset.b); });
      b.addEventListener("pointerleave", () => hl(null));
    });
  });
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver((entries) => entries.forEach((en) => {
      const grid = en.target;
      const w = Math.round(en.contentRect.width);
      if (grid._w === w) return;
      grid._w = w;
      requestAnimationFrame(() => routeDiagram(grid, false));
    }));
    grids.forEach((grid) => ro.observe(grid));
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => grids.forEach((g2) => routeDiagram(g2, false)));

  /* ---------- Project tabs (nothing is remembered across reloads) ---------- */
  document.querySelectorAll('[role="tablist"].ptabs').forEach((list) => {
    const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
    const panels = tabs.map((t) => document.getElementById(t.getAttribute("aria-controls")));
    const select = (i, focus) => {
      tabs.forEach((t, k) => {
        const on = k === i;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const p = panels[k];
        if (!p) return;
        if (on) {
          const was = !p.hidden;
          p.hidden = false;
          if (!was) {
            p.classList.remove("tp-in");
            if (!reduce.matches) { void p.offsetWidth; p.classList.add("tp-in"); }
            const grid = p.querySelector(".dg-grid");
            if (grid) requestAnimationFrame(() => routeDiagram(grid, true));
            p.querySelectorAll(".reveal:not(.in)").forEach((el) => el.classList.add("in", "settled"));
            p.querySelectorAll(".pt-flow:not(.in)").forEach((el) => el.classList.add("in"));
          }
        } else p.hidden = true;
      });
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(i, false));
      t.addEventListener("keydown", (ev) => {
        let n = null;
        if (ev.key === "ArrowRight") n = (i + 1) % tabs.length;
        else if (ev.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
        else if (ev.key === "Home") n = 0;
        else if (ev.key === "End") n = tabs.length - 1;
        if (n !== null) { ev.preventDefault(); select(n, true); }
      });
    });
  });

  /* ---------- Story tab teaser: jump to the Hard problems tab ---------- */
  document.querySelectorAll(".tz-go").forEach((b) => {
    b.addEventListener("click", () => {
      const tab = document.getElementById(b.dataset.tab);
      if (!tab) return;
      tab.click();
      tab.focus({ preventScroll: true });
      const list = tab.closest(".ptabs");
      if (list && list.getBoundingClientRect().top < 0) list.scrollIntoView({ block: "start", behavior: reduce.matches ? "auto" : "smooth" });
    });
  });

  /* ---------- Copy email / phone ---------- */
  const status = document.querySelector(".copy-status");
  document.querySelectorAll("[data-copy]").forEach((b) => {
    const label = b.querySelector(".copy-label");
    const original = label.textContent;
    const what = b.dataset.copyName || "Text";
    b.addEventListener("click", async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(b.dataset.copy); ok = true; } catch (_) { ok = false; }
      label.textContent = ok ? "Copied" : "Press Ctrl+C";
      if (status) status.textContent = ok ? what + " copied" : "Copy failed, select the " + what.toLowerCase() + " to copy it";
      if (!ok) {
        const row = b.closest(".contact-mail");
        const link = row ? row.querySelector(".mail-link") : null;
        const sel = window.getSelection();
        if (link && sel) { const r = document.createRange(); r.selectNodeContents(link); sel.removeAllRanges(); sel.addRange(r); }
      }
      b.classList.add("copied");
      setTimeout(() => { label.textContent = original; b.classList.remove("copied"); if (status) status.textContent = ""; }, 2000);
    });
  });

  /* ---------- Scroll: header state, read progress, active nav + project ---------- */
  const header = document.querySelector(".site-header");
  const prog = document.querySelector(".read-progress i");
  const navLinks = Array.from(document.querySelectorAll("[data-nav]"));
  const navTargets = navLinks.map((a) => document.getElementById(a.dataset.nav));
  const projects = Array.from(document.querySelectorAll(".proj"));
  const piLinks = Array.from(document.querySelectorAll(".pi-link"));
  const psLinks = Array.from(document.querySelectorAll(".ps-link"));
  const psList = document.querySelector(".ps-list");
  let activeProj = -1, activeNav = -1, ticking = false;

  const setProj = (idx) => {
    if (idx === activeProj) return;
    activeProj = idx;
    piLinks.forEach((a, i) => { a.classList.toggle("active", i === idx); if (i === idx) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
    psLinks.forEach((a, i) => { a.classList.toggle("active", i === idx); if (i === idx) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
    const pill = psLinks[idx];
    if (pill && psList && psList.offsetParent !== null) {
      const li = pill.parentElement;
      const target = li.offsetLeft - (psList.clientWidth - li.offsetWidth) / 2;
      psList.scrollTo({ left: Math.max(0, target), behavior: reduce.matches ? "auto" : "smooth" });
    }
  };

  const onScroll = () => {
    ticking = false;
    // reads first
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = doc.scrollHeight - vh;
    const mid = vh * 0.38;
    const navTops = navTargets.map((s) => (s ? s.getBoundingClientRect().top : Infinity));
    const projRects = projects.map((el) => el.getBoundingClientRect());
    // then writes
    header.classList.toggle("scrolled", y > 8);
    if (prog) prog.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ")";
    let n = -1;
    navTops.forEach((t, i) => { if (t <= mid) n = i; });
    if (y >= max - 4) n = navTargets.length - 1;
    if (n !== activeNav) {
      activeNav = n;
      navLinks.forEach((a, i) => { a.classList.toggle("active", i === n); if (i === n) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current"); });
    }
    let p = 0;
    projRects.forEach((r, i) => { if (r.top <= mid) p = i; });
    setProj(p);
    piLinks.forEach((a, i) => {
      const b = a.querySelector(".pi-bar i");
      if (!b) return;
      let f = i < p ? 1 : 0;
      if (i === p) { const r = projRects[p]; f = Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height))); }
      b.style.transform = "scaleY(" + f.toFixed(3) + ")";
    });
  };
  const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue, { passive: true });
  onScroll();
})();
