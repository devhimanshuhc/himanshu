// Fig 3: retries, dead letters and replay, drawn as a job-ball retry machine.
// node build.mjs [--light] [--audit]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../_kit/iso-kit.mjs";
import * as G from "../../_kit/lathe.mjs";
import * as A from "../../_kit/audit.mjs";
import { MODEL } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, "..", "..", "_kit");
const THEME = process.argv.includes("--light") ? "light" : "dark";
const OUT = join(HERE, "..", "..", "..", "public", "blog", "actor-based-multi-agent-systems");

const W = 640;
const H = 336;
const PLATE = { x: -160, y: -64, w: 312, d: 136, r: 9 };
const PLATE_H = 10;
const FOOT_H = 5;
const BR = 6; // job ball radius
const FLOOR = 1.6; // track floor thickness
const LIFT = 1.6 + BR; // ball centre above the floor's underside

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-146, 28, 104], [-120, 48, 104], [-44, -58, 90], [34, -8, 78], [146, -52, 30]],
  W,
  H,
  { pad: 14, azimuth: Number(process.env.AZ ?? 70), elevation: 30 },
);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
const f2 = (v) => Math.round(v * 100) / 100;

const R = A.recorder(P);
const record = R.solid;
const put = (name, ref, svg, shapes = [], opts = {}) => R.put({ name, at: ref, bias: opts.bias ?? 0, svg, shapes, piece: "rig", ...(opts.attrs ? { attrs: opts.attrs } : {}) });

// ---------- helpers ----------
function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.6, steps = 3, bevel = 0, extra = "", inner = "", bias = 0, attrs } = {}) {
  const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r };
  const shape = record(A.slab(plan, z0, z1 - z0, { name }, steps));
  put(name, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias, attrs });
  return plan;
}
function post(name, x, y, z0, z1, r = 2.4, style = {}, { extra = "", bias = 0 } = {}) {
  const shape = record(A.cylinder(x, y, r, z0, z1 - z0, { name }));
  put(name, [x, y, (z0 + z1) / 2], S(k.cylinder(x, y, r, z0, z1 - z0, P, 20), { tone: "mid", crease: "none", ...style }) + extra, [shape], { bias });
}
function puck(name, x, y, r, z0, z1, style = {}, { extra = "", bias = 0, steps = 32, bevel = 0.4 } = {}) {
  const shape = record(A.cylinder(x, y, r, z0, z1 - z0, { name }));
  put(name, [x, y, (z0 + z1) / 2], S(k.cylinder(x, y, r, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style }) + extra, [shape], { bias });
}
const frameOn = (a, b) => {
  const ax = G.unit3(G.sub3(b, a));
  const u = G.unit3(G.cross3([0, 0, 1], ax));
  const v = G.cross3(ax, u);
  return { o: a, a: ax, u, v, len: G.len3(G.sub3(b, a)) };
};
const rect = (u0, u1, v0, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

// A trough leg: ball centre runs from a to b. Floor plus two lips; the near lip is its own item so the ball sits between.
const LEGS = {};
function leg(name, a, b, { width = 13, lip = 4.4, ext = [0, 0], style = {} } = {}) {
  const F0 = frameOn(a, b);
  const o = G.sub3(a, G.mul3(F0.v, LIFT));
  const F = { o, a: F0.a, u: F0.u, v: F0.v };
  const s0 = -ext[0];
  const s1 = F0.len + ext[1];
  const hw = width / 2;
  const nearSign = G.dot3(F.u, V) > 0 ? 1 : -1;
  const floorPoly = rect(-hw, hw, 0, FLOOR);
  const lipPoly = (sign) => (sign > 0 ? rect(hw - 1.3, hw, FLOOR, FLOOR + lip) : rect(-hw, -hw + 1.3, FLOOR, FLOOR + lip));
  const mid = G.add3(o, G.mul3(F.a, (s0 + s1) / 2));
  const floorShape = record(A.prism(F, floorPoly, s0, s1, { name: `${name}.floor` }));
  const farShape = record(A.prism(F, lipPoly(-nearSign), s0, s1, { name: `${name}.far` }));
  const nearShape = record(A.prism(F, lipPoly(nearSign), s0, s1, { name: `${name}.near` }));
  const groove = Ln(path3([G.add3(o, G.add3(G.mul3(F.a, s0), G.mul3(F.v, FLOOR + 0.02))), G.add3(o, G.add3(G.mul3(F.a, s1), G.mul3(F.v, FLOOR + 0.02)))]), { tone: "faint" });
  put(`${name}.floor`, G.add3(mid, G.mul3(F.u, 0)), S(G.prismOf(F, floorPoly, s0, s1, P), { tone: "mid", ...style }) + groove, [floorShape]);
  put(`${name}.far`, G.add3(mid, G.mul3(F.u, -nearSign * hw)), S(G.prismOf(F, lipPoly(-nearSign), s0, s1, P), { tone: "mid", ...style }), [farShape]);
  put(`${name}.near`, G.add3(mid, G.mul3(F.u, nearSign * hw)), S(G.prismOf(F, lipPoly(nearSign), s0, s1, P), { tone: "mid", ...style }), [nearShape], { bias: 0.5 });
  LEGS[name] = { a, b, F, s0, s1, under: (s) => G.add3(o, G.mul3(F.a, s)) };
  return LEGS[name];
}

// ---------- world layout ----------
const LIFT_XY = [-128, 38];
const BUCKET_LOW = 11; // ball centre at the bottom stop
const BUCKET_TOP = 86;
const CH = { x0: -40, x1: 30, y0: -54, y1: -8, shelf: 40, top: 70 };
const BALL_Y = -19;
const PATH = {
  bucketTop: [LIFT_XY[0], LIFT_XY[1], BUCKET_TOP],
  aStart: [LIFT_XY[0], 30, BUCKET_TOP - 1],
  corner1: [LIFT_XY[0], BALL_Y, 79],
  bEnd: [CH.x0 - 4, BALL_Y, CH.shelf + BR + 1],
  inside: [-6, BALL_Y, CH.shelf + BR],
  exitPort: [CH.x1 + 2, BALL_Y, CH.shelf + BR],
  trap: [62, BALL_Y, CH.shelf + BR - 2.2],
  binEdge: [116, BALL_Y, CH.shelf + BR - 6.4],
  chuteTop: [62, BALL_Y, 27],
  chuteEnd: [62, 32, 18.4],
  corner2: [62, 38, 18],
  retEnd: [-114, 38, 11.6],
  bucketLow: [LIFT_XY[0], LIFT_XY[1], BUCKET_LOW],
  trayIn: [-114, 50, 9],
  trayRest: [-127, 59, 8.4],
  binRest: [126, BALL_Y, 9],
};

// ---------- base ----------
record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", ground: true }, 8));
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
{
  const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    back.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    back.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  back.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(PLATE, -4, P, 8), { tone: "faint" }) }));
  back.push(Ln(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  back.push(Ln(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  back.push(Dots(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler strip along the front edge, right of the tray
  const strip = { x: -60, y: PLATE.y + PLATE.d - 14, w: 190, d: 6.5, r: 1 };
  back.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  back.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
  back.push(Dots([at([strip.x + 2, strip.y + 3.2, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.2, 0.6])], { size: 0.45 }));
}

// ---------- processing chamber (the agent's worker) ----------
box("ch.pedestal", [CH.x0 - 5, CH.y0 - 3, 0], [CH.x1 + 5, CH.y1 + 4, 8], { tone: "lo" }, { r: 2, steps: 4, bevel: 0.8 });
box("ch.back", [CH.x0, CH.y0, 8], [CH.x1, -40, CH.top], { tone: "mid" }, { r: 1, steps: 3 });
{
  // lower front panel: closed vent slots, four screws
  const fy = CH.y1 - 2 + 0.02;
  const vents = [];
  for (let i = 0; i < 7; i++) { const x = CH.x0 + 14 + i * 6.4; vents.push(path3([[x, fy, 16], [x + 2, fy, 16], [x + 2, fy, 32], [x, fy, 32]], true)); }
  const screws = [[CH.x0 + 9, 12], [CH.x1 - 9, 12], [CH.x0 + 9, 36], [CH.x1 - 9, 36]].map(([x, z]) => at([x, fy, z]));
  box("ch.shelf", [CH.x0 + 6, -40, 8], [CH.x1 - 6, CH.y1 - 2, CH.shelf], { tone: "mid" }, { r: 0.5, steps: 2, extra: Ln(vents.join(""), { tone: "lo" }) + Dots(screws, { size: 0.45 }) });
}
// rails on the shelf the ball rolls on
box("ch.rail.far", [CH.x0 + 6, BALL_Y - 4, CH.shelf], [CH.x1 - 6, BALL_Y - 2.6, CH.shelf + 0.01], { tone: "lo", flat: true }, { r: 0.2, steps: 2 });
box("ch.wall.left", [CH.x0, -40, 8], [CH.x0 + 6, CH.y1, CH.top], { tone: "mid" }, { r: 0.6, steps: 3 });
const portRing = Ln(k.sideRing([CH.x1, BALL_Y, CH.shelf + BR], 6.4, "x", P, 40), { tone: "lo" }) + Ln(k.sideRing([CH.x1, BALL_Y, CH.shelf + BR], 8, "x", P, 40), { tone: "faint" });
{
  // vent slots on the right wall's outer face: closed thin outlines
  const slots = [];
  for (let i = 0; i < 4; i++) {
    const z = 50 + i * 4.2;
    const y0 = BALL_Y - 13, y1 = BALL_Y + 5;
    slots.push(path3([[CH.x1 + 0.02, y0, z], [CH.x1 + 0.02, y1, z], [CH.x1 + 0.02, y1, z + 1.6], [CH.x1 + 0.02, y0, z + 1.6]], true));
  }
  box("ch.wall.right", [CH.x1 - 6, -40, 8], [CH.x1, BALL_Y + 6.6, CH.top], { tone: "mid" }, { r: 0.6, steps: 3, extra: portRing + Ln(slots.join(""), { tone: "lo" }) });
  box("ch.wall.right.front", [CH.x1 - 6, BALL_Y + 6.6, 8], [CH.x1, CH.y1, CH.top], { tone: "mid" }, { r: 0.6, steps: 3 });
}
box("ch.sill", [CH.x0 + 6, CH.y1 - 5, CH.shelf], [CH.x1 - 6, CH.y1, CH.shelf + 3], { tone: "mid" }, { r: 0.4, steps: 2 });
box("ch.lintel", [CH.x0 + 6, CH.y1 - 5, 63], [CH.x1 - 6, CH.y1, CH.top], { tone: "mid" }, { r: 0.4, steps: 2, extra: Dots([at([CH.x0 + 10, CH.y1, 65]), at([CH.x1 - 10, CH.y1, 65])], { size: 0.45 }) });
{
  // glass pane in the window, with a faint glare
  const gy = CH.y1 - 2.5;
  const pane = path3([[CH.x0 + 6, gy, CH.shelf + 3], [CH.x1 - 6, gy, CH.shelf + 3], [CH.x1 - 6, gy, 63], [CH.x0 + 6, gy, 63]], true);
  const glare = path3([[CH.x0 + 12, gy, 46], [CH.x0 + 17, gy, 46], [CH.x0 + 27, gy, 58], [CH.x0 + 22, gy, 58]], true);
  put("ch.glass", [-5, gy, 50], `<path class="rt-glass" d="${pane}"/><path class="rt-glare" d="${glare}"/>`, [record(A.box([CH.x0 + 6, gy - 0.1, CH.shelf + 3], [CH.x1 - 6, gy + 0.1, 63], { name: "ch.glass" }))], { bias: 2 });
}
box("ch.cap", [CH.x0 - 2, CH.y0 - 2, CH.top], [CH.x1 + 2, CH.y1 + 1, CH.top + 5], { tone: "mid" }, { r: 1.6, steps: 4, bevel: 0.8 });
{
  // label plate on the cap
  const plan = { x: -30, y: -30, w: 20, d: 12, r: 1 };
  const z = CH.top + 5;
  const rules = [0, 1, 2].map((i) => k.lineOnTop([plan.x + 3, plan.y + 3.2 + i * 2.8], [plan.x + 3 + [13, 10, 7][i], plan.y + 3.2 + i * 2.8], z + 0.6, P)).join("");
  box("ch.label", [plan.x, plan.y, z], [plan.x + plan.w, plan.y + plan.d, z + 0.6], { tone: "lo", crease: "none" }, { r: 1, steps: 3, extra: Ln(rules, { tone: "lo", free: true }) + Dots([at([plan.x + 1.6, plan.y + 6, z + 0.6]), at([plan.x + plan.w - 1.6, plan.y + 6, z + 0.6])], { size: 0.4 }) });
}
// status lamp: collar, lens and a lit grid while the job runs
puck("ch.lamp.base", 12, -30, 6, CH.top + 5, CH.top + 8, { tone: "mid" });
puck("ch.lamp.lens", 12, -30, 4.4, CH.top + 8, CH.top + 13, { tone: "hi" }, {
  extra: `<g data-part="lamp" opacity="0">${Dots(k.dotGrid(9.6, -32.4, 3, 3, 2.4, CH.top + 13, P), { size: 0.55, tone: "hi" })}</g>` + Ln(k.ring(12, -30, 3.2, CH.top + 13, P, 24), { tone: "lo" }),
});

// ---------- intake: lift top → leg A → corner → leg B → chamber ----------
// a flat landing where two troughs meet, with lips on its two outer sides
function landing(name, c, outer) {
  const zb = c[2] - LIFT, zt = zb + FLOOR;
  box(`${name}`, [c[0] - 6.5, c[1] - 6.5, zb - 1.2], [c[0] + 6.5, c[1] + 6.5, zt], { tone: "mid" }, { r: 0.8, steps: 3, bevel: 0.3 });
  for (const [dx, dy] of outer) {
    const x0 = dx < 0 ? c[0] - 6.5 : dx > 0 ? c[0] + 5.2 : c[0] - 6.5;
    const x1 = dx < 0 ? c[0] - 5.2 : dx > 0 ? c[0] + 6.5 : c[0] + 6.5;
    const y0 = dy < 0 ? c[1] - 6.5 : dy > 0 ? c[1] + 5.2 : c[1] - 6.5 + (outer.some(([, e]) => e < 0) ? 1.3 : 0);
    const y1 = dy < 0 ? c[1] - 5.2 : dy > 0 ? c[1] + 6.5 : c[1] + 6.5 - (outer.some(([, e]) => e > 0) ? 1.3 : 0);
    box(`${name}.lip${dx}${dy}`, [x0, y0, zt], [x1, y1, zt + 4.4], { tone: "mid" }, { r: 0.3, steps: 2 });
  }
  return zb - 1.2;
}
const C1 = PATH.corner1;
const legA = leg("in.a", PATH.aStart, [C1[0], C1[1] + 6.5, C1[2]], { ext: [3, 0] });
const legB = leg("in.b", [C1[0] + 9.6, C1[1], C1[2] - 0.6], PATH.bEnd, { ext: [0, 4] });
const c1Bottom = landing("in.corner", C1, [[0, -1], [-1, 0]]);
for (const [name, L, s] of [["in.post.a", legA, 26], ["in.post.c", null, 0], ["in.post.b1", legB, 26], ["in.post.b2", legB, 60]]) {
  const p = L ? L.under(s) : [C1[0], C1[1], c1Bottom];
  const zTop = L ? p[2] - 2.2 * Math.abs(L.F.a[2]) / Math.hypot(L.F.a[0], L.F.a[1]) - 0.03 : p[2] - 0.05;
  puck(`${name}.foot`, p[0], p[1], 4.4, 0, 2, { tone: "lo" }, { steps: 24 });
  post(name, p[0], p[1], 2, zTop, 2.2, { tone: "mid" }, { extra: Ln(k.sideArc(p[0], p[1], 2.2, 6, P, 12), { tone: "faint" }) });
}
// 429 pause gate on leg B: a housing on the far side and a gate plate that drops into the trough
const GATE = { s: 22 };
{
  const c = G.add3(legB.under(GATE.s), [0, 0, 0]);
  const zf = c[2] + FLOOR;
  const hy0 = c[1] - 13.5, hy1 = c[1] - 7;
  const gd = [c[0], (hy0 + hy1) / 2, zf + 20];
  const gt = k.radialTicks(gd[0], gd[1], 2.9, 6, 3, gd[2] + 0.01, [0.7, 1.2], P, -2.2, 4.4);
  box("gate.house", [c[0] - 4, hy0, 0], [c[0] + 4, hy1, zf + 20], { tone: "mid" }, { r: 0.8, steps: 3, bevel: 0.4, inner: Ln(k.sideSeam({ x: c[0] - 4, y: hy0, w: 8, d: hy1 - hy0, r: 0.8 }, zf - 2, P, 3), { tone: "faint" }), extra: Ln(k.ring(gd[0], gd[1], 2.9, gd[2] + 0.01, P, 24), { tone: "lo" }) + Ln(gt.minor, { tone: "lo" }) + Ln(gt.major, { tone: "mid" }) });
  // small pause dial on its top: 0..30 s
  const d = [c[0], (hy0 + hy1) / 2, zf + 20];
  GATE.dial = d;
  GATE.zf = zf;
  GATE.c = c;
  const ticks = k.radialTicks(d[0], d[1], 2.9, 6, 3, d[2] + 0.01, [0.7, 1.2], P, -2.2, 4.4);

}
// ---------- the lift (worker re-queue) with backoff timer ----------
const LX = LIFT_XY[0], LY = LIFT_XY[1];
box("lift.base", [LX - 14, LY - 8.5, 0], [LX + 7, LY + 8.5, 6], { tone: "lo" }, { r: 1.2, steps: 3, bevel: 0.6, extra: Dots([at([LX - 11, LY - 6, 6]), at([LX + 4.5, LY - 6, 6]), at([LX - 11, LY + 6, 6]), at([LX + 4.5, LY + 6, 6])], { size: 0.45 }) });
box("lift.spine", [LX - 14, LY - 8, 6], [LX - 10, LY + 8, 98], { tone: "mid" }, { r: 0.6, steps: 2, inner: Ln(k.sideSeam({ x: LX - 14, y: LY - 8, w: 4, d: 16, r: 0.6 }, 50, P, 2), { tone: "faint" }) });
for (const y of [LY - 7.5, LY + 5.5]) box(`lift.rail${y > LY ? ".near" : ".far"}`, [LX - 10, y, 6], [LX - 8, y + 2, 98], { tone: "mid" }, { r: 0.3, steps: 2 });
box("lift.head", [LX - 15, LY - 10, 98], [LX + 6, LY + 10, 104], { tone: "mid" }, { r: 1.4, steps: 3, bevel: 0.6 });
puck("lift.pulley", LX - 2, LY, 4.2, 104, 106.4, { tone: "mid" }, { extra: Ln(k.ring(LX - 2, LY, 1.2, 106.4, P, 16), { tone: "lo" }) });
// motor box on the base, behind the spine
box("lift.motor", [LX - 24, LY - 7, 0], [LX - 14, LY + 7, 14], { tone: "mid" }, { r: 1, steps: 3, bevel: 0.4, extra: Dots([at([LX - 14, LY - 4, 11]), at([LX - 14, LY + 4, 11])], { size: 0.4 }) });
// timer dial: 0..4 s, needle sweeps 2 s after the 1st failure and 4 s after the 2nd
const TIMER = { x: -100, y: 16, r: 11, z: 18, from: -2.1, span: 4.2, max: 4 };
box("timer.stand", [TIMER.x - 6, TIMER.y - 6, 0], [TIMER.x + 6, TIMER.y + 6, TIMER.z - 6], { tone: "lo" }, { r: 1.4, steps: 3, bevel: 0.5 });
puck("timer.body", TIMER.x, TIMER.y, TIMER.r, TIMER.z - 6, TIMER.z, { tone: "hi", crease: "lo" }, {
  steps: 64,
  bevel: 0.6,
  extra: (() => {
    const t = k.radialTicks(TIMER.x, TIMER.y, TIMER.r - 2.2, 16, 4, TIMER.z, [1.1, 2.4], P, TIMER.from, TIMER.span);
    const rim = TIMER.r - 2.2;
    return Ln(k.knurl(TIMER.x, TIMER.y, TIMER.r, TIMER.z - 2.6, TIMER.z, 64, P, 0.3), { tone: "lo" }) +
      Ln(k.ring(TIMER.x, TIMER.y, rim, TIMER.z, P, 64), { tone: "lo" }) + Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }) +
      Dots([2, 4].map((s) => { const a = TIMER.from + (s / TIMER.max) * TIMER.span; return at([TIMER.x + Math.sin(a) * (rim - 4), TIMER.y - Math.cos(a) * (rim - 4), TIMER.z]); }), { size: 0.55, tone: "hi" }) +
      Ln(k.ring(TIMER.x, TIMER.y, 1.4, TIMER.z, P, 16), { tone: "mid" });
  })(),
});
box("timer.crown", [TIMER.x + TIMER.r - 0.2, TIMER.y - 1.8, TIMER.z - 4.6], [TIMER.x + TIMER.r + 3, TIMER.y + 1.8, TIMER.z - 1.4], { tone: "mid" }, { r: 0.6, steps: 2 });

// ---------- exit trough, trapdoor, done bin ----------
const legX1 = leg("out.a", PATH.exitPort, PATH.trap, { ext: [1.9, 0] });
const legX2 = leg("out.b", [PATH.trap[0] + 7, PATH.trap[1], PATH.trap[2] - 0.5], PATH.binEdge, { ext: [0, 2] });
{
  const p1 = legX1.under(16), p2 = legX2.under(32);
  for (const [name, p] of [["out.post1", p1], ["out.post2", p2]]) {
    puck(`${name}.foot`, p[0], p[1], 4.4, 0, 2, { tone: "lo" }, { steps: 24 });
    post(name, p[0], p[1], 2, p[2] - 2.2 * 0.12 - 0.05, 2.2, { tone: "mid" }, { extra: Ln(k.sideArc(p[0], p[1], 2.2, 10, P, 12), { tone: "faint" }) });
  }
}
// trapdoor: a slide plate that runs out toward +x... drawn as its own item, moved live
const TRAP = { x0: PATH.trap[0] - 3.5, x1: PATH.trap[0] + 7, y0: BALL_Y - 6.5, y1: BALL_Y + 6.5, z: PATH.trap[2] - LIFT - 0.4 };
// done bin
const BIN = { x0: 108, x1: 144, y0: -48, y1: -4, z1: 30 };
box("bin.floor", [BIN.x0, BIN.y0, 0], [BIN.x1, BIN.y1, 3], { tone: "lo" }, { r: 1.6, steps: 3 });
box("bin.wall.back", [BIN.x0, BIN.y0, 3], [BIN.x1, BIN.y0 + 2, BIN.z1], { tone: "mid" }, { r: 0.4, steps: 2 });
box("bin.wall.left", [BIN.x0, BIN.y0 + 2, 3], [BIN.x0 + 2, BIN.y1, BIN.z1], { tone: "mid" }, { r: 0.4, steps: 2 });
box("bin.wall.right", [BIN.x1 - 2, BIN.y0 + 2, 3], [BIN.x1, BIN.y1, BIN.z1], { tone: "mid" }, { r: 0.4, steps: 2, extra: Dots([at([BIN.x1, -40, 26]), at([BIN.x1, -12, 26])], { size: 0.45 }) });
box("bin.wall.front", [BIN.x0 + 2, BIN.y1 - 2, 3], [BIN.x1 - 2, BIN.y1, BIN.z1 - 8], { tone: "mid" }, { r: 0.4, steps: 2, inner: "" });
// a few finished jobs already in the bin
const DONE_BALLS = [[118, -40], [128, -38], [123, -31], [136, -40]];

// ---------- drop chute (failures) and the return track along the front ----------
const legC = leg("chute", PATH.chuteTop, [PATH.corner2[0], PATH.corner2[1] - 6.5, PATH.corner2[2]], { ext: [6, 0] });
const C2 = PATH.corner2;
const c2Bottom = landing("ret.corner", C2, [[0, 1], [1, 0]]);
const legR = leg("ret", [C2[0] - 6.5, C2[1], C2[2]], PATH.retEnd, { ext: [0, 2] });
{
  const pc = legC.under(26);
  const posts = [["chute.post", pc], ["ret.post1", legR.under(40)], ["ret.post2", legR.under(108)], ["ret.post3", legR.under(160)], ["ret.post.c", [C2[0], C2[1], c2Bottom]]];
  for (const [name, p] of posts) {
    puck(`${name}.foot`, p[0], p[1], 4, 0, 2, { tone: "lo" }, { steps: 24 });
    post(name, p[0], p[1], 2, p[2] - 0.05, 2, { tone: "mid" });
  }
}
// attempt counter beside the return track: three stations, ticked by a trip finger the ball brushes
const CNT = { x: -40, y: 14, r: 10, z: 20, stations: [-1.2, -0.4, 0.4, 1.2] };
box("count.stand", [CNT.x - 6, CNT.y - 6, 0], [CNT.x + 6, CNT.y + 6, CNT.z - 6], { tone: "lo" }, { r: 1.4, steps: 3, bevel: 0.5 });
puck("count.body", CNT.x, CNT.y, CNT.r, CNT.z - 6, CNT.z, { tone: "hi", crease: "lo" }, {
  steps: 64,
  bevel: 0.6,
  extra: (() => {
    const rim = CNT.r - 2;
    const marks = [];
    CNT.stations.slice(1).forEach((a, i) => {
      const n = i + 1;
      for (let j = 0; j < n; j++) {
        const off = (j - (n - 1) / 2) * 0.16;
        marks.push(at([CNT.x + Math.sin(a + off) * (rim - 2.6), CNT.y - Math.cos(a + off) * (rim - 2.6), CNT.z]));
      }
    });
    const t = k.radialTicks(CNT.x, CNT.y, rim, 3, 1, CNT.z, [1.2, 1.2], P, CNT.stations[0], CNT.stations[3] - CNT.stations[0]);
    return Ln(k.ring(CNT.x, CNT.y, rim, CNT.z, P, 64), { tone: "lo" }) + Ln(t.major, { tone: "mid" }) + Dots(marks, { size: 0.6, tone: "hi" }) + Ln(k.ring(CNT.x, CNT.y, 1.4, CNT.z, P, 16), { tone: "mid" }) +
      Ln(k.sideArc(CNT.x, CNT.y, CNT.r, CNT.z - 2.4, P, 40), { tone: "faint" });
  })(),
});
// trip finger: arm from the counter stand to the far lip of the return track
{
  const ry = PATH.retEnd[1];
  const zArm = legR.under(100)[2] + FLOOR + 3.4;
  box("count.arm", [CNT.x - 1.2, CNT.y + 9.2, zArm - 1.6], [CNT.x + 1.2, ry - 6.5, zArm], { tone: "mid" }, { r: 0.4, steps: 2 });
  box("count.arm.post", [CNT.x - 1.6, CNT.y + 6, 0], [CNT.x + 1.6, CNT.y + 9.2, zArm - 1.6], { tone: "mid" }, { r: 0.4, steps: 2 });
}
// diverter: a blade that rises at the end of the return track and turns the ball into the tray
const DIV = { x: -112, y: 38 };
box("div.house", [DIV.x - 5, DIV.y - 13.5, 0], [DIV.x + 5, DIV.y - 7, 14], { tone: "mid" }, { r: 0.8, steps: 3, bevel: 0.4, extra: Dots([at([DIV.x - 5, DIV.y - 10, 11]), at([DIV.x + 5, DIV.y - 10, 11])], { size: 0.4 }) });
// ramp from the diverter into the tray
const legT = leg("ramp", [-113, 47.8, 10.4], [-121, 55, 8.8], { width: 12, lip: 3, ext: [0, 0] });

// ---------- dead-letter tray (agent.dlq), tag, replay lever, used flag ----------
const TRAY = { x0: -146, x1: -108, y0: 50, y1: 68, z1: 13 };
const LEVER = { x: -97, y: 60, z: 9, len: 26, rest: 0.12, pulled: 0.85 };
const FLAG = { x: -88, y: 50 };

// ---------- settle and assemble ----------
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const idx = (name) => {
  const i = R.items.findIndex((it) => it.name === name);
  if (i < 0) throw new Error("no item " + name);
  return i;
};
// ball slots: the ball is drawn right before the named item (inside a trough: before its near lip)
const SLOT_BEFORE = {
  legA: "in.a.near",
  legB: "in.b.near",
  chamber: R.items.findIndex((it) => it.name === "ch.wall.right") < R.items.findIndex((it) => it.name === "ch.sill") ? "ch.wall.right" : "ch.sill",
  outA: "out.a.near",
  outB: "out.b.near",
  chute: "chute.near",
  ret: "ret.near",
  ramp: "ramp.near",
};
const slotAt = new Map();
for (const [slot, name] of Object.entries(SLOT_BEFORE)) {
  const i = idx(name);
  slotAt.set(i, (slotAt.get(i) ?? "") + `<g data-slot="${slot}"></g>`);
}
// moving parts placed in fixed slots (before the named item)
const live = (name, svg) => {
  const i = idx(name);
  slotAt.set(i, (slotAt.get(i) ?? "") + svg);
};

// gate plate (429): drops into leg B
{
  const c = GATE.c;
  const plate = S(k.slabOf({ x: c[0] - 1, y: c[1] - 7, w: 2, d: 14, r: 0.3 }, GATE.zf + 0.2, 12, P, 2, 0.3), { tone: "hi", crease: "lo" });
  live("in.b.near", `<g data-part="gate" transform="${k.translateAlong(P, [0, 0, 12])}">${plate}</g>`);
}
// trapdoor plate in the exit trough
{
  const plate = S(k.slabOf({ x: TRAP.x0, y: TRAP.y0, w: TRAP.x1 - TRAP.x0, d: TRAP.y1 - TRAP.y0, r: 0.4 }, TRAP.z, 1.2, P, 2, 0.3), { tone: "hi", crease: "lo" });
  const slit = Ln(k.lineOnTop([TRAP.x0 + 1, BALL_Y], [TRAP.x1 - 1, BALL_Y], TRAP.z + 1.21, P), { tone: "faint" });
  live("out.a.near", `<g data-part="trap">${plate}${slit}</g>`);
}
// diverter blade: rises across the end of the return track
{
  const blade = k.extrude([[DIV.x - 1, DIV.y - 6.5], [DIV.x + 1.4, DIV.y - 6.5], [DIV.x - 5, DIV.y + 6.5], [DIV.x - 7.4, DIV.y + 6.5]], PATH.retEnd[2] - LIFT - 8, 8, P, { bevel: 0.3 });
  live("ret.near", `<g data-part="div" transform="${k.translateAlong(P, [0, 0, 0])}">${S(blade, { tone: "hi", crease: "lo" })}</g>`);
}

// tray and the lever are drawn after the settled items (they sit in front of everything near them)
const BALL_SVG = (() => {
  const paths = G.sphereOf([0, 0, 0], BR, P);
  const F = G.frameOf([0, 0, 0], [0.42, -0.3, 0.86], [1, 0, 0], [0, 1, 0]);
  const band = G.arcOf(G.frameAlong([0, 0, 0], G.unit3([0.4, -0.25, 0.88])), 0, BR, P, { trim: 0.4 });
  return S(paths, { tone: "hi", lit: true, inner: Ln(band, { tone: "lo" }) });
})();
const DONE_SVG = (p) => `<g transform="${k.translateAlong(P, p)}">${S(G.sphereOf([0, 0, 0], BR, P), { tone: "mid" })}</g>`;

const groups = R.items.map((item, i) => `${slotAt.get(i) ?? ""}<g class="it" data-name="${item.name}"${item.attrs ?? ""}>${item.svg}</g>`);

// done balls sit on the bin floor: drawn before the front wall
const binFront = groups.findIndex((g) => g.includes('data-name="bin.wall.front"'));
groups[binFront] = DONE_BALLS.map(([x, y]) => DONE_SVG([x, y, 3 + BR])).join("") + `<g data-slot="bin"></g>` + groups[binFront];

// bucket on the lift: the ball rides in it; drawn as a group moved live
const BUCKET = (() => {
  const zf = BUCKET_LOW - LIFT; // bucket floor underside at the low stop
  const floor = S(k.slabOf({ x: LX - 8, y: LY - 7, w: 14, d: 14, r: 1 }, zf, FLOOR, P, 3, 0.4), { tone: "mid" });
  const cheekFar = S(k.slabOf({ x: LX - 8, y: LY - 7, w: 14, d: 1.4, r: 0.3 }, zf + FLOOR, 4.2, P, 2), { tone: "mid" });
  const backWall = S(k.slabOf({ x: LX - 8, y: LY - 5.6, w: 1.4, d: 11.2, r: 0.3 }, zf + FLOOR, 6, P, 2), { tone: "mid" });
  const cheekNear = S(k.slabOf({ x: LX - 8, y: LY + 5.6, w: 14, d: 1.4, r: 0.3 }, zf + FLOOR, 4.2, P, 2), { tone: "mid" });
  return { back: floor + cheekFar + backWall, front: cheekNear };
})();

// tray: floor, walls, tag post, card; tray group lifts on replay
const TRAY_SVG = (() => {
  const t = TRAY;
  const parts = [];
  parts.push(`<path class="iso-halo" d="${k.haloOf({ x: t.x0, y: t.y0, w: t.x1 - t.x0, d: t.y1 - t.y0, r: 2 }, 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  parts.push(S(k.slabOf({ x: t.x0, y: t.y0, w: t.x1 - t.x0, d: t.y1 - t.y0, r: 1.6 }, 0.4, 1.8, P, 3, 0.5), { tone: "lo" }));
  parts.push(S(k.slabOf({ x: t.x0, y: t.y0, w: t.x1 - t.x0, d: 1.6, r: 0.3 }, 2.2, t.z1 - 2.2, P, 2), { tone: "mid" }));
  parts.push(S(k.slabOf({ x: t.x0, y: t.y0 + 1.6, w: 1.6, d: t.y1 - t.y0 - 1.6, r: 0.3 }, 2.2, t.z1 - 2.2, P, 2), { tone: "mid" }));
  return parts.join("");
})();
const TRAY_FRONT = (() => {
  const t = TRAY;
  const front = S(k.slabOf({ x: t.x0 + 1.6, y: t.y1 - 1.6, w: t.x1 - t.x0 - 1.6, d: 1.6, r: 0.3 }, 2.2, t.z1 - 6.2, P, 2), { tone: "mid" });
  const right = S(k.slabOf({ x: t.x1 - 1.6, y: t.y0 + 1.6, w: 1.6, d: t.y1 - t.y0 - 3.2, r: 0.3 }, 2.2, t.z1 - 6.2, P, 2), { tone: "mid" });
  // engraved label on the front lip
  const label = k.faceTextSvg(k.sideMatrix([(t.x0 + t.x1) / 2, t.y1], 5.2, P, "left"), "agent.dlq", { size: 2.6, tone: "mid", anchor: "middle" });
  return right + front + label + Dots([at([t.x0 + 4, t.y1, 7.2]), at([t.x1 - 3.2, t.y1, 7.2])], { size: 0.4 });
})();
// tag card on a post, pops up with error, stack and last output (three rule lines)
const TAG = { x: -139, y: 60, z: 2.2 };
const TAG_SVG = (() => {
  const postSvg = S(k.cylinder(TAG.x, TAG.y, 0.8, TAG.z + 9, 7, P, 12), { tone: "mid", crease: "none" });
  const cx0 = TAG.x + 1, cx1 = TAG.x + 13, cz0 = TAG.z + 8, cz1 = TAG.z + 17;
  const card = S(k.slabOf({ x: cx0, y: TAG.y - 0.4, w: cx1 - cx0, d: 0.8, r: 0.2 }, cz0, cz1 - cz0, P, 2), { tone: "hi", crease: "lo" });
  const face = TAG.y + 0.4;
  const rules = [0, 1, 2].map((i) => path3([[cx0 + 2, face + 0.01, cz1 - 2.2 - i * 2.2], [cx0 + 2 + [8, 6, 7][i], face + 0.01, cz1 - 2.2 - i * 2.2]])).join("");
  const hole = Dots([at([cx1 - 1.6, face, cz1 - 1.6])], { size: 0.5, tone: "lo" });
  return postSvg + card + Ln(rules, { tone: "mid", free: true }) + hole;
})();

// lever pivot block and pawl (static); the arm is rebuilt live
const LEVER_BASE = (() => {
  const l = LEVER;
  const blk = S(k.slabOf({ x: l.x - 4, y: l.y - 4, w: 8, d: 8, r: 1 }, 0, l.z - 2, P, 3, 0.4), { tone: "mid" });
  const ear = (dx) => S(k.slabOf({ x: l.x + dx, y: l.y - 3, w: 1.4, d: 6, r: 0.4 }, l.z - 2, 5, P, 2), { tone: "mid" });
  const pin = Ln(k.sideRing([l.x + 3.6, l.y, l.z + 1], 1, "x", P, 16), { tone: "lo" });
  return { back: blk + ear(-3.6), front: ear(2.2) + pin };
})();
const FLAG_SVG = (() => {
  const f = FLAG;
  const sleeve = S(k.cylinder(f.x, f.y, 2.4, 0, 8, P, 20), { tone: "mid" });
  const staff = S(k.cylinder(f.x, f.y, 0.9, 6, 16, P, 12), { tone: "mid", crease: "none" });
  const flag = S(k.slabOf({ x: f.x - 0.4, y: f.y + 0.9, w: 0.8, d: 9, r: 0.2 }, 15, 6.4, P, 2), { tone: "hi", crease: "lo" });
  return { sleeve, moving: staff + flag };
})();

const svg = k.figureSvg({
  width: W,
  height: H,
  label:
    "A job-ball retry machine on a base plate. A lift carries the job ball up to an intake trough with a pause gate, into a glass-fronted chamber where an agent works on it. On failure a trapdoor drops it down a chute onto a return track that runs past a three-station attempt counter back to the lift, which waits on a backoff timer, 2 seconds and then 4 seconds, before carrying it up again. After the third failure a diverter blade turns it into the dead-letter tray, labelled agent.dlq, where a tag holds the error, stack and last model output. A replay lever beside the tray sends it back once and then locks, raising a used flag.",
  body: [
    ...back,
    `<g class="rt-rig">`,
    `<g data-part="lift-back">${""}</g>`,
    ...groups,
    `</g>`,
    `<g data-part="bucket">${BUCKET.back}<g data-slot="bucket"></g>${BUCKET.front}</g>`,
    `<g data-part="tray">${TRAY_SVG}<g data-part="tag" transform="${k.translateAlong(P, [0, 0, -9])}"><clipPath id="rt-tagclip"><path d="${path3([[TRAY.x0, TRAY.y0 + 1, 2.2], [TRAY.x1, TRAY.y0 + 1, 2.2], [TRAY.x1, TRAY.y0 + 1, 60], [TRAY.x0, TRAY.y0 + 1, 60], [TRAY.x0, TRAY.y1, 60], [TRAY.x0, TRAY.y1, 2.2]].map((p) => p), true)}"/></clipPath>${TAG_SVG}</g><g data-slot="tray"></g>${TRAY_FRONT}</g>`,
    `<g data-part="flag-sleeve-back"></g><g data-part="flag" transform="${k.translateAlong(P, [0, 0, -6])}">${FLAG_SVG.moving}</g>${FLAG_SVG.sleeve}`,
    `${LEVER_BASE.back}<g data-part="lever"></g>${LEVER_BASE.front}`,
    `<g data-slot="free"></g>`,
    `<g data-part="ball" class="rt-ball" opacity="0">${BALL_SVG}</g>`,
  ],
});

const DATA = {
  P,
  V,
  BR,
  PATH,
  LEGS: Object.fromEntries(Object.entries(LEGS).map(([n, l]) => [n, { a: l.a, b: l.b }])),
  TIMER,
  CNT,
  GATE: { dial: GATE.dial },
  LEVER,
  BUCKET_LOW,
  BUCKET_TOP,
  MODEL,
};

const CSS = `
.iso[data-theme="light"]{--anatomy-page:#edeae3;--anatomy-card:#f3f1ea;--anatomy-paper:#f3f1ea;--anatomy-face:#fbfaf6;--anatomy-top:#fbfaf6;
--anatomy-shade-0:#d9d5cb;--anatomy-shade-1:#e2dfd6;--anatomy-shade-2:#e9e6de;--anatomy-shade-3:#efede6;--anatomy-lit-top:#ffffff;--anatomy-lit-shade:#ece9e1;
--anatomy-hi:#25241f;--anatomy-mid:#86837b;--anatomy-lo:#b2aea4;--anatomy-faint:#d2cec4;--anatomy-halo:#7f7a6c;--anatomy-dot:#3a3833;--anatomy-muted:#8a867c;--anatomy-text:#56534c}
.rt-glass{fill:var(--rt-glass);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke}
.rt-glare{fill:var(--rt-glare);stroke:none}
.iso[data-theme="light"] .rt-ball{--anatomy-paper:#4a4740;--anatomy-face:#4a4740;--anatomy-top:#8d897e;--anatomy-lit-top:#9a968a;--anatomy-shade-0:#2e2c27;--anatomy-shade-1:#3d3a34;--anatomy-shade-2:#55514a;--anatomy-shade-3:#78746a;--anatomy-lit-shade:#55514a;--anatomy-lo:#a9a59a;--anatomy-faint:#6a665d}
.iso{--rt-glass:#ffffff14;--rt-glare:#ffffff10}
.iso[data-theme="light"]{--rt-glass:#ffffff40;--rt-glare:#ffffff70}
html,body{height:100%;margin:0;overflow:hidden;background:var(--anatomy-page)}
.iso-page{width:100%;height:100%;margin:0}
.iso-figure{margin:0;height:100%}
.iso-plate{height:100%;padding:0;box-shadow:none;display:flex;flex-direction:column;justify-content:center}
.iso-plate-corners{inset:clamp(8px,2.6vw,16px) clamp(10px,3vw,20px)}
.iso-plate-corner{font-size:clamp(8px,1.7vw,10.5px)}
.iso-stage{position:absolute;left:0;right:0;top:clamp(18px,5.2vw,34px);bottom:clamp(18px,5.2vw,34px);display:flex;align-items:center;justify-content:center;outline:none;touch-action:pan-y;cursor:pointer}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:-6px}
.iso-stage .iso-svg{width:100%;height:100%;max-height:100%}
.rt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

const kitSrc = readFileSync(join(KIT, "iso-kit.mjs"), "utf8").replace(/^export /gm, "");
const latheSrc = readFileSync(join(KIT, "lathe.mjs"), "utf8").replace(/^import .*$/m, "").replace(/^export /gm, "");
const latheScript = `const G = (() => {${latheSrc}\nreturn { viewOf, scaleOf, frameAlong, frameOf, disc, sphereOf, dot3, add3, sub3, mul3, unit3, cross3, len3 };})();\n`;
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));

const body =
  `<style>${CSS}</style>` +
  k.plateHtml({
    fig: "Fig 3",
    title: "retries, dead letters, replay",
    hint: "click the lever to replay",
    readout: "attempt 1/3 · running",
    body: `<div class="iso-stage" tabindex="0" role="group" aria-label="Retry machine. Space or Enter pulls the replay lever when a dead letter is in the tray. P sends a 429 that pauses the queue.">${svg}<span class="rt-sr" role="status" aria-live="polite" data-status></span></div>`,
  });

const page = k.pageHtml({ title: "Retries, dead letters, replay", theme: THEME, body, script: kitSrc + latheScript + LIVE });
const name = THEME === "light" ? "fig-3-light.html" : "fig-3.html";
writeFileSync(join(HERE, name), page);
if (THEME === "light") {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "fig-3.html"), page);
}
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `scale ${KS.toFixed(3)}`);
A.auditOrExit(R, P, {});
