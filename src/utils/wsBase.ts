/**
 * WebSocket base URL - uses VITE_API_URL host when set (for direct backend connection),
 * otherwise uses current origin (relies on Vite proxy in dev).
 */
export function getWsBase(): string {
  if (typeof window === 'undefined') return ''
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined
  if (apiUrl) {
    try {
      const url = new URL(apiUrl)
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${protocol}//${url.host}`
    } catch {
      /* fall through to default */
    }
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}
