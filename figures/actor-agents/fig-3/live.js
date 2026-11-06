const D = __DATA__;
const { P, PATH, MODEL } = D;
const backoff = (n) => (MODEL.backoffBaseMs * 2 ** (n - 1)) / 1000;
const PAUSE_SHOWN = 5; // the 30 s pause runs at 6x speed on the page

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const q = (sel) => svg.querySelector(sel);
const ball = q('[data-part="ball"]');
const slots = Object.fromEntries([...svg.querySelectorAll("[data-slot]")].map((g) => [g.dataset.slot, g]));
const parts = {
  bucket: q('[data-part="bucket"]'),
  trap: q('[data-part="trap"]'),
  div: q('[data-part="div"]'),
  gate: q('[data-part="gate"]'),
  tray: q('[data-part="tray"]'),
  tag: q('[data-part="tag"]'),
  flag: q('[data-part="flag"]'),
  lever: q('[data-part="lever"]'),
  lamp: q('[data-part="lamp"]'),
};
const readout = document.querySelector("[data-readout]");
const status = stage.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

// needles drawn live
const mkNeedle = (tone, width) => {
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("class", "iso-line");
  p.setAttribute("data-tone", tone);
  p.setAttribute("data-free", "start");
  p.setAttribute("style", `stroke-width:${width}`);
  return p;
};
const timerNeedle = mkNeedle("hi", 1.1);
const countNeedle = mkNeedle("hi", 1.1);
const gateNeedle = mkNeedle("hi", 0.8);
const after = (name, node) => { const it = svg.querySelector(`[data-name="${name}"]`); it.after(node); };
after("timer.body", timerNeedle);
after("count.body", countNeedle);
after("gate.house", gateNeedle);
const needle = (cx, cy, z, r, a, tail = 2.6) => lineOnTop([cx - Math.sin(a) * tail, cy + Math.cos(a) * tail], [cx + Math.sin(a) * r, cy - Math.cos(a) * r], z + 0.2, P);

// ---------- state ----------
const S = {
  bucket: 0, // 0 low, 1 top
  trap: { x: 0, v: 0, t: 0 },
  div: { x: 0, v: 0, t: 0 },
  gate: { x: 0, v: 0, t: 0 }, // 1 = closed
  tray: { x: 0, v: 0, t: 0 },
  tag: { x: 0, v: 0, t: 0 },
  flag: { x: 0, v: 0, t: 0 },
  lever: { x: 0, v: 0, t: 0 }, // 0 rest, 1 pulled
  count: { x: 0, v: 0, t: 0 }, // station 0..2
  timer: 0, // seconds on the dial
  gateDial: 0, // seconds of the pause
  lamp: 0,
  pos: PATH.bucketTop.slice(),
  alpha: 0,
  slot: "bucket",
  attempt: 1,
  phase: "",
  dead: false,
  replayed: false,
  pull: false,
  pausedUntil: 0,
  pauseLeft: 0,
};
const settle = (s, dt, tau, calm) => {
  if (calm) { s.x = s.t; s.v = 0; return false; }
  const w = 1 / tau;
  for (let i = 0; i < 4; i++) { s.v += (w * w * (s.t - s.x) - 2 * w * s.v) * (dt / 4); s.x += s.v * (dt / 4); }
  if (Math.abs(s.t - s.x) < 1e-4 && Math.abs(s.v) < 1e-4) { s.x = s.t; s.v = 0; return false; }
  return true;
};

// ---------- motion primitives (generators) ----------
const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ease = (t) => t * t * (3 - 2 * t);
function* roll(points, speed, slot, { accel = false, onAt } = {}) {
  S.slot = slot;
  const segs = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) { const l = len(points[i - 1], points[i]); segs.push([points[i - 1], points[i], total, l]); total += l; }
  const dur = Math.max(0.05, total / speed);
  let t = 0;
  while (t < dur) {
    const dt = yield;
    t = Math.min(dur, t + dt);
    let u = t / dur;
    u = accel ? u * u : (u < 0.15 ? u * u / 0.3 : u > 1 ? 1 : 0.075 + (u - 0.15) * (1 - 0.075) / 0.85);
    const at = u * total;
    for (const [a, b, s0, l] of segs) if (at <= s0 + l + 1e-9) { S.pos = lerp(a, b, l ? (at - s0) / l : 1); break; }
    if (onAt) onAt(S.pos);
  }
  S.pos = points[points.length - 1].slice();
}
function* wait(seconds, each) {
  let t = 0;
  while (t < seconds) { const dt = yield; t += dt; if (each) each(Math.min(1, t / seconds), t); }
}
function* until(test) { while (!test()) yield; }
function* lift(to, seconds) {
  const from = S.bucket;
  yield* wait(seconds, (p) => { S.bucket = from + (to - from) * ease(p); if (S.slot === "bucket") S.pos = [PATH.bucketLow[0], PATH.bucketLow[1], D.BUCKET_LOW + (D.BUCKET_TOP - D.BUCKET_LOW) * S.bucket]; });
}
const say = (text, phase) => {
  if (readout.textContent !== text) readout.textContent = text;
  if (phase && phase !== S.phase) { S.phase = phase; status.textContent = phase; }
};

// ---------- the story of one job ----------
const label = () => (S.replayed ? "replayed (1/1) · " : "");
function* runJob({ fails, pause = false }) {
  S.attempt = 1; S.count.t = 0; S.dead = false;
  S.slot = "bucket"; S.bucket = 1; S.pos = PATH.bucketTop.slice();
  say(`attempt 1/${MODEL.attempts} · queued`, "job queued");
  yield* wait(0.5, (p) => { S.alpha = p; });
  let failed = 0;
  for (;;) {
    // intake: lift top → leg A → leg B (the pause gate holds it here)
    yield* roll([PATH.bucketTop, PATH.aStart, PATH.corner1], 70, "legA");
    S.bucketDown = true;
    if (pause) {
      pause = false;
      S.gate.t = 1;
      S.pausedUntil = PAUSE_SHOWN;
    }
    const gateStop = lerp(PATH.corner1, PATH.bEnd, 0.12);
    yield* roll([PATH.corner1, gateStop], 70, "legB");
    if (S.gate.t > 0.5 || S.pausedUntil > 0) {
      yield* until(() => S.pausedUntil <= 0);
    }
    yield* roll([gateStop, PATH.bEnd, PATH.inside], 70, "legB");
    S.slot = "chamber";
    say(`${label()}attempt ${S.attempt}/${MODEL.attempts} · running`, `attempt ${S.attempt} running`);
    yield* wait(1.4, (p) => { S.lamp = 0.5 - 0.5 * Math.cos(p * Math.PI * 6); });
    S.lamp = 0;
    const ok = failed >= fails;
    if (ok) {
      yield* roll([PATH.inside, PATH.exitPort], 60, "chamber");
      yield* roll([PATH.exitPort, PATH.trap], 60, "outA");
      const t2 = [PATH.trap[0] + 7, PATH.trap[1], PATH.trap[2] - 0.5];
      yield* roll([PATH.trap, t2, PATH.binEdge], 70, "outB");
      yield* roll([PATH.binEdge, [PATH.binRest[0], PATH.binRest[1], PATH.binEdge[2] + 2], PATH.binRest], 60, "bin", { accel: true });
      say(`${label()}done`, "done");
      yield* wait(2.2);
      yield* wait(0.6, (p) => { S.alpha = 1 - p; });
      return;
    }
    failed += 1;
    say(`${label()}failed ${S.attempt}/${MODEL.attempts}`, `attempt ${S.attempt} failed`);
    yield* roll([PATH.inside, PATH.exitPort], 60, "chamber");
    yield* roll([PATH.exitPort, PATH.trap], 60, "outA");
    S.trap.t = 1;
    yield* wait(0.22);
    yield* roll([PATH.trap, PATH.chuteTop], 55, "chute", { accel: true });
    S.trap.t = 0;
    const last = S.attempt >= MODEL.attempts;
    const trip = (p) => { if (!S.tripped && p[0] < D.CNT.x + 4) { S.tripped = true; S.count.t = Math.min(3, S.count.t + 1); if (S.count.t >= MODEL.attempts) S.div.t = 1; } };
    S.tripped = false;
    yield* roll([PATH.chuteTop, PATH.chuteEnd, PATH.corner2], 60, "chute");
    if (last) {
      const turn = [PATH.retEnd[0] + 6, PATH.retEnd[1], PATH.retEnd[2] + 0.4];
      yield* roll([PATH.corner2, turn], 75, "ret", { onAt: trip });
      yield* roll([turn, PATH.trayIn, PATH.trayRest], 45, "ramp");
      S.slot = "tray";
      S.dead = true;
      S.tag.t = 1;
      say(`dead letter · ${MODEL.dlq}`, "dead letter saved to agent.dlq, error, stack and last output kept");
      // wait for the lever: the reader's click, or the tour's own pull
      let waited = 0;
      yield* until(() => { waited += 1 / 60; return S.pull || (touring && waited > (hovering ? 6 : 3.2)); });
      S.pull = false;
      // pull the lever: tray lifts and tips the ball into the bucket
      S.lever.t = 1;
      yield* wait(0.45);
      S.tray.t = 1;
      S.replayed = true;
      S.dead = false;
      S.count.t = 0;
      S.div.t = 0;
      S.flag.t = 1;
      yield* wait(0.5);
      say(`replayed (1/1) · attempt 1/${MODEL.attempts}`, "replayed once, lever locked");
      const p0 = [PATH.trayRest[0], PATH.trayRest[1], PATH.trayRest[2] + 8];
      S.pos = p0;
      yield* roll([p0, [PATH.bucketLow[0], PATH.bucketLow[1] + 10, PATH.bucketLow[2] + 4], PATH.bucketLow], 40, "free");
      S.slot = "bucket";
      S.tag.t = 0;
      S.tray.t = 0;
      S.lever.t = 0.15; // locked short of rest
      S.attempt = 1;
      failed = 0;
      fails = 0;
      yield* wait(0.3);
      yield* lift(1, 1.6);
      continue;
    }
    yield* roll([PATH.corner2, PATH.retEnd], 75, "ret", { onAt: trip });
    yield* roll([PATH.retEnd, PATH.bucketLow], 40, "bucket");
    const b = backoff(S.attempt);
    say(`failed ${S.attempt}/${MODEL.attempts} · wait ${b}s`, `attempt ${S.attempt} failed, backoff ${b} seconds`);
    S.attempt += 1;
    yield* wait(b, (p, t) => { S.timer = t; });
    S.timerReturn = true;
    yield* lift(1, 1.6);
  }
}
function* story() {
  for (;;) {
    S.replayed = false; S.flag.t = 0; S.lever.t = 0; S.div.t = 0;
    yield* runJob({ fails: 3 });
    yield* wait(0.6);
    S.replayed = false; S.flag.t = 0; S.lever.t = 0;
    S.bucket = 1;
    yield* runJob({ fails: 0, pause: true });
    yield* wait(0.8);
  }
}

// ---------- drawing ----------
const tr = (by) => translateAlong(P, by);
let lastLever = -1;
function draw() {
  const off = S.slot === "bucket" ? [0, 0, (D.BUCKET_TOP - D.BUCKET_LOW) * S.bucket] : S.slot === "tray" ? [0, 0, 8 * S.tray.x] : [0, 0, 0];
  ball.setAttribute("transform", tr([S.pos[0] - off[0], S.pos[1] - off[1], S.pos[2] - off[2]]));
  ball.setAttribute("opacity", S.alpha.toFixed(3));
  const host = slots[S.slot] || slots.free;
  if (ball.parentNode !== host) host.appendChild(ball);
  parts.bucket.setAttribute("transform", tr([0, 0, (D.BUCKET_TOP - D.BUCKET_LOW) * S.bucket]));
  parts.trap.setAttribute("transform", tr([9.5 * S.trap.x, 0, 0]));
  parts.div.setAttribute("transform", tr([0, 0, 8 * S.div.x]));
  parts.gate.setAttribute("transform", tr([0, 0, 12 * (1 - S.gate.x)]));
  parts.tray.setAttribute("transform", tr([0, 0, 8 * S.tray.x]));
  parts.tag.setAttribute("transform", tr([0, 0, -9 * (1 - S.tag.x)]));
  parts.flag.setAttribute("transform", tr([0, 0, -6 + 10 * S.flag.x]));
  parts.lamp.setAttribute("opacity", S.lamp.toFixed(3));
  const T = D.TIMER;
  timerNeedle.setAttribute("d", needle(T.x, T.y, T.z, T.r - 4, T.from + Math.min(1, S.timer / T.max) * T.span));
  const C = D.CNT;
  const st = Math.max(0, Math.min(3, S.count.x));
  const ang = C.stations[0] + (C.stations[3] - C.stations[0]) * (st / 3);
  countNeedle.setAttribute("d", needle(C.x, C.y, C.z, C.r - 3.6, ang));
  const g = D.GATE.dial;
  gateNeedle.setAttribute("d", needle(g[0], g[1], g[2], 2.3, -2.2 + 4.4 * Math.min(1, S.gateDial / 30), 0.8));
  if (Math.abs(S.lever.x - lastLever) > 1e-4) { lastLever = S.lever.x; drawLever(S.lever.x); }
}
function drawLever(v) {
  const L = D.LEVER;
  const a = L.rest + (L.pulled - L.rest) * v; // tilt toward +y as it is pulled
  const dir = [0, Math.sin(a), Math.cos(a)];
  const pivot = [L.x, L.y, L.z + 1];
  const F = G.frameAlong(pivot, dir);
  const rod = G.disc(0, L.len, 1.1, F, P, { steps: 16 });
  const tip = G.add3(pivot, G.mul3(dir, L.len + 2.4));
  const knob = G.sphereOf(tip, 3, P);
  const hub = G.disc(-1.8, 1.8, 2.2, G.frameAlong(pivot, [1, 0, 0]), P, { steps: 20 });
  parts.lever.innerHTML = solidSvg(hub, { tone: "mid" }) + solidSvg(rod, { tone: "mid" }) + solidSvg(knob, { tone: "hi", crease: "lo" });
}

// ---------- loop ----------
let frame = 0, last = 0, visible = false, touring = true, hovering = false;
let script = story();
script.next();
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (S.pausedUntil > 0) {
    S.pausedUntil -= dt;
    S.gateDial = Math.min(30, 30 * (1 - S.pausedUntil / PAUSE_SHOWN));
    say(`429 · queue paused ${Math.round(MODEL.rateLimitPauseMs / 1000)}s`, "rate limited, whole queue paused 30 seconds");
    if (S.pausedUntil <= 0) { S.pausedUntil = 0; S.gate.t = 0; }
  } else if (S.gateDial > 0 && S.gate.t === 0) S.gateDial = Math.max(0, S.gateDial - dt * 40);
  if (S.timerReturn) { S.timer = Math.max(0, S.timer - dt * 6); if (!S.timer) S.timerReturn = false; }
  if (S.bucketDown && S.slot !== "bucket") {
    S.bucket = Math.max(0, S.bucket - dt / 1.6);
    if (!S.bucket) S.bucketDown = false;
  }
  if (!calm) script.next(dt);
  for (const key of ["trap", "div", "gate", "tray", "tag", "flag", "count"]) settle(S[key], dt, 0.09, calm);
  settle(S.lever, dt, 0.12, calm);
  draw();
  frame = visible && !calm ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);

// ---------- input ----------
function pullLever() {
  if (still.matches) { stillPose(true); return; }
  if (S.dead) { S.pull = true; run(); return; }
  if (S.replayed) { say("replayed (1/1) · lever locked", "lever locked, already replayed"); S.lever.t = 0.3; setTimeout(() => { if (S.lever.t === 0.3) S.lever.t = 0.15; run(); }, 260); run(); return; }
  say("no dead letter to replay", "no dead letter");
  run();
}
function rateLimit() {
  if (still.matches) return;
  S.gate.t = 1;
  S.pausedUntil = PAUSE_SHOWN;
  run();
}
stage.addEventListener("click", pullLever);
stage.addEventListener("pointerenter", () => { hovering = true; });
stage.addEventListener("pointerleave", () => { hovering = false; });
stage.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); pullLever(); }
  else if (e.key === "p" || e.key === "P") { e.preventDefault(); rateLimit(); }
});
stage.addEventListener("focus", () => { status.textContent = readout.textContent; });

// reduced motion: one still pose (the dead letter), a click shows the replayed result
function stillPose(replayed) {
  S.alpha = 1;
  S.bucket = replayed ? 0 : 0;
  S.count.t = S.count.x = replayed ? 0 : 3;
  S.div.t = S.div.x = replayed ? 0 : 1;
  S.tag.t = S.tag.x = replayed ? 0 : 1;
  S.flag.t = S.flag.x = replayed ? 1 : 0;
  S.lever.t = S.lever.x = replayed ? 0.15 : 0;
  S.tray.t = S.tray.x = 0;
  S.slot = replayed ? "bin" : "tray";
  S.pos = replayed ? PATH.binRest.slice() : PATH.trayRest.slice();
  S.dead = !replayed;
  S.replayed = replayed;
  lastLever = -1;
  say(replayed ? "replayed (1/1) · done" : `dead letter · ${MODEL.dlq}`, replayed ? "replayed once, done" : "dead letter");
  draw();
}
if (still.matches) stillPose(false);
else draw();
still.addEventListener("change", () => { if (still.matches) stillPose(false); else run(); });
