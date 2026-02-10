import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info' | 'loading'

export interface Toast {
  id: number
  message: string
  type: ToastType
  duration?: number
}

const toasts = ref<Toast[]>([])
let nextId = 0
let hideTimer: ReturnType<typeof setTimeout> | null = null

export function useToast() {
  const add = (message: string, type: ToastType = 'info', duration = 4000) => {
    const id = ++nextId
    toasts.value = [...toasts.value, { id, message, type, duration }]

    if (type !== 'loading' && duration > 0) {
      hideTimer = setTimeout(() => {
        remove(id)
        hideTimer = null
      }, duration)
    }

    return id
  }

  const remove = (id: number) => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  const success = (message: string, duration?: number) => add(message, 'success', duration)
  const error = (message: string, duration?: number) => add(message, 'error', duration ?? 6000)
  const info = (message: string, duration?: number) => add(message, 'info', duration)
  const loading = (message: string) => add(message, 'loading', 0)

  return {
    toasts,
    add,
    remove,
    success,
    error,
    info,
    loading,
  }
}
