<script setup lang="ts">
import { onMounted } from 'vue'
import { useTheme } from './composables/useTheme'
import { useAuth } from './composables/useAuth'
import { useSmoothScroll } from './composables/useSmoothScroll'
import { cn } from './utils/cn'
import MorphingNav from './components/MorphingNav.vue'
import PageTransition from './components/PageTransition.vue'
import Toast from './components/Toast.vue'
import CustomCursor from './components/CustomCursor.vue'
import { RouterView } from 'vue-router'
import { gsap } from 'gsap'

useTheme()
useSmoothScroll()
const { checkAuth } = useAuth()

onMounted(() => {
  checkAuth().catch(() => {
    /* silently handle errors */
  })

  const grain = document.querySelectorAll<HTMLElement>('.bg-aura')
  grain.forEach((el, index) => {
    gsap.to(el, {
      x: `+=${(index % 2 === 0 ? 1 : -1) * 30}`,
      y: `+=${(index % 2 === 0 ? -1 : 1) * 22}`,
      duration: 14 + index * 1.6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })
  })
})
</script>

<template>
  <div
    :class="cn(
      'relative min-h-screen overflow-x-hidden',
      'bg-cream dark:bg-charcoal-600 text-charcoal-500 dark:text-cream-100',
      'transition-colors duration-1000 ease-out',
    )"
  >
    <!-- Ambient warm aura accents -->
    <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        class="bg-aura absolute -top-[12%] -left-[8%] h-[55vh] w-[55vh] rounded-full blur-3xl opacity-[0.18] dark:opacity-[0.22]"
        style="background: radial-gradient(circle at 30% 30%, #CC7B3C 0%, transparent 70%);"
      />
      <div
        class="bg-aura absolute top-[25%] -right-[12%] h-[60vh] w-[60vh] rounded-full blur-3xl opacity-[0.14] dark:opacity-[0.18]"
        style="background: radial-gradient(circle at 70% 30%, #8C3A35 0%, transparent 70%);"
      />
      <div
        class="bg-aura absolute -bottom-[20%] left-[20%] h-[55vh] w-[55vh] rounded-full blur-3xl opacity-[0.10] dark:opacity-[0.14]"
        style="background: radial-gradient(circle at 50% 50%, #5C7A68 0%, transparent 70%);"
      />
    </div>

    <MorphingNav />

    <RouterView v-slot="{ Component }">
      <PageTransition>
        <component :is="Component" v-if="Component" />
      </PageTransition>
    </RouterView>

    <Toast />
    <CustomCursor />
  </div>
</template>
