import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const mouseX = ref(0)
  const mouseY = ref(0)

  const updateMouse = (e: MouseEvent) => {
    mouseX.value = e.clientX
    mouseY.value = e.clientY
  }

  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', updateMouse)
    }
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', updateMouse)
    }
  })

  return {
    mouseX,
    mouseY,
  }
}
