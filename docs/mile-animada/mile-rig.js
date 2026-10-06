/* mile-rig.js — Mile (Hyto's assistant) as a code-driven SVG character. No dependencies, no paid tools.

   What it is: Mile's real geometry (from mile/v4/gen4.py and v5/gen5.py) split into parts and animated with
   critically-tunable springs plus a small state machine. The same file runs in the app (client component),
   on the static site and, through step()/render(), deterministically inside the Motion video renderer.

   Parts (back to front): aura · chest back (open lid + opening) · pink spark (behind) · Mile (body with a
   bendable tuft, cheek mark, two eyes with lids) · chest front (body, lock, closed lid) · pink spark (front) · fx.

   Usage
     const mile = MileRig.create(hostElement, { chest: 'peek', mood: 'neutral' });
     mile.mood('happy');            // neutral · happy · excited · sad · angry · thinking · worried · surprised · sleepy
     mile.search(); mile.reveal('sad');   // dives into the chest, comes out with the answer
     mile.explode(); mile.poke(); mile.cheer();
     mile.chest('absent' | 'closed' | 'open'); mile.layout('free' | 'peek' | 'out' | 'hidden' | 'tuft');
     mile.look(x, y);               // -1..1, e.g. from the pointer
     mile.tap();                    // tap reaction (giggle, hop, wink, spin, wiggle, sparkle; annoyed / hides after many taps)
     create(el, { interactive: true, onTap: r => … })  // Mile becomes a button: click, touch, Enter/Space
     mile.step(dt); mile.render();  // manual stepping (video renderer); in the browser it runs itself

   Accessibility/performance: honors prefers-reduced-motion (snaps poses, no loops or particles); idle motion
   fades out after `idleSeconds` (WCAG 2.2.2) and wakes on any interaction; pauses when hidden or off-screen.
*/
(function (root) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const COL = { lime: '#B7EE34', limeD: '#8CC21C', navy: '#14162B', nb: '#08090C', pink: '#FA0560', ink: '#050608', inner: '#0E1020', white: '#F2F3F7' };
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rad = d => (d * Math.PI) / 180;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- geometry (ported from gen4.py) ---------- */
  const STAR_D = 'M0,-125 Q42,-42 125,0 Q42,42 0,125 Q-42,42 -125,0 Q-42,-42 0,-125 Z';
  const SPARK_D = 'M0,-10 Q1.5,-1.5 10,0 Q1.5,1.5 0,10 Q-1.5,1.5 -10,0 Q-1.5,-1.5 0,-10Z';
  const LID_D = 'M-110,50 V26 Q-110,-22 -60,-26 Q0,-31 60,-26 Q110,-22 110,26 V50 Z';
  const BACKLID_D = 'M-104,46 L-98,-34 Q-96,-48 -78,-48 H78 Q96,-48 98,-34 L104,46 Z';
  function starPts(r, c, n) {
    const tips = [[0, -r], [r, 0], [0, r], [-r, 0]], ctr = [[c, -c], [c, c], [-c, c], [-c, -c]], pts = [];
    for (let i = 0; i < 4; i++) {
      const a = tips[i], b = tips[(i + 1) % 4], k = ctr[i];
      for (let j = 0; j < n; j++) { const t = j / n, u = 1 - t; pts.push([u * u * a[0] + 2 * t * u * k[0] + t * t * b[0], u * u * a[1] + 2 * t * u * k[1] + t * t * b[1]]); }
    }
    return pts;
  }
  const BASE = starPts(125, 42, 56);
  /* bend the top tip (the tuft): s0 = where the bend starts, th = curl angle at the tip */
  function tuftPath(th) {
    const s0 = 50, p = 3.4, ext = 1.3, taper = 0.85, tip = 125, N = 120;
    const Ls = (tip - s0) * ext, thr = rad(th), cs = [[0, 0, 0]];
    for (let i = 1; i <= N; i++) { const t = (Ls * i) / N, a = thr * Math.pow(t / Ls, p), q = cs[i - 1], dt = Ls / N; cs.push([q[0] + Math.cos(a) * dt, q[1] + Math.sin(a) * dt, a]); }
    let d = '';
    for (let n = 0; n < BASE.length; n++) {
      const px = BASE[n][0], py = BASE[n][1], s = -py;      // u = (0,-1): distance along the tip axis
      let X = px, Y = py;
      if (s > s0) {
        const t = (s - s0) * ext, f = Math.min(t / Ls, 1), i = f * N, i0 = Math.min(Math.floor(i), N - 1), fr = i - i0, A = cs[i0], B = cs[i0 + 1];
        const cu = A[0] + (B[0] - A[0]) * fr, cv = A[1] + (B[1] - A[1]) * fr, a = A[2] + (B[2] - A[2]) * fr, x = px * (1 - (1 - taper) * f);
        X = cv + x * Math.cos(a); Y = -(s0 + cu - x * Math.sin(a));
      }
      d += (n ? 'L' : 'M') + X.toFixed(1) + ',' + Y.toFixed(1);
    }
    return d + 'Z';
  }

  /* ---------- springs ---------- */
  class Ch {
    constructor(v, k, z) { this.x = v; this.v = 0; this.t = v; this.k = k || 170; this.z = z == null ? 0.62 : z; }
    to(t, k, z) { this.t = t; if (k != null) this.k = k; if (z != null) this.z = z; return this; }
    snap(v) { if (v != null) this.t = v; this.x = this.t; this.v = 0; }
    step(h) { const a = -this.k * (this.x - this.t) - 2 * this.z * Math.sqrt(this.k) * this.v; this.v += a * h; this.x += this.v * h; }
  }

  /* ---------- poses ---------- */
  const EN = { tx: 0, ty: -14, bx: 0, by: 14, qx: 0, qy: 0, w: 22, lt: -70, la: 0, lb: 70 };
  const E = o => Object.assign({}, EN, o);
  const ARC = (lift, y, s, w) => E({ tx: -s, ty: y, bx: s, by: y, qx: 0, qy: y - lift - 10, w });
  const MOODS = {
    neutral:   { L: E(), R: E(), tuft: 138, rot: 0, dy: 0, sx: 1, sy: 1, look: [0, 0], aura: 0.32, pink: 0, k: 220, z: 0.55 },
    happy:     { L: ARC(30, 10, 18, 12), R: ARC(30, 10, 18, 12), tuft: 122, rot: 0, dy: -6, sx: 0.98, sy: 1.03, look: [0, 0], aura: 0.55, pink: 0, k: 300, z: 0.38 },
    excited:   { L: ARC(36, 8, 19, 13), R: ARC(36, 8, 19, 13), tuft: 104, rot: 0, dy: -12, sx: 0.97, sy: 1.06, look: [0, 0], aura: 1, pink: 0, k: 330, z: 0.3 },
    sad:       { L: E({ lt: -3, la: -26, ty: -12, by: 15 }), R: E({ lt: -3, la: -26, ty: -12, by: 15 }), tuft: 178, rot: -4, dy: 10, sx: 1.03, sy: 0.95, look: [0, 0.7], aura: 0.12, pink: 0, k: 90, z: 0.9 },
    angry:     { L: E({ lt: -5, la: 32, w: 20, ty: -12, by: 13 }), R: E({ lt: -5, la: 32, w: 20, ty: -12, by: 13 }), tuft: 66, rot: 0, dy: 0, sx: 1.04, sy: 0.97, look: [0, 0.1], aura: 0.2, pink: 0.4, k: 150, z: 0.8 },
    thinking:  { L: E(), R: E({ lt: -8, la: 10, w: 21 }), tuft: 150, rot: 7, dy: -2, sx: 1, sy: 1, look: [0.8, -0.8], aura: 0.3, pink: 0, k: 200, z: 0.6 },
    worried:   { L: E({ lt: -2, la: -30, ty: -12, by: 14 }), R: E({ lt: -2, la: -30, ty: -12, by: 14 }), tuft: 168, rot: -6, dy: 6, sx: 1.01, sy: 0.98, look: [-0.4, 0.5], aura: 0.15, pink: 0.25, k: 160, z: 0.6 },
    surprised: { L: E({ ty: -18, by: 18, w: 24 }), R: E({ ty: -18, by: 18, w: 24 }), tuft: 92, rot: 0, dy: -8, sx: 0.96, sy: 1.08, look: [0, -0.1], aura: 0.5, pink: 0, k: 380, z: 0.35 },
    sleepy:    { L: E({ lt: 9, ty: -10, by: 12 }), R: E({ lt: 9, ty: -10, by: 12 }), tuft: 160, rot: 3, dy: 8, sx: 1.02, sy: 0.97, look: [0, 0.3], aura: 0.1, pink: 0, k: 70, z: 0.95 },
  };
  /* where Mile sits: scale, y, and whether the chest clips her */
  const LAYOUTS = {
    free:   { ms: 0.88, my: 8,   chestPresent: false },
    peek:   { ms: 0.6,  my: 12,  chestPresent: true },    // eyes + tuft above the rim
    low:    { ms: 0.6,  my: 40,  chestPresent: true },    // only the top of her head and tuft
    out:    { ms: 0.62, my: -44, chestPresent: true },    // standing above the chest
    hidden: { ms: 0.6,  my: 146, chestPresent: true },    // fully inside
    tuft:   { ms: 0.6,  my: 4,   chestPresent: true },    // closed chest, only the tuft peeks over the lid
  };
  const EYE_KEYS = ['tx', 'ty', 'bx', 'by', 'qx', 'qy', 'w', 'lt', 'la', 'lb'];
  let UID = 0;

  function el(name, attrs, parent) { const e = document.createElementNS(NS, name); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  const T = (e, v) => { if (e._t !== v) { e._t = v; e.setAttribute('transform', v); } };
  const A = (e, k, v) => { const c = e._a || (e._a = {}); if (c[k] !== v) { c[k] = v; e.setAttribute(k, v); } };

  function create(host, options) {
    const o = Object.assign({ chest: 'peek', mood: 'neutral', seed: 7, aura: true, idleSeconds: Infinity, reduced: null, interactive: false, onTap: null, autostart: true, viewBox: '-240 -240 480 480', title: '' }, options || {});
    const uid = ++UID, rnd = rng(o.seed);
    const reducedMQ = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    const isReduced = () => (o.reduced != null ? o.reduced : !!(reducedMQ && reducedMQ.matches));

    /* ----- DOM ----- */
    const svg = el('svg', { xmlns: NS, viewBox: o.viewBox, width: '100%', height: '100%', 'aria-hidden': 'true', focusable: 'false' });
    svg.style.cssText = 'display:block;overflow:visible';
    const defs = el('defs', null, svg);
    const gA = el('radialGradient', { id: `mg-a${uid}` }, defs); el('stop', { offset: '0', 'stop-color': COL.lime, 'stop-opacity': '.55' }, gA); el('stop', { offset: '1', 'stop-color': COL.lime, 'stop-opacity': '0' }, gA);
    const gP = el('radialGradient', { id: `mg-p${uid}` }, defs); el('stop', { offset: '0', 'stop-color': COL.pink, 'stop-opacity': '.5' }, gP); el('stop', { offset: '1', 'stop-color': COL.pink, 'stop-opacity': '0' }, gP);
    const clip = el('clipPath', { id: `mc-rim${uid}` }, defs); const clipRect = el('rect', { x: -400, y: -400, width: 800, height: 546 }, clip);
    const sceneG = el('g', null, svg);
    const aura = el('ellipse', { cx: 0, cy: 20, rx: 200, ry: 150, fill: `url(#mg-a${uid})` }, sceneG);
    const auraP = el('ellipse', { cx: 0, cy: 20, rx: 200, ry: 150, fill: `url(#mg-p${uid})` }, sceneG);
    if (!o.aura) { aura.style.display = 'none'; auraP.style.display = 'none'; }
    const chestBack = el('g', null, sceneG);          // opening + open lid (behind Mile)
    el('rect', { x: -100, y: 36, width: 200, height: 22, rx: 8, fill: COL.ink }, chestBack);
    const backLid = el('g', null, chestBack);
    el('path', { d: BACKLID_D, fill: COL.inner, stroke: COL.lime, 'stroke-width': 7, 'stroke-linejoin': 'round' }, backLid);
    el('path', { d: 'M-96,40 L-91,-30 H91 L96,40 Z', fill: 'none', stroke: COL.lime, 'stroke-width': 3, opacity: '.25' }, backLid);
    const sparkBack = el('g', null, sceneG);
    const innerG = el('g', { 'clip-path': `url(#mc-rim${uid})` }, sceneG);
    const mileG = el('g', null, innerG), bodyG = el('g', null, mileG);
    const bodyPath = el('path', { fill: COL.lime, stroke: COL.lime, 'stroke-width': 22, 'stroke-linejoin': 'round' }, bodyG);
    const markG = el('g', null, bodyG);
    el('circle', { cx: -72, cy: 28, r: 17, fill: 'none', stroke: COL.limeD, 'stroke-width': 3.5 }, markG);
    const mk = el('g', { transform: 'translate(-73 29) scale(.5)', fill: COL.limeD, stroke: COL.limeD, 'stroke-width': 4, 'stroke-linejoin': 'round' }, markG);
    el('polygon', { points: '-3.4,-16 5.6,-16 -7,14 -16,14' }, mk); el('polygon', { points: '10.7,-9 19.7,-9 10,14 1,14' }, mk);
    const eyesG = el('g', null, bodyG);
    function makeEye(id) {
      const g = el('g', null, eyesG), cid = `mc-e${id}${uid}`;
      el('rect', { x: -30, y: -38, width: 60, height: 66 }, el('clipPath', { id: cid }, defs));
      const path = el('path', { fill: 'none', stroke: COL.navy, 'stroke-linecap': 'round' }, g);
      const lids = el('g', { 'clip-path': `url(#${cid})` }, g);
      return { g, path, top: el('rect', { x: -45, y: -90, width: 90, height: 90, fill: COL.lime }, lids), bot: el('circle', { r: 34, fill: COL.lime }, lids) };
    }
    const eyes = { L: makeEye('L'), R: makeEye('R') };
    const chestFront = el('g', null, sceneG);         // body, lock and closed lid (in front of Mile)
    el('path', { d: 'M-104,50 H104 V128 Q104,150 82,150 H-82 Q-104,150 -104,128 Z', fill: COL.nb, stroke: COL.lime, 'stroke-width': 7, 'stroke-linejoin': 'round' }, chestFront);
    el('rect', { x: 56, y: 53, width: 12, height: 94, fill: COL.lime, opacity: '.9' }, chestFront); el('rect', { x: -68, y: 53, width: 12, height: 94, fill: COL.lime, opacity: '.9' }, chestFront);
    el('rect', { x: -14, y: 50, width: 28, height: 32, rx: 9, fill: COL.lime }, chestFront);
    el('path', { d: 'M0,-10 Q2.5,-2.5 10,0 Q2.5,2.5 0,10 Q-2.5,2.5 -10,0 Q-2.5,-2.5 0,-10Z', fill: COL.nb, transform: 'translate(0 67) scale(.45)' }, chestFront);
    const frontLid = el('g', null, chestFront);
    el('path', { d: LID_D, fill: COL.nb, stroke: COL.lime, 'stroke-width': 7, 'stroke-linejoin': 'round' }, frontLid);
    el('rect', { x: 56, y: -24, width: 12, height: 71, fill: COL.lime, opacity: '.9' }, frontLid); el('rect', { x: -68, y: -24, width: 12, height: 71, fill: COL.lime, opacity: '.9' }, frontLid);
    const lm = el('g', { transform: 'translate(0 16) scale(.62)', fill: COL.lime, stroke: COL.lime, 'stroke-width': 4, 'stroke-linejoin': 'round' }, frontLid);
    el('polygon', { points: '-3.4,-16 5.6,-16 -7,14 -16,14' }, lm); el('polygon', { points: '10.7,-9 19.7,-9 10,14 1,14' }, lm);
    const sparkFrontHost = el('g', null, sceneG);
    const sparkNode = el('g', null, sparkBack);                  // the pink spark; moved between back/front layers
    el('path', { d: STAR_D, fill: COL.pink, stroke: COL.pink, 'stroke-width': 22, 'stroke-linejoin': 'round' }, sparkNode);
    const fxG = el('g', null, sceneG);
    if (o.title) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', o.title); svg.removeAttribute('aria-hidden'); }
    host.appendChild(svg);

    /* ----- channels ----- */
    const ch = {};
    const def = (n, v, k, z) => (ch[n] = new Ch(v, k, z));
    ['L', 'R'].forEach(s => EYE_KEYS.forEach(k => def(`e${s}_${k}`, EN[k], 220, 0.55)));
    def('tuft', 138, 120, 0.3); def('rot', 0, 160, 0.5); def('dy', 0, 170, 0.55); def('sx', 1, 190, 0.45); def('sy', 1, 190, 0.45);
    def('lx', 0, 130, 0.7); def('ly', 0, 130, 0.7); def('aura', 0.32, 40, 1); def('pink', 0, 40, 1); def('blink', 0, 900, 1);
    def('ms', 0.6, 170, 0.6); def('my', 12, 200, 0.55); def('mx', 0, 170, 0.7);
    def('cOn', 1, 150, 0.55); def('cRot', 0, 260, 0.4); def('cDy', 0, 170, 0.6); def('lid', 0, 200, 0.5);
    def('px', 120, 70, 0.55); def('py', -60, 70, 0.55); def('ps', 0.16, 160, 0.5); def('po', 1, 120, 1);
    def('idle', 1, 30, 1); def('shx', 0, 400, 0.3); def('shy', 0, 400, 0.3);

    /* ----- state ----- */
    const S = {
      time: 0, acc: 0, mood: o.mood, layout: o.chest === 'absent' ? 'free' : o.chest === 'closed' ? 'tuft' : 'peek', chestState: o.chest === 'closed' ? 'closed' : o.chest === 'absent' ? 'absent' : 'open',
      mode: 'idle', cmode: 'orbit', th: 1.2, om: 0.9, spin: 0, cfront: true, exploded: false,
      glance: [0, 0], pointer: [0, 0], moodLook: [0, 0], nextBlink: 1.6, nextGlance: 4, nextItem: 0, lastInteract: 0, lastCmode: null, reduced: isReduced(),
      angryUntil: 0, tuftTh: 138, breath: 0, crot: 0,
    };
    const events = []; const P = [];
    const at = (dt, fn) => { events.push({ t: S.time + dt, fn }); events.sort((a, b) => a.t - b.t); };
    const mileX = () => ch.mx.x, mileY = () => ch.my.x + ch.dy.x * ch.ms.x, bodyR = () => ch.ms.x * 136;

    /* ----- mood / layout / chest ----- */
    function snapIfReduced() { if (S.reduced) { chispaStep(0); Object.keys(ch).forEach(k => ch[k].snap()); } }
    function applyMood(name, kz) {
      const m = MOODS[name]; if (!m) return; S.mood = name; S.moodLook = m.look.slice();
      const k = kz ? kz.k : m.k, z = kz ? kz.z : m.z;
      ['L', 'R'].forEach(s => EYE_KEYS.forEach(key => ch[`e${s}_${key}`].to(m[s][key], k, z)));
      ch.tuft.to(m.tuft, 110, 0.28); ch.rot.to(m.rot, 150, 0.5); ch.dy.to(m.dy, 170, 0.5); ch.sx.to(m.sx, 190, 0.45); ch.sy.to(m.sy, 190, 0.45);
      ch.aura.to(m.aura, 40, 1); ch.pink.to(m.pink, 40, 1);
      snapIfReduced();
    }
    function bump(dy, sy) { if (S.reduced) return; ch.dy.v += dy; ch.sy.v += sy; ch.sx.v -= sy * 0.6; }
    function setMood(name) {
      if (!MOODS[name]) return api; wake();
      applyMood(name);
      const impulse = { happy: [-140, 0.5], excited: [-260, 0.9], surprised: [-200, 0.8], sad: [60, -0.4], angry: [0, -0.3], worried: [30, -0.2] }[name];
      if (impulse) bump(impulse[0], impulse[1]);
      if (name === 'angry') { S.angryUntil = S.time + 0.7; }
      chispaFor(name);
      return api;
    }
    function chispaFor(name) {
      const m = { neutral: ['orbit', 0.9], happy: ['orbit', 2.4], excited: ['cheer', 7], sad: ['droop', 0], angry: ['flinch', 0], thinking: ['think', 0], worried: ['hide', 0], surprised: ['orbit', 3.2], sleepy: ['sleep', 0] }[name] || ['orbit', 0.9];
      S.cmode = m[0]; S.om = m[1];
    }
    function setLayout(name, kz) {
      const l = LAYOUTS[name]; if (!l) return api; S.layout = name; wake();
      const k = kz ? kz.k : 200, z = kz ? kz.z : 0.55;
      ch.ms.to(l.ms, k, z); ch.my.to(l.my, k, z); snapIfReduced(); return api;
    }
    function setChest(state) {
      wake(); const prev = S.chestState; S.chestState = state;
      if (state === 'absent') { ch.cOn.to(0, 150, 0.7); ch.lid.to(0, 200, 0.6); if (LAYOUTS[S.layout].chestPresent) setLayout('free', { k: 160, z: 0.6 }); S.cmode = 'orbit'; }
      else {
        if (prev === 'absent') { ch.cOn.to(1, 170, 0.45); if (!LAYOUTS[S.layout].chestPresent) setLayout(state === 'closed' ? 'tuft' : 'peek'); }
        if (state === 'open') { ch.lid.to(1, 210, 0.42); if (!S.reduced) { ch.px.v += 60; ch.py.v -= 160; } }
        if (state === 'closed') { ch.lid.to(0, 230, 0.55); }
      }
      snapIfReduced(); return api;
    }

    /* ----- particles ----- */
    function spawn(kind, x, y, p) {
      if (S.reduced) return;
      const e = el('g', null, fxG);
      if (kind === 'spark') el('path', { d: SPARK_D, fill: p.col || COL.lime }, e);
      else if (kind === 'shard') el('path', { d: SPARK_D, fill: p.col || COL.pink }, e);
      else if (kind === 'dot') el('circle', { r: 5, fill: p.col || COL.pink }, e);
      else if (kind === 'ring') el('circle', { r: 20, fill: 'none', stroke: p.col || COL.pink, 'stroke-width': 5 }, e);
      else if (kind === 'coin') { el('circle', { r: 15, fill: COL.lime }, e); el('circle', { r: 10, fill: 'none', stroke: COL.limeD, 'stroke-width': 3 }, e); }
      else if (kind === 'doc') { el('rect', { x: -12, y: -16, width: 24, height: 32, rx: 5, fill: COL.white }, e); [-8, -1, 6].forEach((yy, i) => el('rect', { x: -6, y: yy, width: i === 2 ? 8 : 12, height: 3.5, rx: 1.75, fill: COL.navy }, e)); }
      P.push(Object.assign({ e, kind, x, y, vx: 0, vy: 0, g: 0, drag: 0, rot: 0, vr: 0, s: 1, s1: 1, life: 0, ttl: 1 }, p));
    }
    function stepParticles(h) {
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i]; p.life += h;
        if (p.life >= p.ttl) { p.e.remove(); P.splice(i, 1); continue; }
        p.vy += p.g * h; const d = Math.exp(-p.drag * h); p.vx *= d; p.vy *= d; p.x += p.vx * h; p.y += p.vy * h; p.rot += p.vr * h;
      }
    }

    /* ----- gestures ----- */
    function wake() { S.lastInteract = S.time; ch.idle.to(1, 60, 1); }
    function explode() {
      wake(); if (S.exploded) return api;
      const x = ch.px.x, y = ch.py.x;
      if (S.reduced) return api;
      S.exploded = true; ch.ps.snap(0); ch.po.snap(0);
      spawn('ring', x, y, { ttl: 0.55, s: 0.4, s1: 3.2, col: COL.pink });
      for (let i = 0; i < 14; i++) { const a = rnd() * 6.283, sp = 170 + rnd() * 260; spawn(i % 3 ? 'shard' : 'dot', x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, g: 260, drag: 2.2, rot: rnd() * 6, vr: (rnd() - 0.5) * 14, s: 1.2 + rnd() * 1.3, s1: 0.2, ttl: 0.65 + rnd() * 0.4, col: i % 4 ? COL.pink : COL.lime }); }
      ch.sy.v += 0.6; ch.dy.v -= 120;
      at(1.0, () => { S.exploded = false; ch.ps.snap(0); ch.po.snap(1); ch.ps.to(0.16 + 0.17 * ch.ms.x - 0.1, 240, 0.3); for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283; spawn('spark', ch.px.x + Math.cos(a) * 6, ch.py.x + Math.sin(a) * 6, { vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, drag: 2, s: 1.1, s1: 0.2, ttl: 0.5, col: COL.pink }); } });
      return api;
    }
    function burst(n, col, speed) { const x = mileX(), y = mileY() - bodyR() * 0.55; for (let i = 0; i < n; i++) { const a = -3.14 + rnd() * 3.14, sp = (speed || 150) * (0.6 + rnd() * 0.7); spawn('spark', x + Math.cos(a) * 40, y + Math.sin(a) * 20, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 140, drag: 1.4, s: 1 + rnd() * 0.9, s1: 0.3, ttl: 0.7 + rnd() * 0.3, col: col || COL.lime, vr: (rnd() - 0.5) * 6 }); } }
    function poke() {
      wake(); if (S.exploded || S.reduced) return api;
      const prev = S.cmode; S.cmode = 'poke';
      ch.lx.to(0, 130, 0.7); at(0.55, () => { ch.sx.v += 0.5; ch.dy.v += 40; ch.sy.v -= 0.4; ch.lx.v += 3; });
      at(0.9, () => { S.cmode = prev === 'poke' ? 'orbit' : prev; });
      return api;
    }
    function cheer() { wake(); S.cmode = 'cheer'; S.om = 7; burst(6, COL.lime, 170); at(1.8, () => { if (S.cmode === 'cheer') { S.cmode = 'orbit'; S.om = 1.6; } }); return api; }
    function search() {
      wake(); S.mode = 'searching'; setChest('open'); S.nextItem = S.time + 0.9;
      ch.sy.to(0.86, 500, 0.6); ch.sx.to(1.06, 500, 0.6);
      at(S.reduced ? 0 : 0.14, () => { applyMood('neutral'); setLayout('hidden', { k: 280, z: 0.85 }); ch.sy.to(1, 200, 0.6); ch.sx.to(1, 200, 0.6); });
      S.cmode = 'peek'; return api;
    }
    function reveal(res) {
      res = MOODS[res] ? res : 'happy'; wake(); S.mode = 'revealing'; ch.cRot.to(0, 220, 0.7); setChest('open');
      const slow = res === 'sad' || res === 'worried';
      at(0, () => { ch.sy.to(0.84, 600, 0.6); ch.sx.to(1.08, 600, 0.6); });
      at(S.reduced ? 0 : 0.14, () => { applyMood('neutral'); setLayout(slow ? 'peek' : 'out', slow ? { k: 80, z: 0.9 } : { k: 240, z: 0.34 }); ch.sy.to(slow ? 1 : 1.14, 300, 0.5); ch.sx.to(slow ? 1 : 0.92, 300, 0.5); });
      at(S.reduced ? 0 : slow ? 0.5 : 0.36, () => {
        ch.sy.to(1, 240, 0.4); ch.sx.to(1, 240, 0.4); setMood(res); S.mode = 'idle'; S.nextBlink = S.time + 1.2;
        if (res === 'happy') { burst(5, COL.lime, 160); cheer(); }
        if (res === 'excited') { burst(8, COL.lime, 210); at(0.5, explode); }
        if (res === 'angry') { S.angryUntil = S.time + 0.8; }
      });
      return api;
    }

    /* ----- tap reactions: varied, with escalation when someone keeps tapping ----- */
    const REACTIONS = ['hey', 'giggle', 'hop', 'wink', 'spin', 'wiggle', 'sparkle'];
    let lastReaction = null;
    function restoreMood(base, dt) { at(dt, () => { if (S.tapBusyUntil <= S.time + 1e-6) { applyMood(base); chispaFor(base); } }); }
    function tap(px, py, force) {
      wake();
      const now = S.time;
      S.taps = (S.taps || []).filter(t => now - t < 1.4); S.taps.push(now);
      const n = S.taps.length;
      if (S.mode !== 'idle') { bump(-80, 0.3); return emit('busy'); }
      const base = S.tapBase && now < S.tapBusyUntil ? S.tapBase : S.mood;
      S.tapBase = base;
      if (S.reduced) {                                   // no motion: a brief happy face, then back
        applyMood(n >= 5 ? 'angry' : 'happy'); S.tapBusyUntil = now + 1.0; restoreMood(base, 1.0); return emit(n >= 5 ? 'annoyed' : 'happy');
      }
      if (px != null && py != null) S.pointer = [clamp(px, -1, 1) * 0.8, clamp(py, -1, 1) * 0.8];
      let r;
      if (force) r = force;
      else if (n >= 8) r = (S.chestState === 'absent') ? 'pop' : 'hide';
      else if (n >= 5) r = 'annoyed';
      else if (n === 1 && !lastReaction) r = 'hey';                   // the first tap is always the brief's 'hey'
      else { const pool = REACTIONS.filter(x => x !== lastReaction); r = pool[Math.floor(rnd() * pool.length)]; }
      lastReaction = r;
      let dur = 0.9;
      if (r === 'hey') {                                 // brief A-20261004: hop max ~12 px, spark spins 360, "hey!" rises
        applyMood('happy'); ch.dy.v -= 150; ch.sy.v += 0.25; S.cmode = 'cheer'; S.om = 6.3;
        heyBubble(); dur = 0.95;
      } else if (r === 'giggle') {                              // squash, happy eyes, little shakes
        applyMood('happy'); bump(-60, -0.5); ch.rot.v += 60; at(0.12, () => { ch.rot.v -= 120; }); at(0.24, () => { ch.rot.v += 80; });
        S.cmode = 'cheer'; S.om = 6; dur = 0.95;
      } else if (r === 'hop') {                          // startled jump, then relief
        applyMood('surprised'); ch.sy.v -= 0.5; at(0.07, () => { ch.dy.v -= 300; ch.sy.v += 0.7; }); at(0.45, () => applyMood('happy')); dur = 1.05;
      } else if (r === 'wink') {                         // one eye closes, tuft flicks
        applyMood('happy'); ch['eL_lt'].to(10, 500, 0.7); ch['eL_w'].to(14, 500, 0.7); ch.tuft.v -= 420; ch.rot.v -= 45; dur = 0.85;
      } else if (r === 'spin') {                         // a full turn with anticipation, a bit dizzy after
        applyMood('surprised'); ch.rot.to(-14, 400, 0.7);
        at(0.12, () => { ch.rot.to(360, 70, 0.55); ch.dy.v -= 120; });
        at(0.95, () => { ch.rot.snap(0); ch.rot.to(0); applyMood('thinking'); S.glance = [0.7, -0.6]; at(0.45, () => { S.glance = [0, 0]; }); });
        dur = 1.5;
      } else if (r === 'wiggle') {                       // ticklish wobble
        applyMood('happy'); S.angryUntil = now + 0.45; ch.sx.v += 0.8; ch.sy.v -= 0.6; dur = 0.8;
      } else if (r === 'sparkle') {                      // the spark answers for Mile: a fast lap and a burst
        applyMood('excited'); S.cmode = 'cheer'; S.om = 9; burst(5, COL.pink, 150); bump(-120, 0.4); dur = 1.0;
      } else if (r === 'annoyed') {                      // too many taps: grumpy shake, spark backs off
        applyMood('angry'); S.angryUntil = now + 0.6; S.cmode = 'flinch'; ch.dy.v += 40; dur = 1.4;
      } else if (r === 'hide') {                         // enough: dives into the chest, closes it, peeks out later
        S.taps = []; applyMood('worried'); setChest('open'); setLayout('hidden', { k: 300, z: 0.8 }); S.cmode = 'peek';
        at(0.35, () => { setChest('closed'); setLayout('tuft', { k: 200, z: 0.7 }); });
        at(2.4, () => { setChest('open'); setLayout('peek', { k: 120, z: 0.6 }); applyMood('sleepy'); });
        at(3.3, () => { applyMood(base); chispaFor(base); });
        S.tapBusyUntil = now + 3.4; return emit('hide');
      } else if (r === 'pop') {                          // no chest to hide in: the spark explodes in protest
        S.taps = []; applyMood('angry'); at(0.2, explode); dur = 1.6;
      }
      S.tapBusyUntil = now + dur;
      at(dur, () => { if (S.cmode === 'cheer' || S.cmode === 'flinch') { S.cmode = 'orbit'; S.om = 0.9; } });
      restoreMood(base, dur);
      return emit(r);
    }
    function heyBubble() {
      if (S.reduced) return;
      const g = el('g', null, fxG), t = el('text', { x: 0, y: 0, 'text-anchor': 'middle', 'font-family': 'Poppins, Arial, sans-serif', 'font-weight': 600, 'font-size': 34, fill: COL.lime }, g);
      t.textContent = o.heyText || 'hey!';
      P.push({ e: g, kind: 'text', x: mileX() + 70 * ch.ms.x, y: mileY() - bodyR() * 1.05, vx: 10, vy: -70, g: 0, drag: 1.2, rot: 0, vr: 0, s: 0.6, s1: 1.05, life: 0, ttl: 0.9 });
    }
    function emit(r) { if (typeof o.onTap === 'function') { try { o.onTap(r); } catch (e) {} } return r; }

    /* ----- behaviors (per sim step) ----- */
    function chispaStep(h) {
      const cx = mileX(), cy = mileY(), R = bodyR(), idle = ch.idle.x, bs = 0.06 + 0.17 * ch.ms.x, t = S.time;
      let tx = cx, ty = cy, ts = bs, front = true, k = 70, po = 1, rot = null;
      const mode = S.cmode;
      if (mode === 'orbit' || mode === 'cheer') {
        S.th += S.om * h * (mode === 'cheer' ? 1 : 0.3 + 0.7 * idle);
        const rx = R + (mode === 'cheer' ? 82 : 52), ry = rx * (mode === 'cheer' ? 0.78 : 0.52), tilt = rad(-10);
        const ex = rx * Math.cos(S.th), ey = ry * Math.sin(S.th);
        tx = cx + ex * Math.cos(tilt) - ey * Math.sin(tilt); ty = cy - R * 0.12 + ex * Math.sin(tilt) + ey * Math.cos(tilt);
        const z = Math.sin(S.th); front = z > 0; ts = bs * (0.88 + 0.28 * z); k = mode === 'cheer' ? 130 : 70;
      } else if (mode === 'poke') { tx = cx - R * 0.55; ty = cy + R * 0.12; ts = bs * 1.05; k = 190; front = true; }
      else if (mode === 'peek') { tx = 76 + Math.sin(t * 7) * 2; ty = 20 + Math.max(0, Math.sin(t * 3.1)) * 12; ts = bs; rot = -28; k = 90; }
      else if (mode === 'droop') { tx = cx + R * 0.82; ty = cy + R * 0.62 + Math.sin(t * 1.6) * 1.5; ts = bs * 0.82; po = 0.75; k = 50; }
      else if (mode === 'think') { tx = cx + R * 0.3; ty = cy - R * 1.08 + Math.sin(t * 2.4) * 2; ts = bs * 0.78; rot = -14; k = 60; }
      else if (mode === 'flinch') { tx = cx + R * 1.75 + Math.sin(t * 38) * (t < S.angryUntil ? 3 : 0); ty = cy - R * 0.62; ts = bs * 0.85; k = 110; }
      else if (mode === 'hide') { tx = cx + R * 0.15; ty = cy + R * 0.05; ts = bs * 0.55; front = false; po = 0.85; k = 60; }
      else if (mode === 'sleep') { tx = cx - R * 0.3; ty = cy - R * 0.95; ts = bs * 0.8; po = 0.6; k = 40; }
      if (mode === 'orbit' || mode === 'cheer') { S.spin += (0.9 + S.om * 0.5) * h; rot = (S.spin * 57.3) % 360; }
      else if (rot == null) rot = 12 + Math.sin(t * 2.2) * 6;
      if (S.exploded) return;
      ch.px.to(tx, k, 0.58); ch.py.to(ty, k, 0.58); ch.ps.to(ts, 160, 0.5); ch.po.to(po, 100, 1);
      S.cfront = front; S.crot = rot;
    }
    function sim(h) {
      S.time += h;
      while (events.length && events[0].t <= S.time) events.shift().fn();
      const t = S.time, idle = ch.idle.x;
      if (!S.reduced) {
        if (t >= S.nextBlink && S.mode !== 'searching') { ch.blink.to(1, 1100, 1); at(0.07, () => ch.blink.to(0, 700, 1)); S.nextBlink = t + 2.4 + rnd() * 3.4; if (rnd() < 0.18) at(0.22, () => { ch.blink.to(1, 1100, 1); at(0.07, () => ch.blink.to(0, 700, 1)); }); }
        if (t >= S.nextGlance && S.mode === 'idle' && S.mood === 'neutral') { S.glance = [(rnd() - 0.5) * 1.5, (rnd() - 0.5) * 0.7]; at(0.9, () => { S.glance = [0, 0]; }); S.nextGlance = t + 4 + rnd() * 5; }
        if (isFinite(o.idleSeconds) && t - S.lastInteract > o.idleSeconds) ch.idle.to(0, 30, 1);
        if (S.mode === 'searching') {
          ch.cRot.to(Math.sin(t * 10) * 3.4, 300, 0.3);
          if (t >= S.nextItem) { const kind = ['coin', 'doc', 'spark'][Math.floor(rnd() * 3)], s = rnd() < 0.5 ? -1 : 1; spawn(kind, s * (10 + rnd() * 40), 30, { vx: s * (40 + rnd() * 90), vy: -(280 + rnd() * 120), g: 700, drag: 0.1, rot: rnd() * 6, vr: (rnd() - 0.5) * 10, s: 1, s1: 1, ttl: 1.1, col: COL.lime }); S.nextItem = t + 0.55 + rnd() * 0.4; ch.cDy.v += 30; }
        } else if (Math.abs(ch.cRot.t) > 0 && S.mode !== 'revealing') ch.cRot.to(0, 200, 0.7);
        if (t < S.angryUntil) { ch.shx.to(Math.sin(t * 52) * 2.4, 900, 0.3); ch.shy.to(Math.cos(t * 47) * 1.4, 900, 0.3); } else { ch.shx.to(0, 400, 0.6); ch.shy.to(0, 400, 0.6); }
      }
      ch.lx.to(S.moodLook[0] + S.glance[0] + S.pointer[0], null, null); ch.ly.to(S.moodLook[1] + S.glance[1] + S.pointer[1], null, null);
      chispaStep(h);
      for (const k in ch) ch[k].step(h);
      stepParticles(h);
      S.breath = Math.sin(t * 2.3) * 1.7 * idle;
    }
    function step(dt) { if (S.reduced) { S.time += dt; while (events.length && events[0].t <= S.time) events.shift().fn(); } S.acc += dt; while (S.acc >= 1 / 240 - 1e-9) { S.acc -= 1 / 240; sim(1 / 240); } return api; }

    /* ----- render ----- */
    function drawEye(side, E) {
      const c = k => ch[`e${side}_${k}`].x, bx = side === 'L' ? -34 : 34, bl = ch.blink.x;
      T(E.g, `translate(${(bx + ch.lx.x * 7).toFixed(2)} ${(-4 + ch.ly.x * 6).toFixed(2)}) scale(1 ${(1 - 0.9 * bl).toFixed(3)})`);
      A(E.path, 'd', `M${c('tx').toFixed(2)} ${c('ty').toFixed(2)} Q${c('qx').toFixed(2)} ${c('qy').toFixed(2)} ${c('bx').toFixed(2)} ${c('by').toFixed(2)}`);
      A(E.path, 'stroke-width', Math.max(1, c('w')).toFixed(2));
      T(E.top, `translate(0 ${c('lt').toFixed(2)}) rotate(${(c('la') * (side === 'L' ? 1 : -1)).toFixed(2)})`);
      A(E.bot, 'cy', (c('lb') + 34).toFixed(2));
    }
    function render() {
      T(sceneG, `translate(${ch.shx.x.toFixed(2)} ${ch.shy.x.toFixed(2)})`);
      A(aura, 'opacity', clamp(ch.aura.x, 0, 1).toFixed(3)); A(auraP, 'opacity', clamp(ch.pink.x, 0, 1).toFixed(3));
      // chest
      const on = clamp(ch.cOn.x, 0, 1.05), L = ch.lid.x;
      const cs = lerp(0.82, 1, on);
      const ct = `translate(0 ${((1 - on) * 190 + ch.cDy.x).toFixed(2)}) translate(0 150) rotate(${ch.cRot.x.toFixed(2)}) scale(${cs.toFixed(3)}) translate(0 -150)`;
      T(chestBack, ct); T(chestFront, ct); chestBack.style.display = chestFront.style.display = on < 0.02 ? 'none' : '';
      const sf = clamp(1 - L / 0.5, 0, 1), sb = clamp((L - 0.5) / 0.5, 0, 1.4);
      T(frontLid, `translate(0 -28) scale(1 ${sf.toFixed(3)}) translate(0 28)`); frontLid.style.display = sf < 0.03 ? 'none' : '';
      T(backLid, `translate(0 46) scale(1 ${sb.toFixed(3)}) translate(0 -46)`); backLid.style.display = sb < 0.02 ? 'none' : '';
      // clip: below the chest floor when a chest is present
      const present = on > 0.5; A(clipRect, 'height', present ? 546 : 800);
      // Mile
      const ms = ch.ms.x, my = mileY() + S.breath, pv = 100;
      T(mileG, `translate(${(mileX() + ch.lx.x * 2).toFixed(2)} ${my.toFixed(2)}) scale(${ms.toFixed(4)})`);
      T(bodyG, `translate(0 ${pv}) rotate(${ch.rot.x.toFixed(2)}) scale(${ch.sx.x.toFixed(4)} ${ch.sy.x.toFixed(4)}) translate(0 ${-pv})`);
      const th = Math.round(ch.tuft.x * 2) / 2; if (th !== S.tuftTh || !bodyPath._a) { S.tuftTh = th; A(bodyPath, 'd', tuftPath(th)); }
      drawEye('L', eyes.L); drawEye('R', eyes.R);
      // pink spark
      const front = S.cfront !== false; const host2 = front ? sparkFrontHost : sparkBack; if (sparkNode.parentNode !== host2) host2.appendChild(sparkNode);
      T(sparkNode, `translate(${ch.px.x.toFixed(2)} ${ch.py.x.toFixed(2)}) rotate(${(S.crot || 0).toFixed(1)}) scale(${Math.max(0, ch.ps.x).toFixed(4)})`); A(sparkNode, 'opacity', clamp(ch.po.x, 0, 1).toFixed(3));
      // particles
      for (const p of P) { const f = p.life / p.ttl, s = lerp(p.s, p.s1, f), a = f < 0.55 ? 1 : 1 - (f - 0.55) / 0.45; T(p.e, `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(p.rot * 57.3).toFixed(0)}) scale(${s.toFixed(3)})`); A(p.e, 'opacity', a.toFixed(2)); }
      return api;
    }

    /* ----- loop ----- */
    let raf = 0, last = 0, running = false, visible = true, io = null;
    function frame(now) { if (!running) return; const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; step(dt); render(); raf = requestAnimationFrame(frame); }
    function start() { if (running || !visible || (typeof document !== 'undefined' && document.hidden)) return api; running = true; last = performance.now(); raf = requestAnimationFrame(frame); return api; }
    function pause() { running = false; cancelAnimationFrame(raf); return api; }
    const onVis = () => (document.hidden ? pause() : start());
    const onMQ = () => { S.reduced = isReduced(); };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
    if (reducedMQ && reducedMQ.addEventListener) reducedMQ.addEventListener('change', onMQ);
    if (typeof IntersectionObserver === 'function' && o.autostart) { io = new IntersectionObserver(es => { visible = es[0].isIntersecting; visible ? start() : pause(); }); io.observe(host); }
    function destroy() { pause(); if (io) io.disconnect(); document.removeEventListener('visibilitychange', onVis); if (reducedMQ && reducedMQ.removeEventListener) reducedMQ.removeEventListener('change', onMQ); svg.remove(); }

    // interactive: Mile is a real button (mouse, touch, keyboard). The app decides what a tap means; Mile only reacts.
    if (o.interactive) {
      svg.setAttribute('role', 'button'); svg.setAttribute('tabindex', '0'); svg.removeAttribute('aria-hidden');
      svg.setAttribute('aria-label', o.title || 'Mile'); svg.style.cursor = 'pointer'; svg.style.touchAction = 'manipulation';
      svg.style.outline = 'none'; svg.style.webkitTapHighlightColor = 'transparent';
      const rel = e => { const b = svg.getBoundingClientRect(); return [((e.clientX - b.left) / b.width - 0.5) * 2, ((e.clientY - b.top) / b.height - 0.5) * 2]; };
      svg.addEventListener('pointerdown', e => { const [x, y] = rel(e); tap(x, y); if (!running) start(); });
      svg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); if (!running) start(); } });
      svg.addEventListener('focus', () => { if (svg.matches(':focus-visible')) { svg.style.outline = '3px solid #B7EE34'; svg.style.outlineOffset = '4px'; svg.style.borderRadius = '24px'; } });
      svg.addEventListener('blur', () => { svg.style.outline = 'none'; });
    }

    const api = { mood: setMood, layout: setLayout, chest: setChest, search, reveal, explode, poke, cheer, burst, tap,
      look(x, y) { S.pointer = [clamp(x, -1, 1) * 0.8, clamp(y, -1, 1) * 0.8]; if (Math.abs(x) + Math.abs(y) > 0.01) wake(); return api; },
      wake, step, render, start, pause, destroy, svg, state: S, ch, at,
      get time() { return S.time; }, get reduced() { return S.reduced; }, set reduced(v) { S.reduced = !!v; },
      snap() { Object.keys(ch).forEach(k => ch[k].snap()); return api; } };

    // initial pose
    applyMood(o.mood); setLayout(S.layout); if (S.chestState === 'absent') { ch.cOn.snap(0); } else { ch.cOn.snap(1); }
    ch.lid.snap(S.chestState === 'open' ? 1 : 0); chispaFor(o.mood); api.snap();
    render(); if (o.autostart) start();
    return api;
  }

  const MileRig = { create, MOODS, LAYOUTS, COL };
  if (typeof module !== 'undefined' && module.exports) module.exports = MileRig; else root.MileRig = MileRig;
})(typeof window !== 'undefined' ? window : globalThis);
