<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { gsap } from 'gsap'

interface Props {
  name?: string
}

const props = withDefaults(defineProps<Props>(), {
  name: 'fade',
})

const route = useRoute()
const transitionName = computed(() => props.name || (route.meta.transition as string) || 'fade')
const isTransitioning = ref(false)

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

const onEnter = (el: Element, done: () => void) => {
  const element = el as HTMLElement
  
  switch (transitionName.value) {
    case 'morph':
      gsap.fromTo(element, 
        { 
          clipPath: 'circle(0% at 50% 50%)',
          opacity: 0,
          scale: 0.95,
        },
        { 
          clipPath: 'circle(150% at 50% 50%)',
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: premiumEase,
          onComplete: done,
        }
      )
      break
    case 'flip':
      gsap.fromTo(element,
        {
          rotationY: 90,
          opacity: 0,
          transformPerspective: 1000,
          scale: 0.9,
        },
        {
          rotationY: 0,
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: premiumEase,
          onComplete: done,
        }
      )
      break
    case 'zoom':
      gsap.fromTo(element,
        {
          scale: 0.85,
          opacity: 0,
          filter: 'blur(10px)',
        },
        {
          scale: 1,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.5,
          ease: premiumEase,
          onComplete: done,
        }
      )
      break
    case 'slide-up':
      gsap.fromTo(element,
        {
          y: 60,
          opacity: 0,
          scale: 0.96,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: premiumEase,
          onComplete: done,
        }
      )
      break
    default:
      gsap.fromTo(element,
        { 
          opacity: 0,
          y: 20,
        },
        { 
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: premiumEase,
          onComplete: done,
        }
      )
  }
}

const onLeave = (el: Element, done: () => void) => {
  const element = el as HTMLElement
  
  switch (transitionName.value) {
    case 'morph':
      gsap.to(element, {
        clipPath: 'circle(0% at 50% 50%)',
        opacity: 0,
        scale: 0.95,
        duration: 0.4,
        ease: premiumEase,
        onComplete: done,
      })
      break
    case 'flip':
      gsap.to(element, {
        rotationY: -90,
        opacity: 0,
        scale: 0.9,
        duration: 0.4,
        ease: premiumEase,
        onComplete: done,
      })
      break
    case 'zoom':
      gsap.to(element, {
        scale: 1.05,
        opacity: 0,
        filter: 'blur(10px)',
        duration: 0.3,
        ease: premiumEase,
        onComplete: done,
      })
      break
    case 'slide-up':
      gsap.to(element, {
        y: -40,
        opacity: 0,
        scale: 0.96,
        duration: 0.4,
        ease: premiumEase,
        onComplete: done,
      })
      break
    default:
      gsap.to(element, { 
        opacity: 0,
        y: -20,
        duration: 0.3,
        ease: premiumEase,
        onComplete: done,
      })
  }
}

watch(() => route.path, () => {
  isTransitioning.value = true
  setTimeout(() => {
    isTransitioning.value = false
  }, 600)
})
</script>

<template>
  <Transition
    mode="out-in"
    @enter="onEnter"
    @leave="onLeave"
  >
    <slot />
  </Transition>
</template>

<style scoped>
.morph-enter-active,
.morph-leave-active,
.flip-enter-active,
.flip-leave-active,
.zoom-enter-active,
.zoom-leave-active,
.slide-up-enter-active,
.slide-up-leave-active {
  transform-style: preserve-3d;
  transform-origin: center center;
}
</style>
