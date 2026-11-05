import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText"
import Lenis from "lenis"

declare global {
  interface Window {
    __lenis?: Lenis
    __motionReady?: boolean
  }
}

gsap.registerPlugin(ScrollTrigger, SplitText)

const root = document.documentElement
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
const finePointer = window.matchMedia("(pointer: fine)").matches
const $ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) =>
  scope.querySelector<T>(sel)
const $$ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) =>
  Array.from(scope.querySelectorAll<T>(sel))

if (reduced) root.classList.add("reduced-motion")
window.__motionReady = true

// ---------------------------------------------------------------------------
// smooth scroll
// ---------------------------------------------------------------------------
let lenis: Lenis | null = null

function initScroll() {
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
    lenis.on("scroll", ScrollTrigger.update)
    gsap.ticker.add((time) => lenis?.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
    window.__lenis = lenis
  }

  // same-page anchors glide instead of jumping
  $$<HTMLAnchorElement>('a[href*="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const url = new URL(a.href)
      if (url.pathname !== location.pathname || !url.hash) return
      const target = url.hash === "#top" ? document.body : $(url.hash)
      if (!target) return
      e.preventDefault()
      closeMenu()
      if (lenis) lenis.scrollTo(url.hash === "#top" ? 0 : target, { duration: 1.4 })
      else target.scrollIntoView()
      history.replaceState(null, "", url.hash)
    })
  })
}

// ---------------------------------------------------------------------------
// preloader → hero intro
// ---------------------------------------------------------------------------
function readSeen() {
  try {
    return sessionStorage.getItem("preloaded") === "1"
  } catch {
    return false
  }
}

function markSeen() {
  try {
    sessionStorage.setItem("preloaded", "1")
  } catch {
    // storage blocked — the preloader simply plays again next time
  }
}

function runPreloader(onReveal: () => void) {
  const el = $("[data-preloader]")
  if (!el || reduced || readSeen()) {
    el?.remove()
    onReveal()
    return
  }

  const count = $("[data-preloader-count]", el)
  const bar = $("[data-preloader-bar]", el)
  const progress = { v: 0 }
  lenis?.stop()

  gsap
    .timeline({
      onComplete: () => {
        el.remove()
        lenis?.start()
        markSeen()
      },
    })
    .to(progress, {
      v: 100,
      duration: 1.1,
      ease: "power2.inOut",
      onUpdate: () => {
        if (count) count.textContent = String(Math.round(progress.v)).padStart(3, "0")
      },
    })
    .to(bar, { scaleX: 1, duration: 1.1, ease: "power2.inOut" }, 0)
    .to($$("[data-preloader-fade]", el), { yPercent: -110, duration: 0.5, ease: "power3.in", stagger: 0.04 })
    .to(el, { clipPath: "inset(0% 0% 100% 0%)", duration: 1, ease: "expo.inOut" }, "-=0.1")
    .call(onReveal, [], "-=0.55")
}

// ---------------------------------------------------------------------------
// text reveals
// ---------------------------------------------------------------------------
const heroTargets: Element[] = []

function initSplits() {
  $$("[data-split]").forEach((el) => {
    const isHero = el.hasAttribute("data-hero")
    const delay = parseFloat(el.dataset.delay ?? "0")
    gsap.set(el, { visibility: "visible" })
    if (reduced) return

    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "split-line",
      autoSplit: true,
      aria: "none",
      onSplit(self) {
        if (isHero) {
          gsap.set(self.lines, { yPercent: 105 })
          heroTargets.push(...self.lines)
          return
        }
        return gsap.from(self.lines, {
          yPercent: 105,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.08,
          delay,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        })
      },
    })
  })

  // statement paragraph that lights up word by word as you scroll through it
  $$("[data-scrub]").forEach((el) => {
    if (reduced) return
    SplitText.create(el, {
      type: "words",
      autoSplit: true,
      aria: "none",
      onSplit(self) {
        return gsap.fromTo(
          self.words,
          { opacity: 0.18 },
          {
            opacity: 1,
            ease: "none",
            stagger: 0.1,
            // don't pre-dim off-screen text: words keep full contrast until the
            // paragraph enters the viewport, then light up as you read
            immediateRender: false,
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom 55%", scrub: true },
          },
        )
      },
    })
  })
}

function playHeroIntro() {
  if (reduced) return
  const fades = $$("[data-hero-fade]")
  if (heroTargets.length) gsap.to(heroTargets, { yPercent: 0, duration: 1.4, ease: "expo.out", stagger: 0.08 })
  if (!fades.length) return
  gsap.fromTo(
    fades,
    { y: 12, opacity: 0 },
    { y: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.07, delay: 0.35 },
  )
}

// ---------------------------------------------------------------------------
// scroll-driven pieces
// ---------------------------------------------------------------------------
function initScrollEffects() {
  $$("[data-fade]").forEach((el) => {
    gsap.set(el, { visibility: "visible" })
    if (reduced) return
    gsap.from(el, {
      y: 24,
      opacity: 0,
      duration: 1,
      ease: "expo.out",
      delay: parseFloat(el.dataset.delay ?? "0"),
      scrollTrigger: { trigger: el, start: "top 92%", once: true },
    })
  })

  if (reduced) return

  $$("[data-parallax]").forEach((el) => {
    const speed = parseFloat(el.dataset.parallax ?? "0.2")
    gsap.fromTo(
      el,
      { yPercent: speed * 60 },
      {
        yPercent: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom bottom", scrub: true },
      },
    )
  })
}

// ---------------------------------------------------------------------------
// work list: preview image follows the pointer
// ---------------------------------------------------------------------------
function initWorkPreview() {
  const list = $("[data-work-list]")
  const preview = $("[data-work-preview]")
  const img = preview && $<HTMLImageElement>("[data-work-preview-img]", preview)
  if (!list || !preview || !img || !finePointer || reduced) return

  const xTo = gsap.quickTo(preview, "x", { duration: 0.6, ease: "power3" })
  const yTo = gsap.quickTo(preview, "y", { duration: 0.6, ease: "power3" })
  gsap.set(preview, { xPercent: -50, yPercent: -50, scale: 0.92, opacity: 0 })

  const pointer = { x: -1, y: -1 }
  let shown = false
  const show = (row: HTMLElement) => {
    const src = row.dataset.preview
    if (src && img.getAttribute("src") !== src) img.src = src
    if (!shown) {
      // jump to the cursor before fading in, so it never flashes from the corner
      gsap.set(preview, { x: pointer.x + 200, y: pointer.y })
      shown = true
    }
    gsap.to(preview, { opacity: 1, scale: 1, duration: 0.5, ease: "expo.out", overwrite: "auto" })
  }
  const hide = () => {
    if (!shown) return
    shown = false
    gsap.to(preview, { opacity: 0, scale: 0.92, duration: 0.35, ease: "power2.out", overwrite: "auto" })
  }

  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      if (shown) {
        xTo(e.clientX + 200)
        yTo(e.clientY)
      }
    },
    { passive: true },
  )
  $$("[data-preview]", list).forEach((row) => row.addEventListener("pointerenter", () => show(row)))
  list.addEventListener("pointerleave", hide)

  // smooth scroll moves the list without moving the pointer, so pointerleave never
  // fires — re-check what is actually under the cursor whenever the page scrolls
  const recheck = () => {
    if (pointer.x < 0) return
    const row = document.elementFromPoint(pointer.x, pointer.y)?.closest<HTMLElement>("[data-preview]")
    if (row && list.contains(row)) show(row)
    else hide()
  }
  if (lenis) lenis.on("scroll", recheck)
  else window.addEventListener("scroll", recheck, { passive: true })
  document.addEventListener("pointerleave", hide)
}

// ---------------------------------------------------------------------------
// chrome: nav, menu, clock
// ---------------------------------------------------------------------------
function closeMenu() {
  const menu = $("[data-menu]")
  const toggle = $("[data-menu-toggle]")
  if (!menu || menu.dataset.open !== "true") return
  menu.dataset.open = "false"
  menu.inert = true
  toggle?.setAttribute("aria-expanded", "false")
  lenis?.start()
}

function initChrome() {
  const progress = $("[data-progress]")
  if (progress) {
    const setProgress = gsap.quickSetter(progress, "scaleX")
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => setProgress(self.progress) })
  }

  $$("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count)
    if (reduced || !Number.isFinite(target)) return
    const value = { v: 0 }
    el.textContent = "0"
    ScrollTrigger.create({
      trigger: el,
      start: "top 92%",
      once: true,
      onEnter: () =>
        gsap.to(value, {
          v: target,
          duration: 1.6,
          ease: "power3.out",
          onUpdate: () => (el.textContent = String(Math.round(value.v))),
        }),
    })
  })

  const nav = $("[data-nav]")
  if (nav) {
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        nav.dataset.hidden = String(self.direction === 1 && self.scroll() > 240)
      },
    })
  }

  const menu = $("[data-menu]")
  const toggle = $("[data-menu-toggle]")
  toggle?.addEventListener("click", () => {
    if (!menu) return
    const open = menu.dataset.open !== "true"
    menu.dataset.open = String(open)
    menu.inert = !open
    toggle.setAttribute("aria-expanded", String(open))
    if (open) lenis?.stop()
    else lenis?.start()
  })
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu()
  })

  const clocks = $$("[data-clock]")
  const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
  const tick = () => clocks.forEach((c) => (c.textContent = `${fmt.format(new Date())} IST`))
  tick()
  setInterval(tick, 15_000)
}

// ---------------------------------------------------------------------------
async function boot() {
  initScroll()
  initChrome()
  initWorkPreview()
  // line breaks depend on the webfonts, so split only once they're in
  await document.fonts.ready
  initSplits()
  initScrollEffects()
  runPreloader(playHeroIntro)
  window.addEventListener("load", () => ScrollTrigger.refresh())
}

boot()
