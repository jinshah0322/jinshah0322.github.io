/* Command palette: Ctrl/Cmd + K (or the search button in the header).
   A native <dialog> with an ARIA combobox + listbox: type to filter, arrow keys to move,
   Enter to run, Esc to close. Focus returns to whatever opened it. */
(function () {
  'use strict';

  var dlg = document.getElementById('palette');
  if (!dlg || typeof dlg.showModal !== 'function') {
    document.querySelectorAll('[data-palette-open]').forEach(function (b) { b.hidden = true; });
    return;
  }
  var Site = window.Site = window.Site || {};
  var input = document.getElementById('palette-input');
  var list = document.getElementById('palette-list');
  var opener = null;
  var items = [];
  var active = 0;

  function go(hash) {
    return function () {
      var t = document.querySelector(hash);
      if (!t) return;
      if (Site.scrollTo) Site.scrollTo(t); else t.scrollIntoView();
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      t.focus({ preventScroll: true });
      try { history.replaceState(null, '', hash === '#top' ? location.pathname + location.search : hash); } catch (e) { /* ignore */ }
    };
  }
  function openUrl(url) { return function () { window.open(url, '_blank', 'noopener,noreferrer'); }; }

  function commands() {
    var c = [
      { g: 'Actions', label: 'Copy email address', hint: 'workwithjinayshah@gmail.com', icon: 'i-copy', run: function () { Site.copyEmail && Site.copyEmail(); }, keep: true },
      { g: 'Actions', label: 'Write an email', hint: 'opens your mail app', icon: 'i-mail', run: function () { location.href = 'mailto:' + (Site.EMAIL || 'workwithjinayshah@gmail.com') + '?subject=Project%20enquiry'; } },
      { g: 'Actions', label: 'Toggle light / dark theme', hint: 'theme', icon: 'i-sun', run: function () { Site.toggleTheme && Site.toggleTheme(); } },
      { g: 'Actions', label: 'Open LinkedIn profile', hint: 'new tab', icon: 'i-linkedin', run: openUrl('https://www.linkedin.com/in/shahjinay0322/') },
      { g: 'Actions', label: 'Open GitHub profile', hint: 'new tab', icon: 'i-github', run: openUrl('https://github.com/jinshah0322') },
      { g: 'Go to', label: 'Top', icon: 'i-arrow-up', run: go('#top') },
      { g: 'Go to', label: 'What I can build', icon: 'i-arrow', run: go('#build') },
      { g: 'Go to', label: 'Proof of work', icon: 'i-arrow', run: go('#work') },
      { g: 'Go to', label: 'Stack', icon: 'i-arrow', run: go('#stack') },
      { g: 'Go to', label: 'Experience', icon: 'i-arrow', run: go('#experience') },
      { g: 'Go to', label: 'How I work', icon: 'i-arrow', run: go('#process') },
      { g: 'Go to', label: 'About', icon: 'i-arrow', run: go('#about') },
      { g: 'Go to', label: 'FAQ', icon: 'i-arrow', run: go('#faq') },
      { g: 'Go to', label: 'Contact', icon: 'i-arrow', run: go('#contact') }
    ];
    if (Site.caseList) {
      Site.caseList().forEach(function (k, i) {
        c.push({ g: 'Case studies', label: k.title, hint: String(i + 1).padStart(2, '0'), keys: k.kicker, icon: 'i-spark', run: function () { Site.openCase(k.slug); }, dialog: true });
      });
    }
    return c;
  }

  function score(cmd, q) {
    if (!q) return 1;
    var hay = (cmd.label + ' ' + (cmd.keys || '') + ' ' + cmd.g + ' ' + (cmd.hint || '')).toLowerCase();
    var words = q.toLowerCase().split(/\s+/).filter(Boolean);
    var s = 0;
    for (var i = 0; i < words.length; i++) {
      var at = hay.indexOf(words[i]);
      if (at === -1) return 0;
      s += at === 0 ? 3 : (hay.charAt(at - 1) === ' ' ? 2 : 1);
    }
    return s;
  }

  function render() {
    var q = input.value.trim();
    var all = commands();
    items = all.map(function (c) { return { c: c, s: score(c, q) }; }).filter(function (x) { return x.s > 0; });
    if (q) items.sort(function (a, b) { return b.s - a.s; });
    items = items.map(function (x) { return x.c; });
    list.innerHTML = '';
    if (!items.length) {
      var li = document.createElement('li');
      li.className = 'palette-empty';
      li.setAttribute('role', 'presentation');
      li.textContent = 'No matches. Try "case", "email" or "theme".';
      list.appendChild(li);
      input.removeAttribute('aria-activedescendant');
      return;
    }
    var lastG = null;
    items.forEach(function (c, i) {
      if (!q && c.g !== lastG) {
        var gh = document.createElement('li');
        gh.className = 'palette-group';
        gh.setAttribute('role', 'presentation');
        gh.textContent = c.g;
        list.appendChild(gh);
        lastG = c.g;
      }
      var li = document.createElement('li');
      li.className = 'palette-item';
      li.id = 'pal-opt-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#' + c.icon + '"/></svg><span></span>' + (c.hint ? '<span class="pi-hint"></span>' : '');
      li.children[1].textContent = c.label;
      if (c.hint) li.children[2].textContent = c.hint;
      li.addEventListener('mousemove', function () { if (active !== i) setActive(i, false); });
      li.addEventListener('click', function () { run(i); });
      list.appendChild(li);
    });
    setActive(0, true);
  }

  function setActive(i, scroll) {
    if (!items.length) return;
    active = (i + items.length) % items.length;
    list.querySelectorAll('.palette-item').forEach(function (li) { li.setAttribute('aria-selected', 'false'); });
    var cur = document.getElementById('pal-opt-' + active);
    if (cur) {
      cur.setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', cur.id);
      if (scroll !== false) cur.scrollIntoView({ block: 'nearest' });
    }
  }

  function run(i) {
    var c = items[i];
    if (!c) return;
    close(c.g === 'Actions');
    // let the palette close before acting (focus / scroll / dialog)
    setTimeout(function () { c.run(); }, 30);
  }

  function open() {
    if (dlg.open) return;
    if (Site.closeMenu) Site.closeMenu();
    opener = document.activeElement;
    input.value = '';
    render();
    dlg.showModal();
    if (Site.lenis) Site.lenis.stop();
    input.focus();
  }
  function close(restoreFocus) {
    if (!dlg.open) return;
    dlg.close();
    if (Site.lenis && !document.querySelector('.case-dialog[open]')) Site.lenis.start();
    if (restoreFocus !== false && opener && opener.focus) opener.focus({ preventScroll: true });
  }
  Site.openPalette = open;

  dlg.addEventListener('close', function () { if (Site.lenis && !document.querySelector('.case-dialog[open]')) Site.lenis.start(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
  input.addEventListener('input', render);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(items.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); run(active); }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (dlg.open) close(); else if (!document.querySelector('.case-dialog[open]')) open();
    }
  });
  document.querySelectorAll('[data-palette-open]').forEach(function (b) { b.addEventListener('click', open); });
})();
