
const D = __DATA__;
const stage = document.querySelector(".af-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const status = document.querySelector("[data-status]");
const capsule = svg.querySelector('[data-part="capsule"]');
const capBody = capsule.querySelector(".af-cap-body");
const capBand = capsule.querySelector(".af-cap-band");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const T = D.timing;
const ST = D.stations;
const monitors = ST.map((_, i) => svg.querySelector('[data-name="s' + i + '.monitor"]'));
const drawerFront = ST.map((_, i) => svg.querySelector('[data-drawer-front="' + i + '"]'));
const drawerBox = ST.map((_, i) => svg.querySelector('[data-drawer-box="' + i + '"]'));
const smooth01 = (t) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
const ease = (t) => { const x = Math.min(1, Math.max(0, t)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

// ---- the tour, as a list of timed steps built from the model ----
const steps = [];
steps.push({ kind: "gap", dur: T.start, label: "waiting for a message" });
steps.push({ kind: "intro", hop: 0, dur: T.intro, label: "api · new run · rev 0" });
D.hops.forEach((hop, h) => {
  const to = ST[hop.to];
  const length = D.paths[h].length * 0.8;
  steps.push({ kind: "move", hop: h, station: hop.to, dur: T.settle + length / T.speed, label: "→ " + to.queue + " · rev " + hop.rev });
  steps.push({ kind: "work", hop: h, station: hop.to, dur: T.work, label: to.name + " · working · rev " + hop.rev });
  const next = D.hops[h + 1];
  let saved = to.name + " · saved to run";
  if (next && next.sendBack) saved = "critic · fail → rev " + next.rev;
  if (!next) saved = "critic · pass · saved";
  steps.push({ kind: "save", hop: h, station: hop.to, dur: T.save, label: saved });
});
const lastHop = D.hops.length - 1;
steps.push({ kind: "done", hop: lastHop, dur: T.hold, label: "completed · rev " + D.hops[lastHop].rev });
steps.push({ kind: "fade", hop: lastHop, dur: T.fade, label: "completed · rev " + D.hops[lastHop].rev });
let total = 0;
for (const step of steps) { step.t0 = total; total += step.dur; }
const stillStep = steps.findIndex((s) => s.kind === "work" && s.station === 2);

// ---- capsule drawing ----
function pointAt(path, s) {
  const n = path.length - 1;
  const c = Math.min(n, Math.max(0, s));
  const i = Math.min(n - 1, Math.floor(c));
  const f = c - i;
  const a = path[i], b = path[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
function drawCapsule(h, s, fade) {
  const path = D.paths[h];
  const reach = D.capsule.half / 0.8;
  const c = pointAt(path, s);
  const a = pointAt(path, s - reach), b = pointAt(path, s + reach);
  let dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  const half = D.capsule.half * D.KS;
  const w = D.capsule.r * 2 * D.KS;
  const f = (v) => v.toFixed(2);
  capBody.setAttribute("d", "M" + f(c[0] - dx * half) + " " + f(c[1] - dy * half) + "L" + f(c[0] + dx * half) + " " + f(c[1] + dy * half));
  capBody.style.strokeWidth = f(w);
  const off = w * 0.22;
  const nx = dy, ny = -dx;
  const side = ny < 0 ? 1 : -1;
  const bx = c[0] + nx * off * side, by = c[1] + ny * off * side;
  capBand.setAttribute("d", "M" + f(bx - dx * half * 0.7) + " " + f(by - dy * half * 0.7) + "L" + f(bx + dx * half * 0.7) + " " + f(by + dy * half * 0.7));
  capBand.style.strokeWidth = f(w * 0.22);
  capsule.style.opacity = f(c[2] * fade);
}

// ---- drawers: a station files its result before it sends ----
const drawerOpen = ST.map(() => 0);
function setDrawer(i, open) {
  if (Math.abs(drawerOpen[i] - open) < 0.01 && !(open === 0 && drawerOpen[i] !== 0)) return;
  drawerOpen[i] = open;
  drawerFront[i].setAttribute("transform", open > 0.01 ? translateAlong(D.P, [0, open, 0]) : "");
  const box = drawerBox[i];
  if (open <= 0.05) { box.innerHTML = ""; return; }
  const plan = { x: D.cab.x, y: D.cab.y, w: D.cab.w, d: open, r: 0.4 };
  box.innerHTML = solidSvg(slabOf(plan, Number(box.dataset.z), Number(box.dataset.h), D.P, 2), { tone: "lo" });
}

// ---- selection: a station and its inbox ----
let selected = null, pinned = false, current = null;
const items = [...svg.querySelectorAll(".it")];
function select(i, announce = true) {
  if (i === selected) return;
  selected = i;
  svg.toggleAttribute("data-focus", i !== null);
  for (const el of items) {
    const on = i !== null && (el.dataset.station === String(i) || el.dataset.feeds === String(i));
    el.toggleAttribute("data-on", on);
  }
  svg.querySelectorAll("[data-drawer]").forEach((el) => el.toggleAttribute("data-on", i !== null && el.dataset.drawer === String(i)));
  stage.setAttribute("aria-valuenow", String(i ?? 0));
  const text = i === null ? "No station selected" : ST[i].role + " desk, inbox " + ST[i].queue;
  stage.setAttribute("aria-valuetext", text);
  if (announce) status.textContent = i === null ? "" : text + ".";
  write();
}
function queueState(i) {
  if (!current || selected === null) return "";
  if (current.kind === "move" && current.station === i) return "1 queued";
  if ((current.kind === "work" || current.kind === "save") && current.station === i) return "claimed";
  if ((current.kind === "done" || current.kind === "fade") && i === D.hops[lastHop].to) return "done";
  return "empty";
}
function write() {
  let text = current ? current.label : "";
  if (selected !== null) text = ST[selected].queue + " · " + queueState(selected);
  if (readout.textContent !== text) readout.textContent = text;
}

// ---- one frame of the tour at time t ----
let busy = -1;
function setBusy(i) {
  if (i === busy) return;
  if (busy >= 0) monitors[busy].removeAttribute("data-busy");
  busy = i;
  if (busy >= 0) monitors[busy].setAttribute("data-busy", "");
}
function frameAt(t) {
  const step = steps.find((s) => t >= s.t0 && t < s.t0 + s.dur) || steps[steps.length - 1];
  const u = (t - step.t0) / step.dur;
  current = step;
  const end = (h) => D.paths[h].length - 1;
  if (step.kind === "gap") capsule.style.opacity = "0";
  else if (step.kind === "intro") drawCapsule(0, 0, smooth01(u));
  else if (step.kind === "move") drawCapsule(step.hop, ease(u) * end(step.hop), 1);
  else if (step.kind === "fade") drawCapsule(step.hop, end(step.hop), 1 - smooth01(u));
  else drawCapsule(step.hop, end(step.hop), 1);
  setBusy(step.kind === "work" ? step.station : -1);
  ST.forEach((_, i) => {
    let open = 0;
    if (step.kind === "save" && step.station === i) open = D.cab.open * (u < 0.4 ? ease(u / 0.4) : u < 0.62 ? 1 : 1 - ease((u - 0.62) / 0.38));
    setDrawer(i, open);
  });
  write();
}

// ---- loop ----
let clock = 0, frame = 0, last = 0, visible = false;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock = (clock + dt) % total;
  frameAt(clock);
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
function rest() { clock = steps[stillStep].t0 + 0.3; frameAt(clock); }
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
still.addEventListener("change", () => { if (still.matches) rest(); else run(); });

// ---- pointer and keys ----
const stationOf = (target) => {
  const el = target.closest && target.closest("[data-station],[data-feeds]");
  if (!el) return null;
  return Number(el.dataset.station ?? el.dataset.feeds);
};
stage.addEventListener("pointermove", (event) => { if (pinned) return; select(stationOf(event.target)); });
stage.addEventListener("pointerleave", () => { if (!pinned) select(null); });
stage.addEventListener("click", (event) => {
  const i = stationOf(event.target);
  if (i === null) { pinned = false; select(null); return; }
  if (pinned && selected === i) { pinned = false; select(null); return; }
  pinned = true;
  select(i);
});
stage.addEventListener("keydown", (event) => {
  let to;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") to = selected === null ? 0 : Math.min(ST.length - 1, selected + 1);
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") to = selected === null ? ST.length - 1 : Math.max(0, selected - 1);
  else if (event.key === "Home") to = 0;
  else if (event.key === "End") to = ST.length - 1;
  else if (event.key === "Escape") to = null;
  else return;
  event.preventDefault();
  pinned = to !== null;
  select(to);
});

if (still.matches) rest(); else frameAt(0);
