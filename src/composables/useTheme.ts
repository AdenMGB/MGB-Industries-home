import { ref, watch } from 'vue'

export type ThemeMode = 'glassmorphism' | 'hacker'

const themeMode = ref<ThemeMode>('glassmorphism')

export function useTheme() {
  const toggleTheme = () => {
    themeMode.value = themeMode.value === 'glassmorphism' ? 'hacker' : 'glassmorphism'
    document.documentElement.classList.toggle('hacker-mode', themeMode.value === 'hacker')
  }

  watch(themeMode, (newMode) => {
    document.documentElement.setAttribute('data-theme', newMode)
  }, { immediate: true })

  return {
    themeMode,
    toggleTheme,
    isHackerMode: () => themeMode.value === 'hacker',
  }
}
