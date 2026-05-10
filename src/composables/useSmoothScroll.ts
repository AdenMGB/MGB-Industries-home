import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

let activeLenis: Lenis | null = null
let rafId = 0

/**
 * Mounts a single Lenis instance and synchronises it with GSAP's ScrollTrigger.
 *
 * The first component that calls this composable owns the Lenis instance.
 * Subsequent calls simply return a reference to the same instance so other
 * pieces of the UI can read scroll state without competing rAF loops.
 */
export function useSmoothScroll() {
  const lenisRef = shallowRef<Lenis | null>(activeLenis)

  onMounted(() => {
    if (typeof window === 'undefined') return

    const prefersReducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    if (activeLenis || prefersReducedMotion) {
      lenisRef.value = activeLenis
      return
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    })

    activeLenis = lenis
    lenisRef.value = lenis

    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time: number) => {
      lenis.raf(time)
      rafId = window.requestAnimationFrame(tick)
    }
    rafId = window.requestAnimationFrame(tick)
  })

  onBeforeUnmount(() => {
    // Only the owner clears the singleton. We assume App.vue lives for the
    // duration of the SPA, so this rarely fires.
    if (activeLenis && lenisRef.value === activeLenis) {
      window.cancelAnimationFrame(rafId)
      activeLenis.destroy()
      activeLenis = null
    }
  })

  return { lenis: lenisRef }
}
