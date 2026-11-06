// Page loop. Inlined after the kit, model.mjs and shapes.mjs; reads DATA from the build.
{
  const { P } = DATA
  const stage = document.querySelector(".iso-stage")
  const svg = stage.querySelector("svg")
  const part = (name) => svg.querySelector(`[data-part="${name}"]`)
  const el = {
    card: part("card"), cardInk: part("card-ink"), ink: part("ink"), check: part("check"), working: part("working"),
    tab: part("tab"), bolt: part("bolt"), head: part("head"), plunger: part("plunger"), rodtop: part("rodtop"),
    needle: part("needle"), lamp: part("lamp"), gate: part("gate"), capsule: part("capsule"), jobs: part("jobs"),
    halo: part("head-halo"),
  }
  const readout = document.querySelector("[data-readout]")
  const live = stage.querySelector(".f2-live")
  const still = matchMedia("(prefers-reduced-motion: reduce)")
  const speed = () => window.__driveSpeed || 1

  let clock = still.matches ? DATA.STILL_AT : 0
  let paused = false
  let frame = 0
  let last = 0
  let visible = false
  let lastHead = -1
  let lastPhase = ""
  const set = (node, name, value) => { if (node.getAttribute(name) !== value) node.setAttribute(name, value) }
  const alpha = (node, v) => set(node, "opacity", v.toFixed(3))
  const at = (dx, dy, dz) => translateAlong(P, [dx, dy, dz])

  function draw() {
    const s = stateAt(clock)
    set(el.card, "transform", at(s.card * DATA.SLIDE, 0, 0))
    alpha(el.card, s.cardAlpha)
    alpha(el.cardInk, s.cardInk)
    alpha(el.ink, s.ink)
    alpha(el.check, s.done)
    alpha(el.working, s.working)
    set(el.tab, "transform", at(DATA.TAB_IN * (1 - s.tab), 0, 0))
    set(el.bolt, "transform", at(DATA.BOLT_OUT * (1 - s.bolt), 0, 0))
    const dz = s.head * DATA.STROKE
    if (Math.abs(dz - lastHead) > 0.004) {
      lastHead = dz
      set(el.head, "transform", at(0, 0, -dz))
      el.plunger.innerHTML = plungerSvg(KIT, P, dz)
      el.rodtop.innerHTML = rodTopSvg(KIT, P, dz)
      alpha(el.halo, Math.max(0, (dz - 8) / (DATA.STROKE - 8)) * 0.25)
    }
    set(el.needle, "d", needleOf(KIT, P, s.turn))
    alpha(el.lamp, s.lamp)
    set(el.gate, "transform", at(0, DATA.GATE_OPEN * s.gate, 0))
    alpha(el.capsule, s.capsule * (1 - Math.max(0, (s.capsuleDrop - 0.55) / 0.45)))
    set(el.capsule, "transform", at(0, 0, -DATA.DROP * s.capsuleDrop))
    const jobs = String(s.jobs)
    if (el.jobs.textContent !== jobs) el.jobs.textContent = jobs
    const text = readoutOf(s)
    if (readout.textContent !== text) readout.textContent = text
    if (s.phase !== lastPhase) {
      lastPhase = s.phase
      stage.setAttribute("aria-valuetext", text)
      if (document.activeElement === stage) live.textContent = text
    }
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60
    last = now
    if (!paused && !still.matches) clock = (clock + dt * speed()) % DATA.CYCLE
    draw()
    frame = visible && !paused && !still.matches ? requestAnimationFrame(tick) : 0
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick) } }

  // stepping jumps the clock to the start of an act (under reduced motion, to that act's telling moment)
  const KEY = [5.4, 11.0, 21.0]
  const actOf = (t) => (t < DATA.ACTS[1] ? 0 : t < DATA.ACTS[2] ? 1 : 2)
  function stepTo(index) {
    const i = (index + 3) % 3
    clock = still.matches ? KEY[i] : DATA.ACTS[i]
    paused = false
    draw()
    run()
  }
  stage.addEventListener("click", () => stepTo(actOf(clock) + 1))
  stage.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "Enter") stepTo(actOf(clock) + 1)
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") stepTo(actOf(clock) - 1)
    else if (event.key === "Home") stepTo(0)
    else if (event.key === " ") { paused = !paused; if (!paused) run() }
    else return
    event.preventDefault()
  })
  stage.addEventListener("focus", () => { live.textContent = readout.textContent })
  still.addEventListener?.("change", () => { if (still.matches) clock = DATA.STILL_AT; draw(); run() })
  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting
    if (visible) run()
  }, { rootMargin: "120px 0px" }).observe(stage)
  draw()
}
