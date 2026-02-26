<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useTheme } from './composables/useTheme'
import { useAuth } from './composables/useAuth'
import { cn } from './utils/cn'
import MorphingNav from './components/MorphingNav.vue'
import PageTransition from './components/PageTransition.vue'
import Toast from './components/Toast.vue'
import { RouterView } from 'vue-router'
import { gsap } from 'gsap'

const { checkAuth } = useAuth()

onMounted(() => {
  // Check authentication status in background (non-blocking)
  checkAuth().catch(() => {
    // Silently handle errors - UI will show as not authenticated
  })

  // Animate background elements with smooth motion
  const bgElements = document.querySelectorAll('.bg-element')
  bgElements.forEach((el, index) => {
    gsap.to(el, {
      y: -20,
      x: Math.sin(index) * 10,
      duration: 4 + index * 0.3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: index * 0.2,
    })
  })
})
</script>

<template>
  <div
    :class="cn(
      'min-h-screen bg-cream dark:bg-gray-950 overflow-x-hidden',
      'relative transition-colors duration-1000 ease-out',
    )"
  >
    <!-- Minimalist background pattern with smooth animations -->
    <div class="fixed inset-0 -z-10 opacity-[0.02] pointer-events-none">
      <div
        v-for="i in 12"
        :key="i"
        class="bg-element absolute rounded-full bg-peach/20 dark:bg-lavender/10 blur-3xl transform-gpu"
        :style="{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${80 + Math.random() * 120}px`,
          height: `${80 + Math.random() * 120}px`,
        }"
      />
    </div>

    <!-- Navigation -->
    <MorphingNav />

    <!-- Page Content with Transitions -->
    <RouterView v-slot="{ Component }">
      <PageTransition>
        <component :is="Component" v-if="Component" />
      </PageTransition>
    </RouterView>

    <!-- Toast notifications -->
    <Toast />
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

.bg-element {
  will-change: transform;
}
</style>
