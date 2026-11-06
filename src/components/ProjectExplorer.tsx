import * as React from "react"

import { CONTENT } from "@/lib/content"
import { clamp, createStore, pad, type Clock, type Focus, type Shared } from "@/lib/explorer"
import { cn } from "@/lib/utils"

// three.js + R3F live in their own chunk, fetched only once the page is idle
const ExplorerScene = React.lazy(() => import("./ExplorerScene"))

const RULER_CELL = 150

export function ProjectExplorer() {
  const projects = CONTENT.projects
  const stages = projects.length
  const section = React.useRef<HTMLElement>(null)
  const ruler = React.useRef<HTMLDivElement>(null)
  const shared = React.useRef<Shared>({ stage: 0, pointer: { x: 0, y: 0 }, reduced: false, flyUntil: 0 })
  const clock = React.useMemo<Clock>(() => ({ reduced: false }), [])
  const [active, setActive] = React.useState(0)
  const [seen, setSeen] = React.useState<number[]>([])
  const activeStage = React.useMemo(() => createStore(0), [])
  const visible = React.useMemo(() => createStore(true), [])
  const labels = React.useRef<HTMLDivElement>(null)
  const [sceneReady, setSceneReady] = React.useState(false)
  React.useEffect(() => {
    const start = () => setSceneReady(true)
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(start, { timeout: 1500 })
      return () => window.cancelIdleCallback(id)
    }
    const id = globalThis.setTimeout(start, 300)
    return () => globalThis.clearTimeout(id)
  }, [])
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
        const target = travel > 0 ? clamp(-rect.top / travel, 0, 1) * stages : 0
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
      const to = clamp(
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
      s.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      s.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
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

  const sceneProps = {
    projects,
    shared,
    stages,
    clock,
    focuses,
    openingLevel,
    mobile,
    activeStage,
    visible,
    labels,
    goTo,
    onReady: () => setReady(true),
  }

  // the first paint shows the title as-is (it's the LCP element); the reveal
  // animation only runs once the visitor starts moving between projects
  const [moved, setMoved] = React.useState(false)
  React.useEffect(() => {
    if (active > 0) setMoved(true)
  }, [active])

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
          <span key={title} className={cn("block whitespace-nowrap", moved && "explorer-title")}>
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
                {sceneReady && (
                  <React.Suspense fallback={null}>
                    <ExplorerScene {...sceneProps} />
                  </React.Suspense>
                )}
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
            <div key={active} className={cn("flex min-h-0 flex-col gap-4", moved && "panel-in")}>
              {current ? (
                <>
                  <p className="text-pretty text-[13px] leading-[1.55]">{current.description}</p>
                  <p className="text-[12px] text-body">
                    {current.category} · {current.tech.join(", ")}
                  </p>
                  <p className="flex gap-4 text-[12px]">
                    <a href={`/projects/${current.key}/`} className="font-medium underline-offset-4 hover:underline">
                      Read more →
                    </a>
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

        <p key={`m-${active}`} className={cn("mt-3 line-clamp-2 text-[13px] leading-snug text-body lg:hidden", moved && "panel-in")}>
          {current ? current.description : "AI engineer · full stack. Scroll to fly through the work."}
        </p>
      </div>
    </section>
  )
}

