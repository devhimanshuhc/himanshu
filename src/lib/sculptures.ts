import * as THREE from "three"
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

/**
 * Procedural architectural models for the project explorer. Each one is built
 * from three.js primitives, then sampled into a point cloud — the same pipeline
 * as exporting a real building model to a point cloud, without shipping assets.
 */

export type SculptureKind = "terraces" | "canopy" | "stadium" | "tower" | "pleats" | "amphitheatre"

const merge = (parts: THREE.BufferGeometry[]) => {
  const geometry = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))
  parts.forEach((p) => p.dispose())
  return geometry
}

const column = (x: number, z: number, h: number, r = 0.03) => {
  const g = new THREE.CylinderGeometry(r, r, h, 8, Math.max(2, Math.round(h * 10)), true)
  g.translate(x, h / 2, z)
  return g
}

const slab = (w: number, d: number, y: number, t = 0.05) => {
  const g = new THREE.BoxGeometry(w, t, d, Math.round(w * 12), 1, Math.round(d * 12))
  g.translate(0, y + t / 2, 0)
  return g
}

// stepped terraces on columns — work handed down level by level
function terraces() {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < 5; i++) {
    const w = 2.8 - i * 0.42
    const d = 1.9 - i * 0.26
    const y = i * 0.5
    const g = slab(w, d, y, 0.035)
    g.translate(i * 0.12, 0, -i * 0.08)
    parts.push(g)
    if (i < 4) {
      const cw = (2.8 - (i + 1) * 0.42) / 2 - 0.08
      const cd = (1.9 - (i + 1) * 0.26) / 2 - 0.08
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const c = column(sx * cw, sz * cd, 0.465, 0.045)
        c.translate((i + 1) * 0.12, y + 0.035, -(i + 1) * 0.08)
        parts.push(c)
      }
    }
  }
  return merge(parts)
}

// a pavilion under a vaulted canopy, carried on slender columns
function canopy() {
  const w = 3.2
  const d = 2.2
  const bays = 4
  const roof = new THREE.PlaneGeometry(w, d, 120, 80)
  roof.rotateX(-Math.PI / 2)
  const pos = roof.attributes.position
  for (let v = 0; v < pos.count; v++) {
    const x = pos.getX(v)
    const z = pos.getZ(v)
    const vx = Math.abs(Math.sin(((x + w / 2) / w) * Math.PI * bays))
    const vz = Math.abs(Math.sin(((z + d / 2) / d) * Math.PI * 3))
    pos.setY(v, 0.95 + 0.32 * Math.pow(vx * vz, 0.6))
  }
  const parts: THREE.BufferGeometry[] = [roof, slab(w * 1.05, d * 1.05, 0, 0.03)]
  for (let i = 0; i <= bays; i++) {
    for (let j = 0; j <= 3; j++) {
      parts.push(column(-w / 2 + (i * w) / bays, -d / 2 + (j * d) / 3, 0.95, 0.025))
    }
  }
  return merge(parts)
}

// a ribbon building wrapped around an oval pitch, rising and falling as it goes round
function stadium() {
  const a = 1.6
  const b = 1.05
  const ribbon = new THREE.PlaneGeometry(1, 1, 220, 14)
  const pos = ribbon.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getX(i) + 0.5 // 0..1 around
    const v = pos.getY(i) + 0.5 // 0..1 up
    const ang = t * Math.PI * 2
    const h = 0.35 + 0.65 * Math.pow(Math.sin(ang * 0.5 + 0.6), 2)
    const lean = 1 + 0.28 * v // leans outward as it rises, like seating
    pos.setXYZ(i, Math.cos(ang) * a * lean, v * h, Math.sin(ang) * b * lean)
  }
  const pitch = new THREE.CircleGeometry(1, 64)
  pitch.rotateX(-Math.PI / 2)
  pitch.scale(a * 0.78, 1, b * 0.78)
  pitch.translate(0, 0.02, 0)
  return merge([ribbon, pitch])
}

// a twisting tower skeleton: floor plates around a core, beside a shorter twin
function tower() {
  const parts: THREE.BufferGeometry[] = []
  const build = (x: number, z: number, floors: number, twist: number) => {
    for (let f = 0; f < floors; f++) {
      const g = new THREE.BoxGeometry(0.7, 0.03, 0.7, 10, 1, 10)
      g.rotateY(f * twist)
      g.translate(x, f * 0.2 + 0.03, z)
      parts.push(g)
    }
    parts.push(column(x, z, floors * 0.2, 0.09))
  }
  build(-0.45, 0, 14, 0.06)
  build(0.6, 0.35, 8, -0.05)
  parts.push(slab(2.2, 1.6, 0, 0.03))
  return merge(parts)
}

// a pleated, folded-plate roof over a slab — like a sheet of paper creased into structure
function pleats() {
  const w = 3
  const d = 1.8
  const folds = 9
  const roof = new THREE.PlaneGeometry(w, d, folds * 2 * 6, 30)
  roof.rotateX(-Math.PI / 2)
  const pos = roof.attributes.position
  for (let v = 0; v < pos.count; v++) {
    const x = pos.getX(v)
    const z = pos.getZ(v)
    const phase = ((x + w / 2) / w) * folds
    const tri = Math.abs((phase % 1) - 0.5) * 2 // 0..1 zigzag
    pos.setY(v, 0.85 + tri * 0.32 + z * 0.12)
  }
  const parts: THREE.BufferGeometry[] = [roof, slab(w * 0.92, d * 0.9, 0, 0.04)]
  for (const x of [-1.3, -0.45, 0.45, 1.3]) {
    for (const z of [-0.7, 0.7]) parts.push(column(x, z, 0.85 + z * 0.12, 0.028))
  }
  return merge(parts)
}

// stepped seating in a half circle around a small stage
function amphitheatre() {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < 8; i++) {
    const r = 0.55 + i * 0.2
    const y = i * 0.11
    const tread = new THREE.RingGeometry(r, r + 0.2, 64, 2, 0, Math.PI)
    tread.rotateX(-Math.PI / 2)
    tread.translate(0, y + 0.11, 0)
    const riser = new THREE.CylinderGeometry(r, r, 0.11, 64, 1, true, Math.PI / 2, Math.PI)
    riser.translate(0, y + 0.055, 0)
    parts.push(tread, riser)
  }
  const stage = new THREE.CircleGeometry(0.5, 40, Math.PI, Math.PI)
  stage.rotateX(-Math.PI / 2)
  stage.translate(0, 0.02, 0)
  parts.push(stage)
  return merge(parts)
}

const builders: Record<SculptureKind, () => THREE.BufferGeometry> = {
  terraces,
  canopy,
  stadium,
  tower,
  pleats,
  amphitheatre,
}

/** Sample a model's surface into `count` points, centred on the ground and scaled to ~`size` units. */
export function sampleSculpture(kind: SculptureKind, count: number, size = 2.6) {
  const geometry = builders[kind]()
  geometry.computeBoundingBox()
  const box = geometry.boundingBox as THREE.Box3
  const center = box.getCenter(new THREE.Vector3())
  const extent = box.getSize(new THREE.Vector3())
  const scale = size / Math.max(extent.x, extent.y, extent.z)
  geometry.translate(-center.x, -box.min.y, -center.z)
  geometry.scale(scale, scale, scale)

  const sampler = new MeshSurfaceSampler(new THREE.Mesh(geometry)).build()
  const positions = new Float32Array(count * 3)
  const rand = new Float32Array(count)
  const v = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    sampler.sample(v)
    positions.set([v.x, v.y, v.z], i * 3)
    rand[i] = Math.random()
  }
  geometry.dispose()

  const points = new THREE.BufferGeometry()
  points.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  points.setAttribute("aRand", new THREE.BufferAttribute(rand, 1))
  return points
}

export const SCULPTURE_FOR: Record<string, SculptureKind> = {
  retro: "terraces",
  evra: "canopy",
  medurun: "stadium",
  equitynav: "tower",
  quotient: "pleats",
  datasays: "amphitheatre",
}

export const SCULPTURE_ORDER: SculptureKind[] = ["terraces", "canopy", "stadium", "tower", "pleats", "amphitheatre"]
