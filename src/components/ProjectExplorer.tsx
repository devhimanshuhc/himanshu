import * as React from "react"
import * as THREE from "three"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Html } from "@react-three/drei"

import { CONTENT } from "@/lib/content"
import { sampleSculpture, SCULPTURE_FOR, SCULPTURE_ORDER, type SculptureKind } from "@/lib/sculptures"
import { cn } from "@/lib/utils"

type Project = (typeof CONTENT.projects)[number]

const pad = (n: number) => String(n).padStart(2, "0")

// tiny external store: lets components inside <Canvas> follow explorer state
// without the whole Canvas re-rendering (which re-creates drei Html roots)
function createStore<T>(initial: T) {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set: (next: T) => {
      if (next === value) return
      value = next
      listeners.forEach((l) => l())
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
type Store<T> = ReturnType<typeof createStore<T>>
const smooth = (t: number) => t * t * (3 - 2 * t)

// where each sculpture sits in the world, and the angle the camera frames it from
const SPOTS: { pos: [number, number, number]; yaw: number }[] = [
  { pos: [-3.4, 0, -0.6], yaw: -0.35 },
  { pos: [-0.6, 0, -3.6], yaw: 0.15 },
  { pos: [2.9, 0, -1.4], yaw: -0.1 },
  { pos: [3.2, 0, -4.9], yaw: 0.3 },
  { pos: [-2.2, 0, 2.7], yaw: -0.1 },
  { pos: [1.7, 0, 2.3], yaw: 0.25 },
]
const spotFor = (i: number) => SPOTS[i % SPOTS.length]
// the plaza every path leads back to
const PLAZA = new THREE.Vector3(0.1, 0, -0.9)

// ---------------------------------------------------------------------------
// shaders
// ---------------------------------------------------------------------------
const pointVertex = /* glsl */ `
uniform float uTime;
uniform float uActive;
uniform float uSize;
attribute float aRand;
varying float vAlpha;
varying float vActive;
void main(){
  vec3 p = position;
  p.y += sin(uTime * 0.8 + aRand * 40.0) * 0.008;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  gl_PointSize = uSize * (0.5 + aRand * 0.8) * (1.0 + uActive * 0.15) / depth;
  float fog = 1.0 - smoothstep(10.0, 32.0, depth);
  vAlpha = (0.22 + 0.68 * uActive) * (0.45 + 0.55 * aRand) * fog;
  vActive = uActive;
}
`

const pointFragment = /* glsl */ `
varying float vAlpha;
varying float vActive;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  vec3 grey = vec3(0.6, 0.59, 0.56);
  vec3 amber = vec3(0.95, 0.6, 0.28);
  gl_FragColor = vec4(mix(grey, amber, vActive), a);
}
`

const beamVertex = /* glsl */ `
varying vec2 vUv;
varying float vFog;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vFog = 1.0 - smoothstep(10.0, 34.0, -mv.z);
}
`

const beamFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
uniform float uSeed;
varying vec2 vUv;
varying float vFog;
void main(){
  float edge = pow(sin(3.14159 * vUv.x), 2.0);
  float fade = smoothstep(0.0, 0.12, vUv.y) * pow(1.0 - vUv.y, 1.3);
  float flicker = 0.85 + 0.15 * sin(uTime * 1.3 + uSeed * 10.0);
  gl_FragColor = vec4(uColor, edge * fade * uOpacity * flicker * vFog);
}
`

const AMBER = new THREE.Color("#f0973f")
const TEAL = new THREE.Color("#6fb3cc")
const BONE = new THREE.Color("#edeae3")

// ---------------------------------------------------------------------------
// scene pieces
// ---------------------------------------------------------------------------
type Focus = { current: () => number }
type Clock = { reduced: boolean }

function Beams({ focus, clock, seed }: { focus: Focus; clock: Clock; seed: number }) {
  const beams = React.useMemo(() => {
    const rand = mulberry(seed)
    return Array.from({ length: 4 }, (_, i) => {
      const w = 0.05 + rand() * 0.32
      const geometry = new THREE.PlaneGeometry(w, 9)
      geometry.translate(0, 4.5 - 0.4, 0)
      const material = new THREE.ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        uniforms: {
          uColor: { value: BONE.clone() },
          uOpacity: { value: 0.1 },
          uTime: { value: 0 },
          uSeed: { value: seed + i },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
      return {
        geometry,
        material,
        position: [(rand() - 0.5) * 1.6, 0, (rand() - 0.5) * 1.2] as [number, number, number],
        rotation: rand() * Math.PI,
      }
    })
  }, [seed])

  React.useEffect(
    () => () =>
      beams.forEach((b) => {
        b.geometry.dispose()
        b.material.dispose()
      }),
    [beams],
  )

  useFrame((_, delta) => {
    const f = focus.current()
    beams.forEach((b) => {
      const u = b.material.uniforms
      if (!clock.reduced) u.uTime.value += delta
      u.uOpacity.value = 0.08 + f * 0.5
      ;(u.uColor.value as THREE.Color).copy(BONE).lerp(AMBER, f)
    })
  })

  return (
    <>
      {beams.map((b, i) => (
        <mesh key={i} geometry={b.geometry} material={b.material} position={b.position} rotation-y={b.rotation} />
      ))}
    </>
  )
}

function Sculpture({
  kind,
  count,
  focus,
  clock,
  seed,
}: {
  kind: SculptureKind
  count: number
  focus: Focus
  clock: Clock
  seed: number
}) {
  const { gl } = useThree()
  const geometry = React.useMemo(() => sampleSculpture(kind, count, 3.0), [kind, count])
  // built here (not as JSX props) so per-frame uniform writes reach the GPU
  const material = React.useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: pointVertex,
        fragmentShader: pointFragment,
        uniforms: { uTime: { value: 0 }, uActive: { value: 0 }, uSize: { value: 11 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )
  material.uniforms.uSize.value = 11 * gl.getPixelRatio()

  React.useEffect(() => () => geometry.dispose(), [geometry])
  React.useEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    if (!clock.reduced) material.uniforms.uTime.value += delta
    material.uniforms.uActive.value = focus.current()
  })

  return (
    <>
      <points geometry={geometry} material={material} />
      <Beams focus={focus} clock={clock} seed={seed} />
    </>
  )
}

// survey lines: light running along the ground through every building, plus a few overhead
function Streaks({ opacity = 0.22 }: { opacity?: number }) {
  const geometry = React.useMemo(() => {
    const rand = mulberry(7)
    const segs: number[] = []
    const cols: number[] = []
    const c = new THREE.Color()
    const push = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
      segs.push(x0, y0, z0, x1, y1, z1)
      const tint = rand()
      c.copy(tint > 0.75 ? TEAL : tint > 0.3 ? AMBER : BONE).multiplyScalar(0.3 + rand() * 0.5)
      cols.push(c.r, c.g, c.b, c.r, c.g, c.b)
    }
    for (const spot of SPOTS) {
      const [x, , z] = spot.pos
      for (let k = 0; k < 2; k++) {
        const len = 12 + rand() * 12
        const y = 0.02 + rand() * 0.04
        const off = (rand() - 0.5) * 1.2
        push(x - len / 2, y, z + off, x + len / 2, y, z + off)
        push(x + off, y, z - len / 2, x + off, y, z + len / 2)
      }
    }
    for (let i = 0; i < 26; i++) {
      const len = 10 + rand() * 16
      const y = rand() * 0.06
      const a = rand() * 12 - 6
      const b = rand() * 12 - 7
      if (rand() < 0.5) push(-len / 2 + PLAZA.x, y, b, len / 2 + PLAZA.x, y, b)
      else push(a, y, -len / 2 + PLAZA.z, a, y, len / 2 + PLAZA.z)
    }
    for (let i = 0; i < 12; i++) {
      const ang = rand() * Math.PI
      const len = 10 + rand() * 14
      const y = 1 + rand() * 2.5
      const cx = (rand() - 0.5) * 8
      const cz = (rand() - 0.5) * 8 - 1
      push(cx - Math.cos(ang) * len * 0.5, y, cz - Math.sin(ang) * len * 0.5, cx + Math.cos(ang) * len * 0.5, y, cz + Math.sin(ang) * len * 0.5)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(segs), 3))
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(cols), 3))
    return g
  }, [])
  React.useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  )
}

// the ground plane as a dotted site plan: a soft field, contour rings, a pad under
// each building and paths from the plaza to each one — this is what ties the site together
function SitePlan({ clock }: { clock: Clock }) {
  const { gl } = useThree()
  const geometry = React.useMemo(() => {
    const rand = mulberry(41)
    const pts: number[] = []
    const add = (x: number, z: number, y = 0.01) => pts.push(x, y, z)
    // soft field, densest at the plaza
    for (let i = 0; i < 6000; i++) {
      const r = Math.sqrt(-2 * Math.log(1 - rand() * 0.995)) * 3.2
      const a = rand() * Math.PI * 2
      add(PLAZA.x + Math.cos(a) * r, PLAZA.z + Math.sin(a) * r * 0.85)
    }
    // contour rings
    for (const R of [1.3, 4.6, 6.8]) {
      for (let i = 0; i < Math.round(R * 300); i++) {
        const a = rand() * Math.PI * 2
        const j = (rand() - 0.5) * 0.05
        add(PLAZA.x + Math.cos(a) * (R + j), PLAZA.z + Math.sin(a) * (R + j) * 0.85)
      }
    }
    // a pad under each building and a curved path back to the plaza
    const end = new THREE.Vector3()
    const mid = new THREE.Vector3()
    const p = new THREE.Vector3()
    for (const spot of SPOTS) {
      const [x, , z] = spot.pos
      for (let i = 0; i < 900; i++) add(x + (rand() - 0.5) * 3.6, z + (rand() - 0.5) * 3.2, 0.005)
      end.set(x, 0, z)
      mid.copy(PLAZA).lerp(end, 0.5).add(new THREE.Vector3((rand() - 0.5) * 1.4, 0, (rand() - 0.5) * 1.4))
      const curve = new THREE.QuadraticBezierCurve3(PLAZA.clone(), mid.clone(), end.clone())
      for (let i = 0; i < 1100; i++) {
        curve.getPoint(rand(), p)
        add(p.x + (rand() - 0.5) * 0.12, p.z + (rand() - 0.5) * 0.12, 0.015)
      }
    }
    const count = pts.length / 3
    const rnd = new Float32Array(count)
    for (let i = 0; i < count; i++) rnd[i] = rand()
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3))
    g.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1))
    return g
  }, [])
  const material = React.useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: pointVertex,
        fragmentShader: pointFragment,
        uniforms: { uTime: { value: 0 }, uActive: { value: 0.55 }, uSize: { value: 11 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )
  material.uniforms.uSize.value = 11 * gl.getPixelRatio()
  React.useEffect(() => () => geometry.dispose(), [geometry])
  React.useEffect(() => () => material.dispose(), [material])
  useFrame((_, delta) => {
    if (!clock.reduced) material.uniforms.uTime.value += delta
  })
  return <points geometry={geometry} material={material} />
}

// a field of tall light shafts over the whole site; brightest on the opening view
function SiteBeams({ level, clock }: { level: Focus; clock: Clock }) {
  const beams = React.useMemo(() => {
    const rand = mulberry(29)
    return Array.from({ length: 60 }, (_, i) => {
      const height = 7 + rand() * 5
      const geometry = new THREE.PlaneGeometry(0.04 + Math.pow(rand(), 2) * 0.6, height)
      geometry.translate(0, height / 2 - 0.3, 0)
      const material = new THREE.ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        uniforms: {
          uColor: { value: (rand() > 0.62 ? TEAL : AMBER).clone() },
          uOpacity: { value: 0.3 },
          uTime: { value: 0 },
          uSeed: { value: i * 1.7 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
      return {
        geometry,
        material,
        weight: 0.4 + rand() * 0.6,
        // most shafts stand around a building; a few stand loose across the site
        position: (i < 48
          ? [spotFor(i).pos[0] + (rand() - 0.5) * 3.2, 0, spotFor(i).pos[2] + (rand() - 0.5) * 2.8]
          : [PLAZA.x + (rand() - 0.5) * 12, 0, PLAZA.z + (rand() - 0.5) * 10]) as [number, number, number],
        rotation: rand() * Math.PI,
      }
    })
  }, [])

  React.useEffect(
    () => () =>
      beams.forEach((b) => {
        b.geometry.dispose()
        b.material.dispose()
      }),
    [beams],
  )

  useFrame((_, delta) => {
    const l = level.current()
    beams.forEach((b) => {
      const u = b.material.uniforms
      if (!clock.reduced) u.uTime.value += delta
      u.uOpacity.value = b.weight * (0.06 + 0.34 * l)
    })
  })

  return (
    <>
      {beams.map((b, i) => (
        <mesh key={i} geometry={b.geometry} material={b.material} position={b.position} rotation-y={b.rotation} />
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// explorer
// ---------------------------------------------------------------------------
type Shared = {
  stage: number
  pointer: THREE.Vector2
  reduced: boolean
  /** while set (ms timestamp), the camera flies straight to a clicked stage */
  flyUntil: number
}

function shotFor(stage: number, out: { pos: THREE.Vector3; target: THREE.Vector3 }, narrow = false) {
  if (stage <= 0) {
    // high, oblique opening shot over the whole site, like an architectural site model
    if (narrow) out.pos.set(3.5, 10.5, 10)
    else out.pos.set(7, 6, 10)
    out.target.set(0.1, narrow ? -0.6 : 0.2, -1)
    return out
  }
  const spot = spotFor(stage - 1)
  // three-quarter view from the side and above, looking down onto the model
  const offset = new THREE.Vector3(4.6, 4.4, 4.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), spot.yaw)
  out.pos.set(...spot.pos).add(offset)
  out.target.set(spot.pos[0], spot.pos[1] + 0.5, spot.pos[2])
  return out
}

function CameraRig({ shared, stages }: { shared: React.RefObject<Shared>; stages: number }) {
  const { camera, size } = useThree()
  const tmp = React.useMemo(
    () => ({
      a: { pos: new THREE.Vector3(), target: new THREE.Vector3() },
      b: { pos: new THREE.Vector3(), target: new THREE.Vector3() },
      pos: new THREE.Vector3(),
      target: new THREE.Vector3(),
      look: new THREE.Vector3(1, 0, -2),
    }),
    [],
  )

  useFrame((_, delta) => {
    const s = shared.current
    if (!s) return
    const i0 = Math.floor(s.stage)
    const i1 = Math.min(i0 + 1, stages)
    const f = smooth(s.stage - i0)
    const narrow = size.width / size.height < 0.8
    shotFor(i0, tmp.a, narrow)
    shotFor(i1, tmp.b, narrow)
    tmp.pos.lerpVectors(tmp.a.pos, tmp.b.pos, f)
    tmp.target.lerpVectors(tmp.a.target, tmp.b.target, f)
    // lift the camera mid-flight so moves read as an arc, not a slide
    tmp.pos.y += Math.sin(f * Math.PI) * 1.1
    tmp.pos.x += s.pointer.x * 0.35
    tmp.pos.y += s.pointer.y * 0.2

    // after a click, ease in slowly along a direct line; otherwise follow scroll closely
    const flying = performance.now() < s.flyUntil
    const k = s.reduced ? 1 : 1 - Math.pow(flying ? 0.09 : 0.002, Math.min(delta, 1 / 30))
    camera.position.lerp(tmp.pos, k)
    tmp.look.lerp(tmp.target, k)
    camera.lookAt(tmp.look)
  })
  return null
}

function Frameloop({ visible }: { visible: Store<boolean> }) {
  const setFrameloop = useThree((s) => s.setFrameloop)
  const on = React.useSyncExternalStore(visible.subscribe, visible.get)
  React.useEffect(() => setFrameloop(on ? "always" : "never"), [on, setFrameloop])
  return null
}

function ProjectTag({
  project,
  index,
  activeStage,
  portal,
  onSelect,
}: {
  project: Project
  index: number
  activeStage: Store<number>
  portal: React.RefObject<HTMLDivElement | null>
  onSelect: (stage: number) => void
}) {
  // select only "am I active" so a stage change re-renders just the two tags involved
  const active = React.useSyncExternalStore(activeStage.subscribe, () => activeStage.get() === index + 1)
  const opening = React.useSyncExternalStore(activeStage.subscribe, () => activeStage.get() === 0)
  const href = project.link !== "#" ? project.link : project.github !== "#" ? project.github : null
  const meta = `${project.category} · ${project.tech.slice(0, 2).join(", ")}`

  // one Html per project, mounted into a stable portal: if its target element
  // changes (R3F re-points events after mount), drei rebuilds the root mid-render
  return (
    <Html
      portal={portal as React.RefObject<HTMLElement>}
      position={active ? [0, 0.6, 0] : [-1.1, 1.9, 0]}
      center={active}
      zIndexRange={active ? [30, 10] : [20, 0]}
      className={cn(active ? "pointer-events-none" : opening ? "hidden" : "hidden opacity-30 transition-opacity duration-300 hover:opacity-100 md:block")}
    >
      {active ? (
        <div className="animate-in fade-in zoom-in-95 relative h-[190px] w-[min(70vw,300px)] duration-700 md:h-[230px]">
          {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "bottom-0 left-0 border-b border-l", "bottom-0 right-0 border-b border-r"].map(
            (c) => (
              <span key={c} className={cn("absolute size-3.5 border-[#edeae3]", c)} />
            ),
          )}
          <div className="absolute inset-x-2.5 top-2 flex justify-between font-mono text-[11px] leading-[1.7] text-[#edeae3]">
            <span>
              {project.label}
              <br />
              <span className="text-[#edeae3]/55">{meta}</span>
            </span>
            <span>{pad(index + 1)}</span>
          </div>
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-sm text-[#edeae3]/70">
            +
          </span>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto absolute bottom-2 left-2.5 font-mono text-[11px] text-[#edeae3] hover:text-[#f0973f]"
            >
              Explore ↗
            </a>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(index + 1)}
          className="block w-52 border-l border-t border-[#edeae3]/15 pl-2 pt-1.5 text-left font-mono text-[11px] leading-[1.7] text-[#edeae3]/40 transition-colors hover:border-[#edeae3]/50 hover:text-[#edeae3]"
        >
          <span className="flex justify-between pr-1">
            <span className="text-[#edeae3]/75">{project.label}</span>
            <span>{pad(index + 1)}</span>
          </span>
          {meta}
        </button>
      )}
    </Html>
  )
}

const RULER_CELL = 150

export function ProjectExplorer() {
  const projects = CONTENT.projects
  const stages = projects.length
  const section = React.useRef<HTMLElement>(null)
  const ruler = React.useRef<HTMLDivElement>(null)
  const shared = React.useRef<Shared>({ stage: 0, pointer: new THREE.Vector2(), reduced: false, flyUntil: 0 })
  const clock = React.useMemo<Clock>(() => ({ reduced: false }), [])
  const [active, setActive] = React.useState(0)
  const [seen, setSeen] = React.useState<number[]>([])
  const activeStage = React.useMemo(() => createStore(0), [])
  const visible = React.useMemo(() => createStore(true), [])
  const labels = React.useRef<HTMLDivElement>(null)
  const [ready, setReady] = React.useState(false)
  const [mobile, setMobile] = React.useState(false)

  // per-sculpture focus: 1 when the camera is on it, falling to 0 a stage away
  const focuses = React.useMemo<Focus[]>(
    () =>
      projects.map((_, i) => ({
        current: () => {
          const st = shared.current.stage
          return Math.max(1 - Math.abs(st - (i + 1)) * 1.4, 0.6 * (1 - st * 1.6), 0)
        },
      })),
    [projects],
  )
  const openingLevel = React.useMemo<Focus>(() => ({ current: () => Math.max(0, 1 - shared.current.stage * 1.6) }), [])

  React.useEffect(() => {
    const s = shared.current
    s.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    clock.reduced = s.reduced
    setMobile(window.matchMedia("(max-width: 767px)").matches)

    let raf = 0
    let last = performance.now()
    let shown = 0
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 20)
      last = now
      const el = section.current
      if (el) {
        const rect = el.getBoundingClientRect()
        const travel = el.offsetHeight - window.innerHeight
        const target = travel > 0 ? THREE.MathUtils.clamp(-rect.top / travel, 0, 1) * stages : 0
        const k = s.reduced || now < s.flyUntil ? 1 : 1 - Math.pow(0.004, dt)
        s.stage += (target - s.stage) * k
        if (ruler.current) ruler.current.style.transform = `translateX(${-s.stage * RULER_CELL}px)`
        const rounded = Math.round(s.stage)
        if (rounded !== shown) {
          shown = rounded
          setActive(rounded)
          activeStage.set(rounded)
          if (rounded > 0) setSeen((prev) => (prev.includes(rounded) ? prev : [...prev, rounded]))
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    let idle = 0
    let lastY = window.scrollY
    let dir = 0
    const snap = () => {
      const el = section.current
      if (!el || s.reduced || performance.now() < s.flyUntil) return
      const rect = el.getBoundingClientRect()
      const travel = el.offsetHeight - window.innerHeight
      // only while the explorer is pinned
      if (travel <= 0 || rect.top > 1 || rect.bottom < window.innerHeight - 1) return
      const raw = (-rect.top / travel) * stages
      const to = THREE.MathUtils.clamp(
        dir > 0 ? Math.ceil(raw - 0.12) : dir < 0 ? Math.floor(raw + 0.12) : Math.round(raw),
        0,
        stages,
      )
      if (Math.abs(raw - to) < 0.01) return
      const y = rect.top + window.scrollY + (travel * to) / stages
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: 0.9 })
      else window.scrollTo({ top: y, behavior: "smooth" })
    }
    const onScroll = () => {
      const y = window.scrollY
      if (y !== lastY) dir = Math.sign(y - lastY)
      lastY = y
      window.clearTimeout(idle)
      idle = window.setTimeout(snap, 140)
    }
    window.addEventListener("scroll", onScroll, { passive: true })

    const onPointer = (e: PointerEvent) => {
      s.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
    }
    window.addEventListener("pointermove", onPointer, { passive: true })
    const io = new IntersectionObserver(([entry]) => visible.set(entry.isIntersecting))
    if (section.current) io.observe(section.current)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(idle)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("pointermove", onPointer)
      io.disconnect()
    }
  }, [activeStage, clock, stages, visible])

  // jump straight to a stage: scroll moves instantly (no replay of the stages in
  // between) while the camera eases along a direct line to the new shot
  const goTo = React.useCallback(
    (stage: number) => {
      const el = section.current
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY
      const y = top + ((el.offsetHeight - window.innerHeight) * stage) / stages + 1
      shared.current.flyUntil = performance.now() + 1800
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true })
      else window.scrollTo({ top: y })
    },
    [stages],
  )

  // the scene is built once; stage changes reach it through stores, not props
  const scene = React.useMemo(
    () => (
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [7, 6, 10], fov: 42, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={() => setReady(true)}
      >
        <color attach="background" args={["#0b0b0c"]} />
        <fog attach="fog" args={["#0b0b0c", 12, 34]} />
        <Frameloop visible={visible} />
        <CameraRig shared={shared} stages={stages} />
        <SiteBeams level={openingLevel} clock={clock} />
        <SitePlan clock={clock} />
        <Streaks />
        {projects.map((project, i) => {
          const spot = spotFor(i)
          return (
            <group key={project.key} position={spot.pos} rotation-y={spot.yaw}>
              <Sculpture
                kind={SCULPTURE_FOR[project.key] ?? SCULPTURE_ORDER[i % SCULPTURE_ORDER.length]}
                count={mobile ? 9000 : 18000}
                focus={focuses[i]}
                clock={clock}
                seed={i * 13 + 3}
              />
              <ProjectTag project={project} index={i} activeStage={activeStage} portal={labels} onSelect={goTo} />
              {/* invisible hit volume so the sculpture itself is clickable */}
              <mesh
                position={[0, 1.2, 0]}
                onClick={(e) => {
                  e.stopPropagation()
                  goTo(i + 1)
                }}
                onPointerOver={() => (document.body.style.cursor = "pointer")}
                onPointerOut={() => (document.body.style.cursor = "")}
              >
                <boxGeometry args={[2.8, 2.6, 2.8]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
              </mesh>
            </group>
          )
        })}
      </Canvas>
    ),
    [activeStage, clock, focuses, goTo, mobile, openingLevel, projects, stages, visible],
  )

  const current = active > 0 ? projects[active - 1] : null
  const title = current ? current.label : "Himanshu Chauhan"

  return (
    <section
      ref={section}
      data-explorer
      aria-label="selected work"
      className="relative"
      style={{ height: `calc(100svh + ${stages} * 80svh)` }}
    >
      <h1 className="sr-only">Himanshu Chauhan — AI engineer and full stack developer</h1>
      <div className="sticky top-0 flex h-svh flex-col px-[var(--frame)] pb-[var(--frame)] pt-[var(--nav-h)]">
        <p
          aria-hidden="true"
          className="relative z-10 -mb-[0.09em] overflow-hidden pt-3 text-[11.5vw] font-semibold leading-[0.84] tracking-[-0.065em] md:pt-5 md:text-[min(9vw,10.5rem)]"
        >
          <span key={title} className="explorer-title block whitespace-nowrap">
            {title}
          </span>
        </p>

        <div className="grid min-h-0 flex-1 gap-[var(--frame)] lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="void relative min-h-0 overflow-hidden">
            {
              <div
                className="absolute inset-0 transition-opacity duration-[1500ms]"
                style={{ opacity: ready ? 1 : 0 }}
                aria-hidden="true"
              >
                {scene}
              </div>
            }
            <div ref={labels} className="pointer-events-none absolute inset-0 overflow-hidden [&>*]:pointer-events-auto" />

            {/* ruler: the active stage sits under the fixed centre marker */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-14 overflow-hidden" aria-hidden="true">
              <div ref={ruler} className="absolute left-1/2 top-3 will-change-transform">
                {Array.from({ length: stages + 1 }, (_, i) => (
                  <div key={i} className="absolute top-0" style={{ left: i * RULER_CELL, width: RULER_CELL }}>
                    <div className="flex justify-between pr-[15px]">
                      {Array.from({ length: 10 }, (_, t) => (
                        <span key={t} className={cn("block w-px bg-[#edeae3]/30", t === 0 ? "h-3" : "h-1.5")} />
                      ))}
                    </div>
                    <span
                      className={cn(
                        "mt-1.5 inline-block -translate-x-1/2 font-mono text-[11px] transition-colors",
                        i === active ? "text-[#edeae3]" : "text-[#edeae3]/40",
                      )}
                    >
                      {pad(i)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="absolute left-1/2 top-2 flex -translate-x-1/2 gap-[3px]">
                {[2, 3, 4, 3, 2].map((h, i) => (
                  <span key={i} className="block w-[2px] bg-[#edeae3]" style={{ height: h * 4 }} />
                ))}
              </div>
            </div>

            <p className="pointer-events-none absolute bottom-3 left-3 font-mono text-[11px] text-[#edeae3]/55 md:bottom-4 md:left-4">
              Scroll up/down or click to explore
            </p>
            <p className="pointer-events-none absolute bottom-3 right-3 font-mono text-[11px] tabular-nums text-[#edeae3]/55 md:bottom-4 md:right-4">
              {pad(seen.length)}/{pad(stages)} seen
            </p>
          </div>

          <aside className="hidden min-h-0 flex-col justify-end overflow-hidden lg:flex">
            <div key={active} className="panel-in flex min-h-0 flex-col gap-4">
              {current ? (
                <>
                  <p className="text-pretty text-[13px] leading-[1.55]">{current.description}</p>
                  <p className="text-[12px] text-body">
                    {current.category} · {current.tech.join(", ")}
                  </p>
                  <p className="flex gap-4 text-[12px]">
                    {current.link !== "#" && (
                      <a href={current.link} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                        Live site ↗
                      </a>
                    )}
                    {current.github !== "#" && (
                      <a href={current.github} target="_blank" rel="noopener noreferrer" className="text-body underline-offset-4 hover:underline">
                        Source ↗
                      </a>
                    )}
                  </p>
                  <img
                    src={current.image}
                    alt={`${current.label} preview`}
                    className="aspect-[4/3] w-full min-h-0 object-cover"
                    decoding="async"
                  />
                </>
              ) : (
                <>
                  <p className="text-pretty text-[13px] leading-[1.55]">
                    AI engineer and full stack developer based in Dehradun, India. I ship LLMs, RAG and
                    agents to production — and the web and mobile apps on top. Six of them live in this little world.
                  </p>
                  <p className="text-[12px] text-body">Scroll to fly through, or pick one.</p>
                  <ol className="border-t border-border">
                    {projects.map((p, i) => (
                      <li key={p.key} className="border-b border-border">
                        <button
                          type="button"
                          onClick={() => goTo(i + 1)}
                          className="flex w-full items-baseline justify-between py-2 text-left text-[13px] transition-opacity hover:opacity-60"
                        >
                          <span>
                            <span className="mr-3 font-mono text-[11px] text-muted-foreground">{pad(i + 1)}</span>
                            {p.label}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">{p.category}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          </aside>
        </div>

        <p key={`m-${active}`} className="panel-in mt-3 line-clamp-2 text-[13px] leading-snug text-body lg:hidden">
          {current ? current.description : "AI engineer · full stack. Scroll to fly through the work."}
        </p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// a single sculpture on a slow orbit — used by the hire page hero
// ---------------------------------------------------------------------------
function OrbitRig() {
  const { camera } = useThree()
  const pointer = React.useRef(new THREE.Vector2())
  React.useEffect(() => {
    const onPointer = (e: PointerEvent) =>
      pointer.current.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
    window.addEventListener("pointermove", onPointer, { passive: true })
    return () => window.removeEventListener("pointermove", onPointer)
  }, [])
  const { size } = useThree()
  useFrame(({ clock }) => {
    const a = clock.elapsedTime * 0.06 + pointer.current.x * 0.3
    camera.position.set(Math.sin(a) * 4.8, 3.6 + pointer.current.y * 0.4, Math.cos(a) * 4.8)
    camera.lookAt(0, 0.5, 0)
    // on wide screens, push the object right so it sits beside the headline
    if (size.width > 900) camera.translateX(-1.9)
  })
  return null
}

export function SculptureStage({ kind = "canopy" }: { kind?: SculptureKind }) {
  const [ready, setReady] = React.useState(false)
  const clock = React.useMemo<Clock>(() => ({ reduced: false }), [])
  const focus = React.useMemo<Focus>(() => ({ current: () => 1 }), [])
  React.useEffect(() => {
    clock.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }, [clock])

  return (
    <div
      className="absolute inset-0 transition-opacity duration-[1500ms]"
      style={{ opacity: ready ? 1 : 0 }}
      aria-hidden="true"
    >
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 2.2, 5.6], fov: 42 }} onCreated={() => setReady(true)}>
        <color attach="background" args={["#0b0b0c"]} />
        <fog attach="fog" args={["#0b0b0c", 6, 18]} />
        <OrbitRig />
        <Streaks />
        <Sculpture kind={kind} count={14000} focus={focus} clock={clock} seed={5} />
      </Canvas>
    </div>
  )
}

// small deterministic PRNG so beams and streaks keep the same layout between renders
function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
