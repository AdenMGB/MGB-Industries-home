import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = localStorage.getItem('theme') as ThemeMode | null
    if (saved === 'dark' || saved === 'light') return saved
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch {
    // ignore
  }
  return 'light'
}

const themeMode = ref<ThemeMode>(getInitialTheme())

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  if (mode === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  try {
    localStorage.setItem('theme', mode)
  } catch {
    // ignore
  }
}

// Apply on module load
applyTheme(themeMode.value)

export function useTheme() {
  const toggleTheme = () => {
    themeMode.value = themeMode.value === 'light' ? 'dark' : 'light'
    applyTheme(themeMode.value)
  }

  watch(themeMode, applyTheme, { immediate: true })

  return {
    themeMode,
    toggleTheme,
    isDark: () => themeMode.value === 'dark',
  }
}
