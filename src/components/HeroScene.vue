<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { TresCanvas, useRenderLoop } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { useMouse } from '@/composables/useMouse'
import { useTheme } from '@/composables/useTheme'

const { mouseX, mouseY } = useMouse()
const { themeMode } = useTheme()

const groupRef = ref()
const particleCount = 150

const particles = Array.from({ length: particleCount }, (_, i) => ({
  id: i,
  x: (Math.random() - 0.5) * 20,
  y: (Math.random() - 0.5) * 20,
  z: (Math.random() - 0.5) * 20,
  scale: Math.random() * 0.3 + 0.2,
  hue: (i / particleCount) * 0.3 + 0.5,
}))

const particleColor = computed(() => {
  return themeMode.value === 'hacker' ? '#00ff00' : undefined
})

const { onLoop } = useRenderLoop()

onLoop(({ elapsed }) => {
  if (groupRef.value) {
    groupRef.value.rotation.y = elapsed * 0.1
    groupRef.value.rotation.x = Math.sin(elapsed * 0.2) * 0.1

    if (mouseX.value && mouseY.value && typeof window !== 'undefined') {
      const normalizedX = (mouseX.value / window.innerWidth - 0.5) * 2
      const normalizedY = (mouseY.value / window.innerHeight - 0.5) * 2

      groupRef.value.position.x = normalizedX * 2
      groupRef.value.position.y = -normalizedY * 2
    }
  }
})
</script>

<template>
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <TresCanvas
      alpha
      :clear-color="themeMode === 'hacker' ? '#000000' : '#030014'"
      class="w-full h-full"
    >
      <TresPerspectiveCamera :position="[0, 0, 10]" />
      <OrbitControls :enable-zoom="false" :enable-pan="false" />
      <TresAmbientLight :intensity="0.5" />
      <TresPointLight :position="[10, 10, 10]" :intensity="1" />
      <TresGroup ref="groupRef">
        <TresMesh
          v-for="particle in particles"
          :key="particle.id"
          :position="[particle.x, particle.y, particle.z]"
          :scale="particle.scale"
        >
          <TresBoxGeometry :args="[0.15, 0.15, 0.15]" />
          <TresMeshStandardMaterial
            :color="particleColor || `hsl(${particle.hue * 360}, 80%, 60%)`"
            :emissive="particleColor || `hsl(${particle.hue * 360}, 80%, 60%)`"
            :emissive-intensity="0.5"
          />
        </TresMesh>
      </TresGroup>
    </TresCanvas>
  </div>
</template>
