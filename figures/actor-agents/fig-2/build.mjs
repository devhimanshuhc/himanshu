// Fig 2 · "save, then send": a desk stamping station.
// node figures/actor-agents/fig-2/build.mjs [--light]
// Light writes public/blog/actor-based-multi-agent-systems/fig-2.html; dark writes fig-2-dark.html here.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import * as k from "../../_kit/iso-kit.mjs"
import * as M from "./model.mjs"
import * as Z from "./shapes.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..", "..")
const light = process.argv.includes("--light")
const theme = light ? "light" : "dark"
const strip = (file) => readFileSync(file, "utf8").replace(/^export /gm, "").replace(/^import .*$/gm, "")

const WIDTH = 640
const HEIGHT = 400

// ---- world plan (x right along the line of work, y toward the viewer, z up) ----
const BASE = { x: -164, y: -62, w: 276, d: 120, r: 8 }
const BASE_H = 12
const FOOT_H = 5
const TRAY = { x: -156, y: -24, w: 54, d: 48, r: 2 }
const CARD = { x: -145, y: -13, w: 34, d: 26, r: 1.2 } // the top card, in the tray
const CARD_Z = 9.5
const CARD_T = 1.2
const TABLE = { x: -100, y: -16, w: 66, d: 32, r: 1.5 }
const BED = { x: -36, y: -52, w: 96, d: 84, r: 3 }
const BED_TOP = 6
const COLUMN = { x: 8, y: -50, w: 24, d: 14, r: 2 }
const ARM = { x: 6, y: -50, w: 28, d: 62, r: 3 }
const LEDGER = { x: -28, y: -28, w: 68, d: 52, r: 2 }
const PAGES = { x: -26, y: -27, w: 63, d: 50, r: 1 }
const HEAD = { x: 9, y: -10, w: 22, d: 20, r: 2 }
const HEAD_Z = 29
const LATCH_X = 44
const BOLT = { x: 26, y: -2.4, w: 22, d: 4.8, r: 1.2 } // engaged; retracted is +12 in x
const BOLT_OUT = 14
const BOX = { x: 68, y: -16, w: 32, d: 32, r: 2 } // the next actor's mailbox
const BOX_H = 22
const TUBE = [84, 0]
const TUBE_R = 8
const TUBE_TOP = 56
const HEADPLATE = { x: 72, y: -12, w: 24, d: 40, r: 2 }
const HP_TOP = 58.5
const GATE = { x: 75, y: -10, w: 18, d: 20, r: 1.5 }
const GATE_OPEN = 18
const CAP_R = 4

const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), [20, 0, Z.ROD_TOP + 3], [20, -50, 92], [84, 0, 72], [-156, -24, 20]],
  WIDTH, HEIGHT, { pad: 32, azimuth: 58 },
)

const at = (p) => k.iso(p, P)
const S = (paths, style) => k.solidSvg(paths, style)
const L = (d, style) => k.lineSvg(d, style)
const D = (points, style) => k.dotsSvg(points, style)
const slab = (plan, z, h, style = {}, steps = 4, bevel = 0.5) => S(k.slabOf(plan, z, h, P, steps, bevel), style)
const cyl = (x, y, r, z, h, style = {}, steps = 28, bevel = 0) => S(k.cylinder(x, y, r, z, h, P, steps, bevel), style)
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
const screws = (points, z, ring = 1.6) => L(points.map(([x, y]) => k.ring(x, y, ring, z, P, 14)).join(""), { tone: "lo" }) + D(points.map(([x, y]) => at([x, y, z])), { size: 0.45 })
const seam = (plan, z, steps = 4) => L(k.sideSeam(plan, z, P, steps), { tone: "faint" })
const g = (part, body, extra = "") => `<g data-part="${part}"${extra}>${body}</g>`

// ---- base ----
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`]
  for (const [x, y] of byDepth(k.corners(BASE, 20))) {
    out.push(cyl(x, y, 7, -BASE_H - FOOT_H, 1.6, { tone: "lo" }))
    out.push(cyl(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, { tone: "mid" }))
  }
  out.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.6), { tone: "mid", inner: seam(BASE, -BASE_H + 3.5, 8) }))
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "lo" }))
  out.push(screws(k.corners(BASE, 10), 0, 2.2))
  // ruler strip along the front: the line of work, in card widths
  const strip = { x: -146, y: 45, w: 240, d: 7, r: 1 }
  out.push(slab(strip, 0, 0.6, { tone: "lo", crease: "none" }, 3, 0))
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P)
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }))
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }))
  // label plate
  const label = { x: -150, y: 29, w: 34, d: 11, r: 1.2 }
  out.push(slab(label, 0, 0.8, { tone: "mid" }, 3, 0.3))
  out.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 3), { tone: "faint" }))
  out.push(L([[4, 20], [4, 14], [4, 24]].map(([dy, len], i) => k.lineOnTop([label.x + 4, label.y + 3 + i * 2.5], [label.x + 4 + len, label.y + 3 + i * 2.5], 0.8, P)).join(""), { tone: "lo", free: true }))
  out.push(D([at([label.x + label.w - 3, label.y + 3, 0.8]), at([label.x + label.w - 3, label.y + label.d - 3, 0.8])], { size: 0.4 }))
  return out.join("")
}

// ---- inbox tray (the actor's mailbox) ----
const WALL_H = 20
function trayBack() {
  const out = []
  const floorTop = CARD_Z - CARD_T * 2
  out.push(slab(TRAY, 0, 5, { tone: "mid", inner: seam(TRAY, 2.5) }, 4, 0.6))
  out.push(slab(k.insetPlan(TRAY, 1), 5, floorTop - 5, { tone: "lo" }, 4, 0.4))
  out.push(slab({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: 3, r: 1 }, floorTop, WALL_H - floorTop, { tone: "mid" }, 3, 0.5))
  out.push(slab({ x: TRAY.x, y: TRAY.y + 3, w: 3, d: TRAY.d - 6, r: 1 }, floorTop, WALL_H - floorTop, { tone: "mid" }, 3, 0.5))
  out.push(D([at([TRAY.x + 6, TRAY.y + 1.5, WALL_H]), at([TRAY.x + TRAY.w - 6, TRAY.y + 1.5, WALL_H]), at([TRAY.x + 1.5, TRAY.y + TRAY.d - 8, WALL_H])], { size: 0.4 }))
  // waiting cards: the same kind of message for other runs
  for (let i = 0; i < 2; i++) {
    const plan = { ...CARD, x: CARD.x + (i ? -1.2 : 0.6), y: CARD.y + (i ? 0.8 : -0.4) }
    out.push(slab(plan, floorTop + i * CARD_T, CARD_T, { tone: "hi", crease: "lo" }, 2, 0))
  }
  return out.join("")
}
function trayFront() {
  const floorTop = CARD_Z - CARD_T * 2
  const front = { x: TRAY.x, y: TRAY.y + TRAY.d - 3, w: TRAY.w, d: 3, r: 1 }
  return slab(front, floorTop, 13 - floorTop, { tone: "mid" }, 3, 0.5) + D([at([TRAY.x + 6, front.y + 1.5, 13]), at([TRAY.x + TRAY.w - 6, front.y + 1.5, 13])], { size: 0.4 })
}

// ---- feed table between tray and press ----
function tableBack() {
  const out = []
  out.push(slab(TABLE, 0, CARD_Z, { tone: "mid", inner: seam(TABLE, 3) }, 3, 0.5))
  out.push(L(k.planOutline({ x: TABLE.x + 4, y: -1.2, w: TABLE.w - 8, d: 2.4, r: 1.2 }, CARD_Z, P, 3), { tone: "lo" }))
  out.push(slab({ x: TABLE.x, y: TABLE.y, w: TABLE.w, d: 2.4, r: 0.8 }, CARD_Z, 2, { tone: "mid" }, 2, 0.3))
  return out.join("")
}
const tableFront = () => slab({ x: TABLE.x, y: TABLE.y + TABLE.d - 2.4, w: TABLE.w, d: 2.4, r: 0.8 }, CARD_Z, 2, { tone: "mid" }, 2, 0.3) + D([at([TABLE.x + 4, TABLE.y + TABLE.d - 1.2, CARD_Z + 2]), at([TABLE.x + TABLE.w - 4, TABLE.y + TABLE.d - 1.2, CARD_Z + 2])], { size: 0.4 })

// ---- press bed, column and the ledger (the run document) ----
function bed() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(BED, 4), 0, 2, P)}" style="opacity:.18"/>`]
  out.push(S(k.slabOf(BED, 0, BED_TOP, P, 4, 0.8), { tone: "mid", inner: seam(BED, 2.6) }))
  out.push(screws([[BED.x + 5, BED.y + BED.d - 5], [BED.x + BED.w - 5, BED.y + BED.d - 5], [BED.x + 5, BED.y + 5]], BED_TOP, 1.4))
  // column foot and column
  const foot = { x: COLUMN.x - 4, y: COLUMN.y - 1, w: COLUMN.w + 8, d: COLUMN.d + 6, r: 2 }
  out.push(slab(foot, BED_TOP, 3, { tone: "mid" }, 3, 0.5))
  out.push(screws([[foot.x + 2.6, foot.y + foot.d - 2.6], [foot.x + foot.w - 2.6, foot.y + foot.d - 2.6]], BED_TOP + 3, 1))
  out.push(S(k.slabOf(COLUMN, BED_TOP + 3, ARM_Z0 - BED_TOP - 3, P, 4, 0.6), { tone: "mid", inner: seam(COLUMN, 40) }))
  return out.join("")
}
const ARM_Z0 = Z.ARM_BOTTOM
const ARM_Z1 = 80

const STEP_ROWS = [-20, -9, 2, 13] // plan, research, write, critic
const NOW = 2 // the row this worker's step writes
function ledger() {
  const out = []
  out.push(slab(LEDGER, BED_TOP, 1, { tone: "lo" }, 3, 0.3))
  out.push(slab({ x: LEDGER.x, y: -33, w: LEDGER.w, d: 6, r: 2.6 }, BED_TOP, 4.6, { tone: "mid" }, 6, 0.4))
  out.push(L([-12, 4, 22].map((x) => k.segment([x, -27, BED_TOP + 4.6], [x, -27, BED_TOP + 0.6], P)).join(""), { tone: "faint" }))
  return out.join("")
}
// the "next" slip: recorded in the same write as the output; slides out from between the pages
const TAB = { x: 26, y: 15, w: 12, d: 6, r: 0.8 }
const tab = () => slab(TAB, 8.4, 0.6, { tone: "hi", crease: "lo" }, 2, 0) + D([at([TAB.x + TAB.w - 2, TAB.y + 3, 9])], { size: 0.5, tone: "hi" })
function pages() {
  const out = []
  const top = CARD_Z
  out.push(S(k.slabOf(PAGES, BED_TOP + 1, top - BED_TOP - 1, P, 3, 0.3), { tone: "hi", crease: "lo", inner: [7.6, 8.6].map((z) => seam(PAGES, z, 3)).join("") }))
  // printed rules across the page (free: they stand for text)
  const rules = []
  for (let y = -24; y <= 20; y += 4) rules.push(k.lineOnTop([-4, y], [36, y], top, P))
  out.push(L(rules.join(""), { tone: "faint", free: true }))
  // the step column: one box per step of the run
  STEP_ROWS.forEach((y, i) => {
    out.push(L(k.planOutline({ x: -22, y: y - 2.5, w: 5, d: 5, r: 0.6 }, top, P, 2), { tone: "lo" }))
    out.push(L(k.lineOnTop([-14, y], [-14 + (i % 2 ? 6 : 8), y], top, P), { tone: "lo", free: true }))
    if (i < NOW) out.push(L(k.onTop([[-22, y - 0.4], [-19.6, y + 1.6], [-17.6, y - 1.8]], top, P), { tone: "hi" }))
  })
  // the earlier steps' imprints, small, down the margin
  return out.join("")
}
const checkNow = () => L(k.onTop([[-22, STEP_ROWS[NOW] - 0.4], [-19.6, STEP_ROWS[NOW] + 1.6], [-17.6, STEP_ROWS[NOW] - 1.8]], CARD_Z, P), { tone: "lit" })
const workingNow = () => D([at([-19.5, STEP_ROWS[NOW], CARD_Z])], { size: 0.9, tone: "mid" })
function imprint(z, tone, cx = 20) {
  return L([k.ring(cx, 0, 7, z, P, 40), k.ring(cx, 0, 5.4, z, P, 36), k.lineOnTop([cx - 5.4, 0], [cx + 5.4, 0], z, P), k.lineOnTop([cx, -5.4], [cx, 5.4], z, P)].join(""), { tone })
}

// ---- the card: the job (lit accent) ----
function card() {
  const top = CARD_Z + CARD_T
  const out = [S(k.slabOf(CARD, CARD_Z, CARD_T, P, 2, 0.3), { tone: "hi", lit: true })]
  out.push(L(k.planOutline(k.insetPlan(CARD, 2), top, P, 2), { tone: "faint" }))
  // the job id printed on the card: run-step-revision
  out.push(L([0, 1, 2].map((i) => k.lineOnTop([CARD.x + 4, CARD.y + 5 + i * 3], [CARD.x + 4 + [16, 10, 6][i], CARD.y + 5 + i * 3], top, P)).join(""), { tone: "mid", free: true }))
  out.push(D([at([CARD.x + CARD.w - 5, CARD.y + 5, top])], { size: 0.9, tone: "hi" }))
  return out.join("")
}
const cardInk = () => imprint(CARD_Z + CARD_T, "lit", 20 - M.SLIDE)

// ---- stamp press ----
function latchBack() {
  const out = []
  out.push(slab({ x: LATCH_X - 2, y: -8, w: 12, d: 16, r: 1.5 }, BED_TOP, 2, { tone: "mid" }, 3, 0.4))
  // guide block: the bolt rides on its top
  out.push(slab({ x: LATCH_X, y: -5, w: 8, d: 10, r: 1 }, BED_TOP + 2, 25 - BED_TOP - 2, { tone: "mid", inner: seam({ x: LATCH_X, y: -5, w: 8, d: 10, r: 1 }, 18, 2) }, 2, 0.4))
  out.push(slab({ x: LATCH_X + 1.5, y: -4.4, w: 5, d: 1.8, r: 0.4 }, 25, 3, { tone: "mid" }, 2, 0))
  return out.join("")
}
function bolt() {
  const out = [slab(BOLT, 25, 3, { tone: "hi", crease: "lo" }, 2, 0.3)]
  out.push(L(k.planOutline({ x: BOLT.x + 2, y: -0.7, w: BOLT.w - 4, d: 1.4, r: 0.7 }, 28, P, 2), { tone: "lo" }))
  out.push(cyl(BOLT.x + BOLT.w + 2, 0, 2.6, 24.4, 4.2, { tone: "mid" }, 20, 0.3))
  return out.join("")
}
function latchFront() {
  const out = []
  out.push(slab({ x: LATCH_X + 1.5, y: 2.6, w: 5, d: 1.8, r: 0.4 }, 25, 3, { tone: "mid" }, 2, 0))
  out.push(slab({ x: LATCH_X + 1.2, y: -4.6, w: 5.6, d: 9.2, r: 0.6 }, 28, 1.2, { tone: "mid" }, 2, 0.2))
  out.push(D([at([LATCH_X + 4, -3.5, 29.2]), at([LATCH_X + 4, 3.5, 29.2])], { size: 0.4 }))
  return out.join("")
}
function head() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(HEAD, 2), CARD_Z + CARD_T, 0.1, P)}" data-part="head-halo" style="opacity:0"/>`]
  out.push(S(k.slabOf(HEAD, HEAD_Z, 3, P, 3, 0.4), { tone: "hi", crease: "lo" }))
  out.push(S(k.slabOf(k.insetPlan(HEAD, 1.6), HEAD_Z + 3, 5, P, 3, 0.5), { tone: "mid", inner: seam(k.insetPlan(HEAD, 1.6), HEAD_Z + 5.5, 3) }))
  out.push(D([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => at([20 + sx * 7.4, sy * 6.4, HEAD_Z + 8])), { size: 0.45 }))
  out.push(cyl(20, 0, 4, HEAD_Z + 8, Z.HEAD_TOP - HEAD_Z - 8, { tone: "mid" }, 24, 0.3))
  return out.join("")
}
function arm() {
  const out = []
  out.push(S(k.slabOf(ARM, ARM_Z0, ARM_Z1 - ARM_Z0, P, 4, 0.8), { tone: "mid", inner: seam(ARM, 74) }))
  out.push(screws([[ARM.x + 4, ARM.y + 4], [ARM.x + ARM.w - 4, ARM.y + 4], [ARM.x + 4, ARM.y + ARM.d - 4], [ARM.x + ARM.w - 4, ARM.y + ARM.d - 4]], ARM_Z1, 1))
  // gland the rod slides through
  out.push(cyl(20, 0, 4.4, ARM_Z1, Z.GLAND_TOP - ARM_Z1, { tone: "mid" }, 28, 0.4))
  out.push(L(k.ring(20, 0, 2.7, Z.GLAND_TOP, P, 24), { tone: "faint" }))
  // pinion hub on the side, with a knurled cap
  out.push(slab({ x: ARM.x + ARM.w, y: -26, w: 3, d: 12, r: 1 }, 71.5, 7, { tone: "mid" }, 2, 0.3))
  return out.join("")
}
function dial() {
  const { x, y, r, top } = Z.DIAL
  const out = []
  out.push(cyl(x, y, r + 1, ARM_Z1, 1.4, { tone: "mid" }, 48))
  out.push(S(k.cylinder(x, y, r, ARM_Z1 + 1.4, top - ARM_Z1 - 1.4, P, 56, 0.6), { tone: "hi", crease: "lo" }))
  out.push(L(k.knurl(x, y, r, top - 2.6, top, 64, P, 0.3), { tone: "lo" }))
  out.push(L(k.sideArc(x, y, r, top - 2.6, P, 32), { tone: "faint" }))
  out.push(L(k.ring(x, y, r - 1.8, top, P, 48), { tone: "lo" }))
  const t = k.radialTicks(x, y, r - 1.8, 60, 5, top, [1.1, 2.3], P)
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }))
  out.push(L(k.ring(x, y, 1.3, top, P, 14), { tone: "mid" }))
  // crown on the +x side
  out.push(slab({ x: x + r - 0.5, y: y - 1.8, w: 3.4, d: 3.6, r: 0.8 }, ARM_Z1 + 1.8, 2.6, { tone: "mid", crease: "none" }, 2, 0))
  out.push(cyl(x + r + 4.2, y, 1.9, ARM_Z1 + 1.2, 3.8, { tone: "mid" }, 16))
  return out.join("")
}
const LAMP = [28, -14]
function lamp() {
  const [x, y] = LAMP
  return cyl(x, y, 3.2, ARM_Z1, 1.6, { tone: "mid" }, 24, 0.3) + cyl(x, y, 2.3, ARM_Z1 + 1.6, 2.4, { tone: "hi", crease: "lo" }, 20, 0.3)
}
const lampDot = () => D([at([LAMP[0], LAMP[1], ARM_Z1 + 4])], { size: 1.25, tone: "hi" })

// ---- the next actor's mailbox and the send tube ----
const WIN = { u0: 5, u1: 23, v0: 5, v1: 15 } // window on the box's front face, local units (u along x, v down from the top)
function boxSvg() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BOX, 0, 2, P)}" style="opacity:.2"/>`]
  out.push(S(k.slabOf(BOX, 0, BOX_H, P, 4, 0.8), { tone: "mid", inner: seam(BOX, 3) }))
  out.push(screws([[BOX.x + 3.5, BOX.y + 3.5], [BOX.x + BOX.w - 3.5, BOX.y + 3.5], [BOX.x + 3.5, BOX.y + BOX.d - 3.5], [BOX.x + BOX.w - 3.5, BOX.y + BOX.d - 3.5]], BOX_H, 1))
  const m = k.sideMatrix([BOX.x + 2, BOX.y + BOX.d], BOX_H, P, "left")
  const { u0, u1, v0, v1 } = WIN
  out.push(`<g transform="${m}"><path class="f2-window" d="M${u0} ${v0}H${u1}V${v1}H${u0}Z"/><path class="iso-line" data-tone="faint" d="M${u0 - 1.2} ${v0 - 1.2}H${u1 + 1.2}V${v1 + 1.2}H${u0 - 1.2}Z"/>` +
    `<text class="iso-face-text f2-digit" data-part="jobs" data-tone="hi" x="${(u0 + u1) / 2}" y="${v1 - 2.2}" font-size="7.6" text-anchor="middle">0</text>` +
    `<circle class="f2-rivet" cx="${u0 - 2.8}" cy="${(v0 + v1) / 2}" r=".45"/><circle class="f2-rivet" cx="${u1 + 2.8}" cy="${(v0 + v1) / 2}" r=".45"/></g>`)
  // tube flange, tube, band
  out.push(cyl(TUBE[0], TUBE[1], TUBE_R + 2.2, BOX_H, 2.4, { tone: "mid" }, 40, 0.4))
  out.push(D(k.circleRing(TUBE[0], TUBE[1], TUBE_R + 1.2, 8).filter(([px, py]) => k.depthOf([px - TUBE[0], py - TUBE[1], 0], P) > -1).map(([px, py]) => at([px, py, BOX_H + 2.4])), { size: 0.4 }))
  out.push(S(k.cylinder(TUBE[0], TUBE[1], TUBE_R, BOX_H + 2.4, 40 - BOX_H - 2.4, P, 48), { tone: "hi", crease: "none", inner: L(k.sideArc(TUBE[0], TUBE[1], TUBE_R, 32, P, 32), { tone: "faint" }) }))
  out.push(cyl(TUBE[0], TUBE[1], TUBE_R + 1, 40, 3, { tone: "mid" }, 40, 0.3))
  out.push(S(k.cylinder(TUBE[0], TUBE[1], TUBE_R, 43, TUBE_TOP - 43, P, 48), { tone: "hi", crease: "none", inner: L(k.sideArc(TUBE[0], TUBE[1], TUBE_R, 50, P, 32), { tone: "faint" }) }))
  // head plate with the mouth, and the gate's guides
  out.push(S(k.slabOf(HEADPLATE, TUBE_TOP, HP_TOP - TUBE_TOP, P, 3, 0.4), { tone: "mid" }))
  out.push(`<path class="f2-void" d="${k.ring(TUBE[0], TUBE[1], TUBE_R - 1, HP_TOP, P, 40)}"/>`)
  out.push(L(k.ring(TUBE[0], TUBE[1], TUBE_R - 1, HP_TOP, P, 40), { tone: "lo" }))
  for (const x of [HEADPLATE.x + 0.6, HEADPLATE.x + HEADPLATE.w - 2.6]) out.push(slab({ x, y: HEADPLATE.y + 1, w: 2, d: HEADPLATE.d - 2, r: 0.6 }, HP_TOP, 2.2, { tone: "mid" }, 2, 0.2))
  out.push(D([at([HEADPLATE.x + 1.6, HEADPLATE.y + HEADPLATE.d - 3, HP_TOP + 2.2]), at([HEADPLATE.x + HEADPLATE.w - 1.6, HEADPLATE.y + HEADPLATE.d - 3, HP_TOP + 2.2])], { size: 0.4 }))
  return out.join("")
}
function gate() {
  return slab(GATE, HP_TOP, 1.4, { tone: "hi", crease: "lo" }, 2, 0.3) + cyl(GATE.x + GATE.w / 2, GATE.y + GATE.d + 1.4, 1.6, HP_TOP + 0.2, 2.4, { tone: "mid" }, 16) + L(k.planOutline({ x: GATE.x + 3, y: GATE.y + GATE.d - 4, w: GATE.w - 6, d: 1.6, r: 0.8 }, HP_TOP + 1.4, P, 2), { tone: "lo" })
}
function capsule() {
  const z0 = HP_TOP + 1.4
  const [x, y] = TUBE
  return cyl(x, y, CAP_R, z0, 10, { tone: "hi", crease: "lo", inner: L(k.sideArc(x, y, CAP_R, z0 + 5, P, 20), { tone: "faint" }) }, 32, 0.3) + cyl(x, y, 2.6, z0 + 10, 1.6, { tone: "mid" }, 20, 0.3) + D([at([x, y, z0 + 11.6])], { size: 0.5 })
}
// clip for the capsule: everything above the mouth, plus the mouth itself
function mouthClip() {
  const pts = []
  const [vx, vy] = k.towardViewer(P)
  const facing = Math.atan2(vy, vx)
  for (let i = 0; i <= 40; i++) {
    const a = facing - Math.PI / 2 + (i / 40) * Math.PI
    pts.push(at([TUBE[0] + (TUBE_R - 1) * Math.cos(a), TUBE[1] + (TUBE_R - 1) * Math.sin(a), HP_TOP]))
  }
  pts.sort((a, b) => a[0] - b[0])
  const left = pts[0]
  const right = pts[pts.length - 1]
  return `M${left[0] - 20} -50L${left[0] - 20} ${left[1]}L${left[0]} ${left[1]}${pts.map(([px, py]) => `L${px.toFixed(2)} ${py.toFixed(2)}`).join("")}L${right[0] + 20} ${right[1]}L${right[0] + 20} -50Z`
}

// ---- first frame from the model ----
const s0 = M.stateAt(0)
const move = (dx, dy, dz) => k.translateAlong(P, [dx, dy, dz])

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "A desk stamping station. A job card slides from an inbox tray under an arbor press, which stamps it into a bound ledger, the run document. The one stamp writes the output, ticks the step done, pushes out a 'next' slip and drops the done bolt under the press head. Only then does a gate open and drop a capsule, the next message, into a send tube over the next actor's mailbox. A second copy of the same card is stopped by the done bolt and only re-sends the capsule.",
  body: [
    `<defs><clipPath id="f2-mouth"><path d="${mouthClip()}"/></clipPath></defs>`,
    base(),
    trayBack(),
    tableBack(),
    bed(),
    ledger(),
    g("tab", tab(), ` transform="${move(-TAB.w + 4, 0, 0)}"`),
    pages(),
    g("ink", imprint(CARD_Z, "hi"), ` opacity="0"`),
    g("working", workingNow(), ` opacity="0"`),
    g("check", checkNow(), ` opacity="0"`),
    g("card", card() + g("card-ink", cardInk(), ` opacity="0"`), ` transform="${move(0, 0, 0)}"`),
    tableFront(),
    trayFront(),
    latchBack(),
    g("bolt", bolt(), ` transform="${move(BOLT_OUT, 0, 0)}"`),
    g("head", head()),
    g("plunger", Z.plungerSvg(k, P, 0)),
    latchFront(),
    arm(),
    dial(),
    `<path data-part="needle" class="iso-line" data-tone="hi" data-free="start" d="${Z.needleOf(k, P, 0)}" style="stroke-width:1"/>`,
    lamp(),
    g("lamp", lampDot()),
    g("rodtop", Z.rodTopSvg(k, P, 0)),
    boxSvg(),
    g("gate", gate()),
    `<g clip-path="url(#f2-mouth)">${g("capsule", capsule(), ` opacity="0"`)}</g>`,
  ],
})

const DATA = {
  P, STROKE: M.STROKE, SLIDE: M.SLIDE, DROP: M.DROP, ACTS: M.ACTS, CYCLE: M.CYCLE, STILL_AT: M.STILL_AT,
  TAB_IN: -TAB.w + 4, BOLT_OUT, GATE_OPEN,
}

const KIT = strip(join(HERE, "..", "..", "_kit", "iso-kit.mjs"))
const live = `${KIT}
const KIT = { iso, pathOf, towardViewer, lineSvg, solidSvg, cylinder, lineOnTop };
${strip(join(HERE, "model.mjs"))}
${strip(join(HERE, "shapes.mjs"))}
const DATA = ${JSON.stringify(DATA)};
${readFileSync(join(HERE, "live.js"), "utf8")}`

const body = k.plateHtml({
  fig: "Fig 2",
  title: "save, then send",
  hint: "click to step",
  readout: M.readoutOf(s0),
  body: `<div class="iso-stage" tabindex="0" role="group" aria-roledescription="figure" aria-label="Save, then send. Click or press the right arrow to step: a normal step, the same job delivered twice, a worker that dies after the save. Space pauses.">${svg}<span class="f2-live" aria-live="polite"></span></div>`,
})

const PAGE_CSS = `
html,body{height:100%;margin:0;overflow:hidden}
body.iso{background:var(--anatomy-page)}
.iso[data-theme="light"]{
  --anatomy-page:#edeae3;--anatomy-card:#edeae3;--anatomy-paper:#edeae3;--anatomy-text:#4f4b44;--anatomy-strong:#1d1b17;--anatomy-muted:#8a857b;
  --anatomy-face:#f8f6f1;--anatomy-top:#f6f4ee;
  --anatomy-shade-0:#c6c0b3;--anatomy-shade-1:#d2cdc2;--anatomy-shade-2:#dcd8ce;--anatomy-shade-3:#e5e1d8;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#efede7;
  --anatomy-hi:#24221d;--anatomy-mid:#746f66;--anatomy-lo:#a09a8f;--anatomy-faint:#c8c2b6;--anatomy-lit:#000000;
  --anatomy-halo:#6f6556;--anatomy-halo-opacity:.34;--anatomy-dot:#38352e;
}
.iso-page{width:100%;height:100%;margin:0}
.iso-figure{margin:0;height:100%}
.iso-plate{position:relative;height:100%;padding:0;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--anatomy-mid) 45%,transparent);overflow:hidden}
.iso-stage{position:absolute;inset:0;outline:none;cursor:pointer;touch-action:pan-y}
.iso-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:-6px}
.iso-stage .iso-svg{position:absolute;inset:0;width:100%;height:100%;margin:0}
.iso-plate-corners{inset:clamp(10px,3.2vmin,22px) clamp(12px,3.2vw,26px);z-index:1}
.iso-plate-corner{font-size:clamp(8px,1.5vw,11.5px)}
.f2-window{fill:var(--anatomy-shade-0);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}
.f2-void{fill:var(--anatomy-shade-0);stroke:none}
.f2-rivet{fill:var(--anatomy-dot);opacity:.45}
.f2-digit{font-weight:600}
.f2-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:560px){.iso-plate{padding:0}.iso-plate-corner[data-corner="hint"]{bottom:0}}
`

const html = k.pageHtml({ title: "Save, then send", theme, body, script: live })
  .replace("</style>", `${PAGE_CSS}</style>`)

const out = light ? join(ROOT, "public", "blog", "actor-based-multi-agent-systems", "fig-2.html") : join(HERE, "fig-2-dark.html")
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, html)
console.log("wrote", out, `${Math.round(html.length / 1024)} KB`)
