/**
 * Which section a visitor read longest, and how far down they got, sent to Umami once when
 * they leave as two events: `most-time` and `stopped-at` (each with a `section` property).
 * A section counts as being read while it covers the middle of the viewport and the tab is
 * visible. Sections are `[data-track]`, `section[id]` and `footer[id]`, in page order.
 */

declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, string | number>) => void }
  }
}

// visits shorter than this are bounces; they would only add noise to both events
const MIN_SECONDS = 3

const nameOf = (el: Element) => (el as HTMLElement).dataset.track ?? el.id

export function trackSections() {
  const sections = [...document.querySelectorAll("[data-track], section[id], footer[id]")]
  if (sections.length < 2) return

  const seconds = new Map<string, number>()
  let current: string | null = null
  let since = performance.now()
  let deepest = -1
  let sent = false
  // our own flag: by the time visibilitychange fires, document.visibilityState is already the new state
  let visible = document.visibilityState === "visible"

  /** credit the time since the last call to the section in view, if the tab was visible */
  const settle = () => {
    const now = performance.now()
    if (current && visible) {
      seconds.set(current, (seconds.get(current) ?? 0) + (now - since) / 1000)
    }
    since = now
  }

  // a band one pixel tall across the middle of the screen: whatever crosses it is being read
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        settle()
        current = nameOf(e.target)
        deepest = Math.max(deepest, sections.indexOf(e.target))
      }
    },
    { rootMargin: "-50% 0px -50% 0px" },
  )
  sections.forEach((s) => io.observe(s))

  const send = () => {
    settle()
    if (sent || !window.umami || deepest < 0) return
    const total = [...seconds.values()].reduce((a, b) => a + b, 0)
    if (total < MIN_SECONDS) return
    sent = true
    const [top] = [...seconds].sort((a, b) => b[1] - a[1])
    window.umami.track("most-time", { section: top[0], seconds: Math.round(top[1]) })
    window.umami.track("stopped-at", { section: nameOf(sections[deepest]) })
  }

  // pause the clock while the tab is hidden; leaving the page (or the tab going to the
  // background on mobile, which is often the last event a page gets) sends the summary
  document.addEventListener("visibilitychange", () => {
    settle()
    visible = document.visibilityState === "visible"
    if (!visible) send()
  })
  window.addEventListener("pagehide", send)
}
