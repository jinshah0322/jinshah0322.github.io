/* The living background: a hand-written WebGL fragment shader (domain-warped noise,
   "liquid light") that swirls around the cursor and drifts with scroll.
   Performance: lazy-initialised after load, low internal resolution, capped DPR,
   30 fps on touch / low-power devices and once you scroll past the hero, paused when the
   tab is hidden. Reduced motion: one static frame. No WebGL: the CSS gradient stays. */
(function () {
  'use strict';

  var canvas = document.getElementById('field');
  if (!canvas) return;
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var lowPower = coarse || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4);

  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FRAG = [
    'precision mediump float;',
    'uniform vec2 u_res;uniform float u_time;uniform vec2 u_mouse;uniform float u_scroll;uniform float u_amt;',
    'uniform vec3 u_bg;uniform vec3 u_c1;uniform vec3 u_c2;uniform vec3 u_c3;',
    'vec2 hash(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453123);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
    ' return mix(mix(dot(hash(i),f),dot(hash(i+vec2(1.,0.)),f-vec2(1.,0.)),u.x),mix(dot(hash(i+vec2(0.,1.)),f-vec2(0.,1.)),dot(hash(i+vec2(1.)),f-vec2(1.)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}',
    'void main(){',
    ' float s=min(u_res.x,u_res.y);',
    ' vec2 uv=gl_FragCoord.xy/u_res;',
    ' vec2 p=(gl_FragCoord.xy-.5*u_res)/s;',
    ' vec2 m=(u_mouse-.5)*u_res/s;',
    ' float t=u_time*.045;',
    ' vec2 d=p-m;float sw=exp(-dot(d,d)*2.6);',
    ' p+=sw*.32*vec2(-d.y,d.x);',
    ' p.y+=u_scroll*1.8;p.x+=u_scroll*.4;',
    ' vec2 q=vec2(fbm(p*1.1+t),fbm(p*1.1+vec2(5.2,1.3)-t));',
    ' vec2 r=vec2(fbm(p*1.3+2.8*q+vec2(1.7,9.2)+t*1.4),fbm(p*1.3+2.8*q+vec2(8.3,2.8)-t*1.1));',
    ' float f=fbm(p+3.*r);',
    ' vec3 col=mix(u_c1,u_c2,clamp((f*f)*4.+.15,0.,1.));',
    ' col=mix(col,u_c3,clamp(length(q)*1.1-.15,0.,1.));',
    ' float body=smoothstep(-.15,.75,f*1.6+.45*length(r));',
    ' float fil=pow(clamp(1.-abs(f*2.2-.25),0.,1.),9.);',
    ' vec3 c=mix(u_bg,col,body*u_amt+sw*.18);',
    ' c+=fil*u_c3*.22*u_amt;',
    ' float v=smoothstep(.35,1.25,length((uv-vec2(.5,.62))*vec2(1.3,1.)));',
    ' c=mix(c,u_bg,v*.85);',
    ' c+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;',
    ' gl_FragColor=vec4(c,1.);',
    '}'
  ].join('\n');

  var PALETTES = {
    dark: { bg: [0.027, 0.027, 0.051], c1: [0.33, 0.20, 0.92], c2: [0.86, 0.20, 0.66], c3: [0.12, 0.72, 0.88], amt: 0.62 },
    light: { bg: [0.945, 0.937, 0.973], c1: [0.66, 0.58, 1.0], c2: [1.0, 0.66, 0.86], c3: [0.55, 0.88, 0.96], amt: 0.62 }
  };

  var gl, prog, u = {}, raf = 0, last = 0, start = 0;
  var mouse = [0.68, 0.62], target = [0.68, 0.62];
  var scroll = 0, scrollTarget = 0, hidden = false, running = false;
  var palette = PALETTES.dark;

  function themeName() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader');
    return sh;
  }

  function setup() {
    try {
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    } catch (e) { gl = null; }
    if (!gl) { root.classList.add('no-webgl'); return false; }
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    } catch (e) { root.classList.add('no-webgl'); gl = null; return false; }
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['u_res', 'u_time', 'u_mouse', 'u_scroll', 'u_amt', 'u_bg', 'u_c1', 'u_c2', 'u_c3'].forEach(function (n) { u[n] = gl.getUniformLocation(prog, n); });
    setPalette();
    resize();
    return true;
  }

  function setPalette() {
    palette = PALETTES[themeName()];
    if (!gl) return;
    gl.uniform3fv(u.u_bg, palette.bg);
    gl.uniform3fv(u.u_c1, palette.c1);
    gl.uniform3fv(u.u_c2, palette.c2);
    gl.uniform3fv(u.u_c3, palette.c3);
    gl.uniform1f(u.u_amt, palette.amt);
  }

  function resize() {
    if (!gl) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var scale = lowPower ? 0.35 : 0.5; // the field is soft, so a low internal resolution is invisible
    var w = Math.max(2, Math.round(window.innerWidth * dpr * scale));
    var h = Math.max(2, Math.round(window.innerHeight * dpr * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.u_res, w, h);
    }
  }

  function draw(now) {
    var t = (now - start) / 1000;
    mouse[0] += (target[0] - mouse[0]) * 0.05;
    mouse[1] += (target[1] - mouse[1]) * 0.05;
    scroll += (scrollTarget - scroll) * 0.08;
    gl.uniform1f(u.u_time, reduce ? 12.0 : t + 12.0);
    gl.uniform2f(u.u_mouse, mouse[0], mouse[1]);
    gl.uniform1f(u.u_scroll, scroll);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now) {
    raf = 0;
    if (hidden) { running = false; return; }
    var pastHero = window.scrollY > window.innerHeight * 1.1;
    var minDt = (lowPower || pastHero) ? 1000 / 30 : 1000 / 60;
    if (now - last >= minDt - 1) { last = now; draw(now); }
    raf = requestAnimationFrame(frame);
  }
  function play() {
    if (reduce || !gl || running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function still() { if (gl) draw(performance.now()); }

  function init() {
    if (!setup()) return;
    start = performance.now();
    scrollTarget = scroll = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    still();
    root.classList.add('field-on');
    play();

    window.addEventListener('resize', function () { resize(); if (reduce) still(); }, { passive: true });
    document.addEventListener('themechange', function () { setPalette(); still(); });
    document.addEventListener('visibilitychange', function () {
      hidden = document.hidden;
      if (!hidden) play();
    });
    if (!reduce) {
      window.addEventListener('pointermove', function (e) {
        target[0] = e.clientX / window.innerWidth;
        target[1] = 1 - e.clientY / window.innerHeight;
      }, { passive: true });
      window.addEventListener('scroll', function () {
        scrollTarget = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      }, { passive: true });
    }
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      cancelAnimationFrame(raf); running = false; gl = null;
      root.classList.remove('field-on');
    });
  }

  // lazy: after the page has painted and the main thread is idle
  function later() {
    if ('requestIdleCallback' in window) requestIdleCallback(init, { timeout: 1200 });
    else setTimeout(init, 300);
  }
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later);
})();
