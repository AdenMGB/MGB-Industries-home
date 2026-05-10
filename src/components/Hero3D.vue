<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'

const props = withDefaults(
  defineProps<{
    /** Scroll progress 0-1 controlling how broken-apart the orb is. */
    progress?: number
  }>(),
  { progress: 0 },
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const reducedMotion = ref(false)
const isVisible = ref(true)

const SHARD_COUNT = 26
const COLORS = ['#CC7B3C', '#8C3A35', '#E5A867']

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let group: THREE.Group | null = null
let raf = 0
let frame = 0
const mouse = new THREE.Vector2(0, 0)
const target = { rx: 0, ry: 0 }

interface Shard {
  mesh: THREE.Mesh
  base: THREE.Vector3
  exploded: THREE.Vector3
  drift: THREE.Vector3
  rotSpeed: THREE.Vector3
}
const shards: Shard[] = []

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const onResize = () => {
  if (!renderer || !camera || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  renderer.setPixelRatio(dpr)
  renderer.setSize(rect.width, rect.height, false)
  camera.aspect = rect.width / Math.max(1, rect.height)
  camera.updateProjectionMatrix()
}

const onMouseMove = (e: PointerEvent) => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = ((e.clientY - rect.top) / rect.height) * 2 - 1
}

const animate = () => {
  if (!renderer || !scene || !camera || !group) return
  frame += reducedMotion.value ? 0.0008 : 0.005

  // Smoothly steer the orb towards the cursor.
  target.ry = mouse.x * 0.5
  target.rx = mouse.y * 0.3
  group.rotation.y = lerp(group.rotation.y, target.ry + frame * 0.18, 0.05)
  group.rotation.x = lerp(group.rotation.x, target.rx + frame * 0.05, 0.05)

  const t = Math.max(0, Math.min(1, props.progress))

  for (const s of shards) {
    const driftX = Math.sin(frame * 0.7 + s.drift.x) * 0.06
    const driftY = Math.cos(frame * 0.6 + s.drift.y) * 0.06
    const driftZ = Math.sin(frame * 0.5 + s.drift.z) * 0.06

    s.mesh.position.x = lerp(s.base.x + driftX, s.exploded.x, t)
    s.mesh.position.y = lerp(s.base.y + driftY, s.exploded.y, t)
    s.mesh.position.z = lerp(s.base.z + driftZ, s.exploded.z, t)

    s.mesh.rotation.x += s.rotSpeed.x * (1 + t * 2)
    s.mesh.rotation.y += s.rotSpeed.y * (1 + t * 2)

    const baseScale = (s.mesh.userData.s as number) ?? 1
    const k = (1 - t * 0.45) * baseScale
    s.mesh.scale.set(k, k, k)

    const m = s.mesh.material as THREE.MeshStandardMaterial
    m.opacity = 1 - t * 0.25
  }

  renderer.render(scene, camera)
  raf = requestAnimationFrame(animate)
}

const setup = () => {
  if (!canvasRef.value || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()

  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(rect.width, rect.height, false)
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(40, rect.width / Math.max(1, rect.height), 0.1, 100)
  camera.position.set(0, 0, 6)

  scene.add(new THREE.AmbientLight(0xffeede, 0.5))

  const key = new THREE.DirectionalLight(0xffe2b8, 1.4)
  key.position.set(3, 4, 5)
  scene.add(key)

  const fillOchre = new THREE.PointLight(0xcc7b3c, 28, 18, 1.6)
  fillOchre.position.set(-3, -1.5, 2)
  scene.add(fillOchre)

  const fillTerracotta = new THREE.PointLight(0x8c3a35, 18, 18, 1.8)
  fillTerracotta.position.set(2, -3, -1)
  scene.add(fillTerracotta)

  group = new THREE.Group()
  scene.add(group)

  const geom = new THREE.IcosahedronGeometry(1, 0)
  for (let i = 0; i < SHARD_COUNT; i++) {
    const phi = Math.acos(-1 + (2 * i) / SHARD_COUNT)
    const theta = Math.sqrt(SHARD_COUNT * Math.PI) * phi
    const r = 1.25 + Math.random() * 0.18
    const x = r * Math.cos(theta) * Math.sin(phi)
    const y = r * Math.sin(theta) * Math.sin(phi)
    const z = r * Math.cos(phi)

    const mat = new THREE.MeshStandardMaterial({
      color: COLORS[i % COLORS.length],
      metalness: 0.55,
      roughness: 0.32,
      flatShading: true,
      transparent: true,
      opacity: 1,
    })
    const mesh = new THREE.Mesh(geom, mat)
    const s = 0.32 + Math.random() * 0.18
    mesh.userData.s = s
    mesh.position.set(x, y, z)
    mesh.scale.setScalar(s)
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    )
    group.add(mesh)

    shards.push({
      mesh,
      base: new THREE.Vector3(x, y, z),
      exploded: new THREE.Vector3(
        x * 4 + (Math.random() - 0.5) * 1.5,
        y * 4 + (Math.random() - 0.5) * 1.5,
        z * 4 + (Math.random() - 0.5) * 1.5,
      ),
      drift: new THREE.Vector3(Math.random() * 6.283, Math.random() * 6.283, Math.random() * 6.283),
      rotSpeed: new THREE.Vector3(0.002 + Math.random() * 0.004, 0.003 + Math.random() * 0.005, 0),
    })
  }

  // Faint inner core for depth
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xfdfbf7,
    transparent: true,
    opacity: 0.05,
  })
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), coreMat)
  core.scale.setScalar(0.6)
  group.add(core)

  raf = requestAnimationFrame(animate)
}

const teardown = () => {
  cancelAnimationFrame(raf)
  shards.forEach((s) => {
    ;(s.mesh.geometry as THREE.BufferGeometry).dispose()
    const m = s.mesh.material as THREE.Material
    m.dispose()
  })
  shards.length = 0
  renderer?.dispose()
  renderer = null
  scene = null
  camera = null
  group = null
}

let observer: IntersectionObserver | null = null

onMounted(() => {
  if (typeof window === 'undefined') return
  reducedMotion.value =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

  setup()
  window.addEventListener('resize', onResize)
  containerRef.value?.parentElement?.addEventListener('pointermove', onMouseMove)

  if (containerRef.value) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisible.value = entry.isIntersecting
          if (!entry.isIntersecting) {
            cancelAnimationFrame(raf)
          } else {
            raf = requestAnimationFrame(animate)
          }
        }
      },
      { threshold: 0.05 },
    )
    observer.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', onResize)
  containerRef.value?.parentElement?.removeEventListener('pointermove', onMouseMove)
  teardown()
})
</script>

<template>
  <div ref="containerRef" class="hero-3d" aria-hidden="true">
    <canvas ref="canvasRef" class="block w-full h-full" />
  </div>
</template>

<style scoped>
.hero-3d {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
</style>
