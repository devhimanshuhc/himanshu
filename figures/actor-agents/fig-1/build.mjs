// Fig 1 · "five actors, one post room"
// Retro's five agents as a pneumatic-tube post room: each station has its own receiving tray (its queue),
// stations never touch each other, a capsule carrying only {workflow_run_id, revision} travels tube to tube,
// and every station files its result in the one run cabinet (one Mongo document per run) before it sends.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../_kit/iso-kit.mjs";
import * as G from "../../_kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../_kit/tube.mjs";
import * as A from "../../_kit/audit.mjs";
import { HOPS, STATIONS, TIMING } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";
const OUT = process.argv.includes("--local")
  ? join(HERE, THEME === "light" ? "fig-1-light.html" : "fig-1.html")
  : THEME === "light"
    ? join(HERE, "..", "..", "..", "public", "blog", "actor-based-multi-agent-systems", "fig-1.html")
    : join(HERE, "fig-1-dark.html");

const W = 640;
const H = 330;
const AZIMUTH = 70;
const ELEVATION = 35;

// ---------- world plan (units ≈ px) ----------
const BENCH = { x: -282, y: -112, w: 500, d: 180, r: 10 };
const BENCH_H = 10;
const FOOT_H = 5;
const XS = [-176, -88, 0, 88, 176];
const DESK = { y: 12, d: 44, top: 29, plinthTop: 26 };
const HUTCH = { y: 12, d: 5, top: 74 };
const FACE_Y = HUTCH.y + HUTCH.d; // hutch front face
const TUBE_Y = 27;
const TUBE_R = 2.6;
const TUBE_Z = 96;
const RETURN_Z = 114;
const BELL = { r: 4.6, z0: 42, z1: 47 };
const FERRULE = { r: 3.4, z0: 47, z1: 49 };
const SEND = { dx: 18, half: 5.5, z1: 40 };
const COLLAR = { r: 3.6, z0: 40, z1: 44 };
const MOUTH_Z = 34.6;
const MON = { x0: -2, x1: 12, z0: 47, z1: 63, d: 7 };
const CX = -46;
const CAB = { x: CX - 30, y: -100, w: 60, d: 46, r: 2 };
const CAB_FRONT = CAB.y + CAB.d;
const CAB_Z = { plinth: 5, top: 116, cap: 119.5 };
const DRAWER_H = 20.4;
const DRAWER_Z0 = 10;
const drawerZ = (index) => {
  const top = DRAWER_Z0 + DRAWER_H * 5 - DRAWER_H * index;
  return [top - DRAWER_H + 0.8, top - 0.8];
};
const INTAKE = { x: -268, y: 14, w: 28, d: 26, r: 2, h: 30 };
const INTAKE_C = [INTAKE.x + INTAKE.w / 2, TUBE_Y];
const bellX = (station, from) => XS[station] + (station === 3 ? (from === 4 ? -8 : -19) : -14);

const P = k.fitProjection(
  [
    ...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0),
    ...k.boxCorners(CAB, 0, CAB_Z.cap),
    [XS[4] + SEND.dx, TUBE_Y, RETURN_Z + TUBE_R],
    [INTAKE_C[0], TUBE_Y, TUBE_Z + TUBE_R],
  ],
  W,
  H,
  { pad: 18, azimuth: AZIMUTH, elevation: ELEVATION },
);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const r2 = (v) => Math.round(v * 100) / 100;
const planeOf = (y) => k.sideMatrix([0, y], 0, P, "left");
const sidePlane = (x) => k.sideMatrix([x, 0], 0, P, "right");
const flat = (x0, z0, x1, z1, r, steps = 4) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([u, z]) => [u, -z]), true);
const onFace = (y, inner) => `<g transform="${planeOf(y)}">${inner}</g>`;

// ---------- recorder ----------
const R = A.recorder(P);
const put = (name, ref, svg, shapes, { bias = 0, attrs = "" } = {}) => R.put({ name, at: ref, bias, svg, shapes, piece: "room", attrs });
const tag = (station, extra = "") => (station === undefined ? extra : ` data-station="${station}"${extra}`);

function slab(name, plan, z0, h, style = {}, { steps = 3, bevel = 0, extra = "", inner = "", bias = 0, attrs = "", more = [] } = {}) {
  const shape = R.solid(A.slab(plan, z0, h, { name }, steps));
  put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z0 + h / 2], S(k.slabOf(plan, z0, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape, ...more], { bias, attrs });
  return shape;
}
function cyl(name, cx, cy, r, z0, h, style = {}, { steps = 28, bevel = 0, extra = "", inner = "", bias = 0, attrs = "" } = {}) {
  const shape = R.solid(A.cylinder(cx, cy, r, z0, h, { name }));
  put(name, [cx, cy, z0 + h / 2], S(k.cylinder(cx, cy, r, z0, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias, attrs });
  return shape;
}

const ROUTES = {};
function pipe(name, points, feeds) {
  const route = G.fillet(points, 8, 10, { P, tube: TUBE_R });
  R.route(name, route, TUBE_R, { piece: "room" });
  ROUTES[name] = route;
  tubePieces(route, TUBE_R, P, { maxLength: 16 }).forEach((piece, index) =>
    put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [A.tube(piece.points, piece.radii)], { attrs: ` data-feeds="${feeds}"` }),
  );
  return route;
}

// ---------- the bench (ground) ----------
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const feet = [...k.corners(BENCH, 22), [BENCH.x + BENCH.w / 2, BENCH.y + 22], [BENCH.x + BENCH.w / 2, BENCH.y + BENCH.d - 22]];
for (const [x, y] of byDepth(feet)) {
  back.push(S(k.cylinder(x, y, 7, -BENCH_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 5.4, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
}
back.push(S(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(BENCH, -4, P, 8), { tone: "faint" }) }));
back.push(Ln(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "lo" }));
const benchScrews = k.corners(BENCH, 10);
back.push(Ln(benchScrews.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
back.push(Dots(benchScrews.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
R.solid(A.slab(BENCH, -BENCH_H, BENCH_H, { name: "stand.bench", ground: true }, 8));
// floor channel the tubes would be serviced from: a ruler strip along the front edge, stations marked on it
const STRIP = { x: XS[0] - 30, y: BENCH.y + BENCH.d - 12, w: XS[4] - XS[0] + 60, d: 6, r: 1 };
back.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
{
  const ticks = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 4, 11, STRIP.y, 0.6, [1.6, 3.2], P);
  back.push(Ln(ticks.minor, { tone: "lo" }), Ln(ticks.major, { tone: "mid" }));
  back.push(Dots([at([STRIP.x + 2, STRIP.y + 3, 0.6]), at([STRIP.x + STRIP.w - 2, STRIP.y + 3, 0.6])], { size: 0.45 }));
}
// maker's plate on the bench, front right
{
  const plate = { x: XS[4] + 4, y: BENCH.y + BENCH.d - 30, w: 34, d: 12, r: 1.2 };
  back.push(S(k.slabOf(plate, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  back.push(Ln(k.planOutline(k.insetPlan(plate, 1.4), 0.8, P, 3), { tone: "faint" }));
  back.push(Ln([24, 17, 20].map((w, i) => k.lineOnTop([plate.x + 4, plate.y + 3.4 + i * 2.6], [plate.x + 4 + w, plate.y + 3.4 + i * 2.6], 0.8, P)).join(""), { tone: "lo", free: true }));
  back.push(Dots([at([plate.x + plate.w - 2.6, plate.y + 2.4, 0.8]), at([plate.x + plate.w - 2.6, plate.y + plate.d - 2.4, 0.8])], { size: 0.42 }));
}

// ---------- the run cabinet: one document per run, one drawer per step ----------
{
  const name = "cabinet";
  const plinth = k.insetPlan(CAB, 2.5);
  slab(`${name}.plinth`, plinth, 0, CAB_Z.plinth, { tone: "lo" }, { steps: 3 });
  const seams = [DRAWER_Z0 - 1.5].map((z) => k.sideSeam(CAB, z, P, 3)).join("");
  const side = `<g transform="${sidePlane(CAB.x + CAB.w)}">${Ln([0, 1, 2].map((i) => flat(-CAB.y - 30 - i * 4.2, 74, -CAB.y - 29 - i * 4.2, 104, 0.5)).join(""), { tone: "faint" })}</g>`;
  slab(`${name}.body`, CAB, CAB_Z.plinth, CAB_Z.top - CAB_Z.plinth, { tone: "mid" }, { steps: 4, bevel: 0.8, inner: Ln(seams, { tone: "faint" }), extra: side });
  const cap = k.insetPlan(CAB, -1.2);
  const capLabel = { x: -12, z0: CAB_Z.top - 0.2 };
  slab(`${name}.cap`, cap, CAB_Z.top, CAB_Z.cap - CAB_Z.top, { tone: "mid" }, {
    steps: 4,
    bevel: 0.6,
    extra: Dots(k.corners(cap, 4).map(([x, y]) => at([x, y, CAB_Z.cap])), { size: 0.45 }) + Ln(k.planOutline(k.insetPlan(cap, 6), CAB_Z.cap, P, 4), { tone: "faint" }),
  });
  void capLabel;
  // drawers: an exposed box (rebuilt live while it slides) and a front with a pull and a card holder
  const drawers = [];
  for (let index = 4; index >= 0; index--) {
    const [z0, z1] = drawerZ(index);
    const front = { x: CX - 26, y: CAB_FRONT, w: 52, d: 1.6, r: 0.6 };
    const holder = flat(CX - 9, z1 - 7.6, CX + 9, z1 - 2.4, 0.8);
    const card = flat(CX - 7.6, z1 - 6.6, CX + 7.6, z1 - 3.4, 0.4);
    const rule = `M${CX - 5.6} ${-(z1 - 5)}H${CX + (index === 0 ? 3.6 : 5.6 - index * 1.4)}`;
    const pull = { x: CX - 8, y: CAB_FRONT + 1.6, w: 16, d: 2.2, r: 1 };
    const faceY = CAB_FRONT + front.d;
    const art =
      S(k.slabOf(front, z0, z1 - z0, P, 2, 0.5), { tone: "mid" }) +
      onFace(faceY, `<path class="af-card" d="${card}"/>${Ln(holder, { tone: "lo" })}${Ln(card, { tone: "faint" })}${Ln(rule, { tone: "lo", free: true })}`) +
      Dots([at([CX - 22, faceY, z1 - 3]), at([CX + 22, faceY, z1 - 3])], { size: 0.42 }) +
      S(k.slabOf(pull, z0 + 4.2, 2.6, P, 3, 0.3), { tone: "mid" });
    drawers.push({ index, z0, z1, art });
  }
  const drawerSvg = drawers
    .map(({ index, z0, z1, art }) => `<g data-drawer="${index}"><g data-drawer-box="${index}" data-z="${z0 + 1}" data-h="${r2(z1 - z0 - 3.2)}"></g><g data-drawer-front="${index}">${art}</g></g>`)
    .join("");
  const shapes = drawers.map(({ index, z0, z1 }) => R.solid(A.slab({ x: CX - 26, y: CAB_FRONT, w: 52, d: 1.6, r: 0.6 }, z0, z1 - z0, { name: `cabinet.drawer${index}` }, 2)));
  shapes.push(...drawers.map(({ index, z0 }) => R.solid(A.slab({ x: CX - 8, y: CAB_FRONT + 1.6, w: 16, d: 2.2, r: 1 }, z0 + 4.2, 2.6, { name: `cabinet.pull${index}` }, 3))));
  put("cabinet.drawers", [CX, CAB_FRONT + 1, 60], drawerSvg, shapes, { bias: 0.5 });
  // the one engraved label in the drawing: on the cabinet top band
  put(
    "cabinet.label",
    [CX, CAB_FRONT, CAB_Z.top - 1.5],
    S(k.slabOf({ x: CX - 11, y: CAB_FRONT, w: 22, d: 0.8, r: 0.4 }, DRAWER_Z0 + DRAWER_H * 5 + 0.5, 3.2, P, 2), { tone: "lo", crease: "none" }) +
      k.faceTextSvg(`${planeOf(CAB_FRONT + 0.8)} translate(${CX} ${-(DRAWER_Z0 + DRAWER_H * 5 + 1.25)})`, "RUN", { size: 2.6, tone: "mid", anchor: "middle" }),
    [R.solid(A.slab({ x: CX - 11, y: CAB_FRONT, w: 22, d: 0.8, r: 0.4 }, DRAWER_Z0 + DRAWER_H * 5 + 0.5, 3.2, { name: "cabinet.label" }, 2))],
    { bias: 0.4 },
  );
}

// ---------- the intake (the API: it opens the run and posts the first capsule) ----------
{
  const slotY = INTAKE.y + INTAKE.d;
  const slot = flat(INTAKE_C[0] - 7, 14.6, INTAKE_C[0] + 7, 19.4, 1.4);
  const front =
    onFace(slotY, `<path class="af-void" d="${slot}"/>${Ln(slot, { tone: "lo" })}${Ln(flat(INTAKE.x + 3, 3, INTAKE.x + INTAKE.w - 3, 26, 1.6), { tone: "faint" })}`) +
    Dots([at([INTAKE.x + 6, slotY, 22.4]), at([INTAKE.x + INTAKE.w - 6, slotY, 22.4])], { size: 0.42 });
  slab("intake.box", INTAKE, 0, INTAKE.h, { tone: "mid" }, { steps: 3, bevel: 0.6, extra: front });
  cyl("intake.collar", INTAKE_C[0], TUBE_Y, COLLAR.r, INTAKE.h, 4, { tone: "mid" }, { steps: 24, bevel: 0.3 });
}

// ---------- five stations ----------
const STATION_ITEMS = [];
XS.forEach((cx, station) => {
  const attrs = tag(station);
  const plinth = { x: cx - 26, y: DESK.y + 2, w: 52, d: DESK.d - 4, r: 1.6 };
  const plinthFront = plinth.y + plinth.d;
  const drawerFace =
    onFace(
      plinthFront,
      [
        Ln(flat(cx - 23, 14.5, cx - 2, 23, 0.8), { tone: "lo" }),
        Ln(flat(cx - 23, 4, cx - 2, 12.5, 0.8), { tone: "lo" }),
        Ln(flat(cx + 2, 4, cx + 23, 23, 0.8), { tone: "lo" }),
        `<path class="af-card" d="${flat(cx + 6, 15.5, cx + 19, 20.5, 0.5)}"/>`,
        Ln(flat(cx + 6, 15.5, cx + 19, 20.5, 0.5), { tone: "faint" }),
        Ln(`M${cx + 8} ${-18.6}H${cx + 8 + 5 + station}M${cx + 8} ${-17}H${cx + 15}`, { tone: "lo", free: true }),
      ].join(""),
    ) + Dots([at([cx - 12.5, plinthFront, 19]), at([cx - 12.5, plinthFront, 8.6]), at([cx + 12.5, plinthFront, 11])], { size: 0.55, tone: "mid" });
  slab(`s${station}.plinth`, plinth, 0, DESK.plinthTop, { tone: "mid" }, { steps: 3, bevel: 0.6, extra: drawerFace, attrs });
  const top = { x: cx - 28, y: DESK.y, w: 56, d: DESK.d, r: 2.2 };
  slab(`s${station}.top`, top, DESK.plinthTop, DESK.top - DESK.plinthTop, { tone: "mid" }, { steps: 4, bevel: 0.8, attrs });
  // hutch: the back board that carries the receiver brackets and the monitor
  const hutch = { x: cx - 26, y: HUTCH.y, w: 52, d: HUTCH.d, r: 0.8 };
  const hutchFace = onFace(FACE_Y, Ln(flat(cx - 23, DESK.top + 3, cx + 23, HUTCH.top - 3, 1.4), { tone: "faint" }));
  slab(`s${station}.hutch`, hutch, DESK.top, HUTCH.top - DESK.top, { tone: "mid" }, {
    steps: 2,
    bevel: 0.5,
    extra: hutchFace + Dots([at([cx - 21, FACE_Y, HUTCH.top - 6]), at([cx + 21, FACE_Y, HUTCH.top - 6])], { size: 0.45 }),
    attrs,
  });
  // monitor on the hutch: shows the worker is busy
  const mon = { x: cx + MON.x0, y: FACE_Y, w: MON.x1 - MON.x0, d: MON.d, r: 1.2 };
  const monFront = FACE_Y + MON.d;
  const glass = flat(cx + MON.x0 + 2, MON.z0 + 3.4, cx + MON.x1 - 2, MON.z1 - 2, 1.2);
  const rows = [0, 1, 2].map((i) => `M${cx + MON.x0 + 3.4} ${-(MON.z1 - 4.6 - i * 2.6)}H${cx + MON.x0 + 3.4 + [7, 4.6, 6][i]}`).join("");
  const screen = onFace(
    monFront,
    `<path class="af-glass" d="${glass}"/><path class="iso-line af-rows" data-tone="lo" data-free="" d="${rows}"/>${Ln(glass, { tone: "lo" })}`,
  );
  const led = Dots([at([cx + MON.x1 - 2.6, monFront, MON.z0 + 1.6])], { size: 0.55, tone: "mid" });
  slab(`s${station}.monitor`, mon, MON.z0, MON.z1 - MON.z0, { tone: "mid" }, { steps: 3, bevel: 0.5, extra: `<g class="af-screen">${screen}</g>${led}`, attrs });
  // inbox tray: the station's queue
  const tray = { x: cx - 25, y: 20, w: 22, d: 14, r: 2 };
  const well = k.insetPlan(tray, 1.6);
  const trayInner =
    `<path class="af-void" d="${k.pathOf(k.roundedPlan(well, 3).map(([x, y]) => at([x, y, 36])), true)}"/>` +
    Ln(k.planOutline(well, 36, P, 3), { tone: "lo" }) +
    Ln(k.planOutline({ x: well.x + 2, y: well.y + 2, w: well.w - 4, d: well.d - 4, r: 1 }, 36 - 5.4, P, 3), { tone: "faint" });
  slab(`s${station}.tray`, tray, DESK.top, 7, { tone: "hi", crease: "lo" }, { steps: 3, bevel: 0.4, extra: trayInner, attrs: tag(station, ` data-inbox="${station}"`) });
  // receivers: bracket from the hutch, bell, ferrule
  const inputs = station === 3 ? [2, 4] : [station - 1];
  for (const from of inputs) {
    const bx = bellX(station, from);
    const id = `s${station}.rx${from < 0 ? "api" : from}`;
    slab(`${id}.bracket`, { x: bx - 2, y: FACE_Y, w: 4, d: TUBE_Y - BELL.r - FACE_Y + 0.25, r: 0.6 }, BELL.z0 + 1.4, 2.2, { tone: "mid" }, { steps: 2, attrs });
    cyl(`${id}.bell`, bx, TUBE_Y, BELL.r, BELL.z0, BELL.z1 - BELL.z0, { tone: "mid" }, { steps: 32, bevel: 0.4, attrs, inner: Ln(k.sideArc(bx, TUBE_Y, BELL.r, BELL.z0 + 1.4, P, 24), { tone: "faint" }) });
    cyl(`${id}.ferrule`, bx, TUBE_Y, FERRULE.r, FERRULE.z0, FERRULE.z1 - FERRULE.z0, { tone: "mid" }, { steps: 24, bevel: 0.3, attrs });
  }
  // sender: a box with a hinged mouth, a collar on top where the outgoing tube leaves
  const sx = cx + SEND.dx;
  const sendPlan = { x: sx - SEND.half, y: TUBE_Y - SEND.half, w: SEND.half * 2, d: SEND.half * 2, r: 1.2 };
  const sendFront = sendPlan.y + sendPlan.d;
  const mouth = flat(sx - 3.4, MOUTH_Z - 2.6, sx + 3.4, MOUTH_Z + 2.6, 2.4, 6);
  const sendFace =
    onFace(sendFront, `<path class="af-void" d="${mouth}"/>${Ln(mouth, { tone: "lo" })}${Ln(`M${sx - 4.4} ${-(MOUTH_Z + 3.6)}H${sx + 4.4}`, { tone: "mid" })}`) +
    Dots([at([sx - 4.4, sendFront, MOUTH_Z + 3.6]), at([sx + 4.4, sendFront, MOUTH_Z + 3.6])], { size: 0.5, tone: "mid" });
  if (station < 4 || true) {
    slab(`s${station}.sender`, sendPlan, DESK.top, SEND.z1 - DESK.top, { tone: "mid" }, { steps: 3, bevel: 0.5, extra: sendFace, attrs });
    cyl(`s${station}.collar`, sx, TUBE_Y, COLLAR.r, COLLAR.z0, COLLAR.z1 - COLLAR.z0, { tone: "mid" }, { steps: 24, bevel: 0.3, attrs });
  }
  // keyboard on the front of the desk
  const kb = { x: cx - 24, y: 40, w: 24, d: 11, r: 1.2 };
  const keys = k.dotGrid(kb.x + 2.6, kb.y + 2.6, 8, 3, 2.7, DESK.top + 1.4, P);
  slab(`s${station}.keyboard`, kb, DESK.top, 1.4, { tone: "mid" }, { steps: 2, bevel: 0.3, extra: Dots(keys, { size: 0.42, tone: "lo" }), attrs });
  STATION_ITEMS.push(station);
});

// ---------- tubes: every tube ends in exactly one inbox ----------
const route = (from, to) => {
  const start = from < 0 ? [INTAKE_C[0], TUBE_Y, INTAKE.h + 4] : [XS[from] + SEND.dx, TUBE_Y, COLLAR.z1];
  const bx = bellX(to, from);
  const z = from === 4 ? RETURN_Z : TUBE_Z;
  return [start, [start[0], TUBE_Y, z], [bx, TUBE_Y, z], [bx, TUBE_Y, FERRULE.z1]];
};
const TUBES = [
  ["tube.api-router", -1, 0],
  ["tube.router-supervisor", 0, 1],
  ["tube.supervisor-research", 1, 2],
  ["tube.research-write", 2, 3],
  ["tube.write-critic", 3, 4],
  ["tube.critic-write", 4, 3],
];
for (const [name, from, to] of TUBES) pipe(name, route(from, to), to);

// ---------- order, then the capsule's paths ----------
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const items = R.items.map((item) => `<g class="it" data-name="${item.name}"${item.attrs ?? ""}>${item.svg}</g>`);

// Solids the capsule is hidden inside (it shows through the glass tubes, and is dimmed inside metal).
const opaque = [];
XS.forEach((cx, station) => {
  opaque.push({ min: [cx + SEND.dx - SEND.half, TUBE_Y - SEND.half, DESK.top], max: [cx + SEND.dx + SEND.half, TUBE_Y + SEND.half, COLLAR.z1] });
  for (const from of station === 3 ? [2, 4] : [station - 1]) {
    const bx = bellX(station, from);
    opaque.push({ min: [bx - BELL.r, TUBE_Y - BELL.r, BELL.z0], max: [bx + BELL.r, TUBE_Y + BELL.r, FERRULE.z1] });
  }
});
opaque.push({ min: [INTAKE.x, INTAKE.y, 0], max: [INTAKE.x + INTAKE.w, INTAKE.y + INTAKE.d, INTAKE.h + 4] });
const inside = (p) => opaque.some(({ min, max }) => p[0] > min[0] && p[0] < max[0] && p[1] > min[1] && p[1] < max[1] && p[2] > min[2] && p[2] < max[2]);

const REST_Z = 32.4;
const restOf = (station, from) => {
  const bx = bellX(station, from);
  return [bx + 4.4, TUBE_Y, REST_Z];
};
const dropTo = (station, from) => {
  const bx = bellX(station, from);
  return G.fillet([[bx, TUBE_Y, FERRULE.z1], [bx, TUBE_Y, REST_Z], restOf(station, from)], 3, 6);
};
const carryFrom = (station, from) => {
  const rest = restOf(station, from);
  const sx = XS[station] + SEND.dx;
  return G.fillet(
    [rest, [rest[0], 36, REST_Z + 8], [sx, 40, REST_Z + 6], [sx, 40, MOUTH_Z], [sx, TUBE_Y, MOUTH_Z], [sx, TUBE_Y, COLLAR.z1]],
    3,
    6,
  );
};
const join3 = (...lists) => lists.reduce((all, list) => (all.length && list.length && G.len3(G.sub3(all[all.length - 1], list[0])) < 1e-6 ? [...all, ...list.slice(1)] : [...all, ...list]), []);
const sample = (points) => {
  const even = G.resample(points, 0.8);
  const raw = even.map((p) => (inside(p) ? 0.18 : 1));
  const alpha = raw.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - 4); j <= Math.min(raw.length - 1, i + 4); j++) {
      sum += raw[j];
      n++;
    }
    return sum / n;
  });
  return even.map((p, i) => [...at(p).map(r2), r2(alpha[i])]);
};
const lastFrom = { 0: -1, 1: 0, 2: 1, 3: 2, 4: 3 };
const PATHS = HOPS.map((hop) => {
  if (hop.from === -1) {
    const intake = [[INTAKE_C[0], INTAKE.y + INTAKE.d + 7, 17], [INTAKE_C[0], TUBE_Y, 17], [INTAKE_C[0], TUBE_Y, INTAKE.h + 4]];
    return sample(join3(G.fillet(intake, 4, 6), ROUTES["tube.api-router"], dropTo(0, -1)));
  }
  const name = TUBES.find(([, from, to]) => from === hop.from && to === hop.to)[0];
  return sample(join3(carryFrom(hop.from, hop.arrivedFrom ?? lastFrom[hop.from]), ROUTES[name], dropTo(hop.to, hop.from)));
});

const LABEL =
  "A pneumatic-tube post room on a workbench, standing for Retro's five agents. Five desks in a row, router, planner, researcher, writer and critic, each with its own receiving tray under a tube: its queue. Glass tubes run from each desk's sender to the next desk's tray, and one more runs from the critic back to the writer. A capsule that carries only a run id and a revision travels desk to desk. Behind the desks stands one filing cabinet, the run document, with a drawer per step; each desk files its result in its drawer before it sends the capsule on.";

const svg = k.figureSvg({
  width: W,
  height: H,
  label: LABEL,
  className: "af",
  body: [
    ...back,
    `<g class="af-items">${items.join("")}</g>`,
    `<g class="af-capsule" data-part="capsule" style="opacity:0"><path class="af-cap-body" d=""/><path class="af-cap-band" d=""/></g>`,
  ],
});

const DATA = {
  P,
  KS: r2(KS),
  paths: PATHS,
  hops: HOPS,
  stations: STATIONS,
  timing: TIMING,
  cab: { x: CX - 25, y: CAB_FRONT, w: 50, open: 11 },
  capsule: { half: 3.4, r: 1.9 },
};

const CSS = readFileSync(join(HERE, "fig-1.css"), "utf8");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const KIT = readFileSync(join(HERE, "..", "..", "_kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");

const body =
  k.plateHtml({
    fig: "Fig 1",
    title: "five actors, one post room",
    hint: "hover a station",
    readout: "router · working · rev 0",
    body: `<div class="iso-stage af-stage" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="4" aria-valuenow="0" aria-valuetext="No station selected" aria-label="Five agents as desks in a post room. Arrow keys select a desk and light its inbox; Escape clears.">${svg}<span class="af-sr" role="status" aria-live="polite" data-status></span></div>`,
  });

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Five actors, one post room</title><style>${k.ISO_CSS}${CSS}</style></head><body class="iso af-page" data-theme="${THEME}">${body}<script type="module">${(KIT + LIVE).replace(/<\/(script)/gi, "<\\/$1")}</script></body></html>`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);
console.log("wrote", OUT, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `${R.solids.length} solids`, `scale ${KS.toFixed(3)}`);

A.auditOrExit(R, P, {});
