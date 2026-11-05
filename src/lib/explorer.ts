/**
 * Shared state for the project explorer. Kept free of three.js so the page shell
 * (title, ruler, side panel) can render and hydrate before the 3D chunk loads.
 */

export const pad = (n: number) => String(n).padStart(2, "0")
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

// tiny external store: lets components inside <Canvas> follow explorer state
// without the whole Canvas re-rendering (which re-creates drei Html roots)
export function createStore<T>(initial: T) {
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
export type Store<T> = ReturnType<typeof createStore<T>>

export type Focus = { current: () => number }
export type Clock = { reduced: boolean }

export type Shared = {
  stage: number
  pointer: { x: number; y: number }
  reduced: boolean
  /** while set (ms timestamp), the camera flies straight to a clicked stage */
  flyUntil: number
}
