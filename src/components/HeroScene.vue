<script setup lang="ts">
import { ref, computed } from 'vue'
import { TresCanvas, useRenderLoop } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { useMouse } from '@/composables/useMouse'
import { useTheme } from '@/composables/useTheme'

const { mouseX, mouseY } = useMouse()
const { themeMode } = useTheme()

const groupRef = ref()
const particleCount = 200

// Create more organic particle distribution in a torus-like shape
const particles = Array.from({ length: particleCount }, (_, i) => {
  const angle = (i / particleCount) * Math.PI * 2
  const radius = 8 + Math.random() * 6
  const height = (Math.random() - 0.5) * 15
  
  return {
    id: i,
    x: Math.cos(angle) * radius + (Math.random() - 0.5) * 2,
    y: height,
    z: Math.sin(angle) * radius + (Math.random() - 0.5) * 2,
    scale: Math.random() * 0.4 + 0.15,
    hue: (i / particleCount) * 0.3 + 0.05, // Warm hues (peach, coral, pink range)
    speed: 0.5 + Math.random() * 0.5,
    baseY: height,
  }
})

const particleColor = computed(() => {
  // Warm pastel colors
  return undefined // Let HSL colors show through
})

const { onLoop } = useRenderLoop()

onLoop(({ elapsed }) => {
  if (groupRef.value) {
    // More dynamic, organic rotation
    groupRef.value.rotation.y = elapsed * 0.08 + Math.sin(elapsed * 0.3) * 0.1
    groupRef.value.rotation.x = Math.sin(elapsed * 0.15) * 0.15
    groupRef.value.rotation.z = Math.cos(elapsed * 0.2) * 0.05

    // Mouse interaction with smooth damping
    if (mouseX.value && mouseY.value && typeof window !== 'undefined') {
      const normalizedX = (mouseX.value / window.innerWidth - 0.5) * 2
      const normalizedY = (mouseY.value / window.innerHeight - 0.5) * 2

      groupRef.value.position.x += (normalizedX * 3 - groupRef.value.position.x) * 0.05
      groupRef.value.position.y += (-normalizedY * 3 - groupRef.value.position.y) * 0.05
    }

    // Animate individual particles with floating motion
    particles.forEach((particle, i) => {
      const mesh = groupRef.value?.children[i]
      if (mesh) {
        mesh.position.y = particle.baseY + Math.sin(elapsed * particle.speed + i) * 0.5
        mesh.rotation.x = elapsed * particle.speed
        mesh.rotation.y = elapsed * particle.speed * 0.7
        mesh.rotation.z = elapsed * particle.speed * 0.5
      }
    })
  }
})
</script>

<template>
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <TresCanvas
      alpha
      clear-color="#FFF8E7"
      class="w-full h-full"
    >
      <TresPerspectiveCamera :position="[0, 0, 10]" />
      <OrbitControls :enable-zoom="false" :enable-pan="false" />
      <TresAmbientLight :intensity="0.8" />
      <TresPointLight :position="[10, 10, 10]" :intensity="1.5" color="#FFB5A7" />
      <TresPointLight :position="[-10, -10, -10]" :intensity="1" color="#C8A8E9" />
      <TresPointLight :position="[0, 10, -10]" :intensity="0.8" color="#A8E6CF" />
      <TresGroup ref="groupRef">
        <TresMesh
          v-for="particle in particles"
          :key="particle.id"
          :position="[particle.x, particle.y, particle.z]"
          :scale="particle.scale"
        >
          <!-- Mix of geometries for visual interest -->
          <TresBoxGeometry
            v-if="particle.id % 3 === 0"
            :args="[0.2, 0.2, 0.2]"
          />
          <TresOctahedronGeometry
            v-else-if="particle.id % 3 === 1"
            :args="[0.12, 0]"
          />
          <TresTetrahedronGeometry
            v-else
            :args="[0.15, 0]"
          />
          <TresMeshStandardMaterial
            :color="particleColor || `hsl(${particle.hue * 360}, 70%, 75%)`"
            :emissive="particleColor || `hsl(${particle.hue * 360}, 70%, 75%)`"
            :emissive-intensity="0.6"
            :metalness="0.3"
            :roughness="0.2"
          />
        </TresMesh>
      </TresGroup>
    </TresCanvas>
  </div>
</template>
