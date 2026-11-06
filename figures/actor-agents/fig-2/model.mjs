// The truth the figure plays: Retro's "save, then send" (transactional outbox).
// One worker step = claim (one DB write) -> run -> ONE atomic write (outputs + done + next hop) -> send.
// Job ids are run-step-revision, so the same step sent twice is one job in the next mailbox.
// Every value the page draws is a pure function of the tour clock t (seconds).

export const STROKE = 18.3 // stamp head travel, rest to card face
export const NUDGE = 1 // how far the head moves before the done bolt stops it
export const SLIDE = 148 // card travel, inbox tray to the ledger page
export const DROP = 40 // capsule fall into the send tube
export const ACTS = [0, 8.4, 14.4]
export const CYCLE = 28
export const STILL_AT = 5.4 // reduced motion: saved, the next message waiting on the gate

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const ease = (v) => { const x = clamp01(v); return x * x * (3 - 2 * x) }
const span = (t, a, b) => ease((t - a) / (b - a))
const fall = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x }

export function stateAt(input) {
  const t = ((input % CYCLE) + CYCLE) % CYCLE
  const s = {
    t, act: t < ACTS[1] ? 0 : t < ACTS[2] ? 1 : 2,
    card: 0, cardAlpha: 0, cardInk: 0, head: 0, turn: 0, lamp: 1,
    ink: 0, working: 0, done: 0, tab: 0, bolt: 0,
    capsule: 0, capsuleDrop: 0, gate: 0, jobs: 0,
    saved: 0, sent: 0, phase: "",
  }
  const strike = (a) => { // head down a..a+.45, dwell .15, up .5
    return span(t, a, a + 0.45) * (1 - span(t, a + 0.6, a + 1.1))
  }
  const nudge = (a) => span(t, a, a + 0.25) * (1 - span(t, a + 0.35, a + 0.6))
  const send = (a) => { // gate opens a..a+.4, capsule falls a+.4..a+1, gate closes a+1.2..a+1.6
    s.gate = span(t, a, a + 0.4) * (1 - span(t, a + 1.2, a + 1.6))
    s.capsuleDrop = fall(t, a + 0.4, a + 1)
    if (t >= a + 1) s.capsule = 0
  }

  if (s.act === 0) {
    // a normal step
    s.cardAlpha = 1 - span(t, 6.8, 7.6)
    s.card = span(t, 0.4, 1.8)
    s.working = span(t, 1.8, 2.1) * (1 - span(t, 4.65, 4.8))
    s.turn = span(t, 2.2, 4.2)
    s.head = strike(4.2)
    const hit = t >= 4.65
    s.cardInk = s.ink = hit ? 1 : 0
    s.done = hit ? 1 : 0
    s.saved = hit ? 1 : 0
    s.tab = span(t, 4.65, 5.0)
    s.bolt = span(t, 4.9, 5.4)
    s.capsule = span(t, 4.7, 5.1)
    send(5.6)
    s.sent = t >= 6.0 ? 1 : 0
    s.jobs = t >= 6.0 ? 1 : 0
    s.phase = t < 0.4 ? "queued" : t < 1.8 ? "delivered" : t < 2.2 ? "claimed" : t < 4.65 ? "running" : t < 6.0 ? "saved" : t < 6.8 ? "sent" : "acked"
  } else if (s.act === 1) {
    // the same message delivered again
    s.cardAlpha = span(t, 8.4, 8.8) * (1 - span(t, 12.6, 13.2))
    s.card = span(t, 8.8, 10.2)
    s.head = nudge(10.2) * (NUDGE / STROKE)
    s.ink = 1 - span(t, 13.2, 13.8)
    s.done = 1 - span(t, 13.2, 13.8)
    s.tab = 1 - span(t, 13.2, 13.7)
    s.bolt = 1 - span(t, 13.4, 13.9)
    s.saved = 1
    s.capsule = span(t, 10.9, 11.3)
    send(11.4)
    s.sent = t >= 11.8 ? 2 : 1
    s.jobs = t < 13.4 ? 1 : 0
    s.phase = t < 10.2 ? "same job again" : t < 10.9 ? "claim refused" : t < 11.8 ? "re-send only" : t < 13.2 ? "1 job" : "next run"
  } else {
    // the worker dies after the save, before the send
    s.cardAlpha = span(t, 14.4, 14.8) * (1 - span(t, 22.2, 22.6)) + span(t, 22.6, 23.0) * (1 - span(t, 26.2, 26.8))
    s.card = t < 22.6 ? span(t, 14.8, 16.2) : span(t, 23.0, 24.4)
    s.working = span(t, 16.2, 16.5) * (1 - span(t, 19.05, 19.2))
    s.turn = span(t, 16.6, 18.6)
    s.head = strike(18.6) + nudge(24.4) * (NUDGE / STROKE)
    const hit = t >= 19.05
    s.cardInk = hit && t < 22.6 ? 1 : 0
    s.ink = hit ? 1 - span(t, 26.8, 27.4) : 0
    s.done = hit ? 1 - span(t, 26.8, 27.4) : 0
    s.saved = hit ? 1 : 0
    s.tab = span(t, 19.05, 19.4) * (1 - span(t, 26.8, 27.3))
    s.bolt = span(t, 19.3, 19.8) * (1 - span(t, 27, 27.5))
    s.capsule = span(t, 19.1, 19.5)
    send(25.0)
    s.lamp = 1 - span(t, 19.9, 20.2) * (1 - span(t, 22.2, 22.5))
    s.sent = t >= 25.4 ? 1 : 0
    s.jobs = t >= 25.4 && t < 27.4 ? 1 : 0
    s.phase = t < 16.2 ? "delivered" : t < 16.6 ? "claimed" : t < 19.05 ? "running" : t < 19.9 ? "saved" : t < 21.0 ? "worker died" : t < 22.6 ? "lock expires" : t < 24.4 ? "redelivered" : t < 25.0 ? "step done" : t < 25.4 ? "re-send only" : t < 26.8 ? "sent" : "next run"
  }
  return s
}

export const readoutOf = (s) => `${s.phase} · saved ${s.saved} · sent ${s.sent}`
