// Parts that change shape as the stamp moves. Imported by the build and inlined into the page,
// so the first frame and every later frame come from the same code. `k` is the iso kit.

export const ROD = { x: 20, y: 0, r: 2.2 }
export const HEAD_TOP = 40 // top of the head collar at rest
export const ARM_BOTTOM = 70
export const GLAND_TOP = 83
export const ROD_TOP = 104 // rod tip at rest
export const SPRING_R = 4.4
export const DIAL = { x: 20, y: -32, r: 9.5, top: 86 }

function helix(k, P, cx, cy, r, z0, z1, turns) {
  const [vx, vy] = k.towardViewer(P)
  const count = Math.round(turns * 40)
  const front = []
  const back = []
  let run = null
  let side = null
  let prev = null
  for (let i = 0; i <= count; i++) {
    const a = (i / count) * turns * Math.PI * 2 + 0.6
    const p = [cx + r * Math.cos(a), cy + r * Math.sin(a), z0 + ((z1 - z0) * i) / count]
    const facing = Math.cos(a) * vx + Math.sin(a) * vy >= 0 ? "front" : "back"
    const q = k.iso(p, P)
    if (facing !== side) {
      run = prev ? [prev, q] : [q]
      ;(facing === "front" ? front : back).push(run)
      side = facing
    } else run.push(q)
    prev = q
  }
  const d = (runs) => runs.filter((r) => r.length > 1).map((r) => k.pathOf(r)).join("")
  return { front: d(front), back: d(back) }
}

// The rod between the head and the arm, wrapped by its return spring: back coil, rod, front coil.
export function plungerSvg(k, P, dz) {
  const top = HEAD_TOP - dz
  const coil = helix(k, P, ROD.x, ROD.y, SPRING_R, top, ARM_BOTTOM, 6.5)
  return (
    k.lineSvg(coil.back, { tone: "lo" }) +
    k.solidSvg(k.cylinder(ROD.x, ROD.y, ROD.r, top, ARM_BOTTOM - top, P, 20), { tone: "mid", crease: "none" }) +
    k.lineSvg(coil.front, { tone: "mid" })
  )
}

// The rod above the gland, and its cap.
export function rodTopSvg(k, P, dz) {
  const tip = ROD_TOP - dz
  return (
    k.solidSvg(k.cylinder(ROD.x, ROD.y, ROD.r, GLAND_TOP, tip - GLAND_TOP, P, 20), { tone: "mid", crease: "none" }) +
    k.solidSvg(k.cylinder(ROD.x, ROD.y, 3.4, tip, 3, P, 24, 0.4), { tone: "mid" })
  )
}

// The time-clock needle: one turn while the step runs.
export function needleOf(k, P, turn) {
  const a = turn * Math.PI * 2
  const { x, y, r, top } = DIAL
  return k.lineOnTop([x - Math.sin(a) * 2.6, y + Math.cos(a) * 2.6], [x + Math.sin(a) * (r - 3.4), y - Math.cos(a) * (r - 3.4)], top + 0.2, P)
}
