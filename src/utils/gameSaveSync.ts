import { api } from '@/api/client'
import { useAuth } from '@/composables/useAuth'

let syncInterval: number | null = null
let isSyncing = false
const SYNC_INTERVAL = 30000 // 30 seconds
const DEBOUNCE_DELAY = 2000 // 2 seconds after last localStorage change

let lastSaveTime = 0
let debounceTimer: number | null = null

/**
 * Load save data and inject it into iframe before game initializes
 */
export async function loadAndInjectSaveData(gameId: string, iframe: HTMLIFrameElement): Promise<void> {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated.value) {
    return
  }

  try {
    // Load save data from backend
    const response = await api.getGameSave(gameId)
    const saveData = response.data?.saveData || {}

    if (Object.keys(saveData).length === 0) {
      return // No save data to inject
    }

    // Wait for iframe to load
    return new Promise((resolve) => {
      const checkAndInject = () => {
        try {
          const iframeWindow = iframe.contentWindow
          const iframeDoc = iframe.contentDocument || iframeWindow?.document

          if (iframeDoc && iframeDoc.readyState === 'loading') {
            // Document is still loading, wait a bit
            setTimeout(checkAndInject, 50)
            return
          }

          if (iframeWindow && iframeWindow.localStorage) {
            // Inject save data into localStorage
            for (const [key, value] of Object.entries(saveData)) {
              try {
                iframeWindow.localStorage.setItem(key, String(value))
              } catch (e) {
                console.warn('Failed to set localStorage item:', key, e)
              }
            }
            resolve()
          } else {
            // Iframe not ready yet, try again
            setTimeout(checkAndInject, 100)
          }
        } catch (error) {
          // Cross-origin or not ready yet
          console.warn('Cannot access iframe yet:', error)
          setTimeout(checkAndInject, 100)
        }
      }

      // Start checking immediately
      checkAndInject()

      // Also listen for load event
      iframe.addEventListener('load', () => {
        setTimeout(checkAndInject, 100)
      }, { once: true })
    })
  } catch (error) {
    // Save not found is okay
    if (error instanceof Error && !error.message.includes('404')) {
      console.warn('Failed to load save data:', error)
    }
  }
}

/**
 * Set up postMessage sync to receive save data from iframe
 */
export function setupPostMessageSync(gameId: string, iframe: HTMLIFrameElement) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated.value) {
    return () => {}
  }

  // Listen for save data from iframe
  const handleMessage = async (event: MessageEvent) => {
    if (event.data?.type === 'GAME_SAVE_DATA' && event.data?.gameId === gameId) {
      await syncGameSaveToBackend(gameId, event.data.saveData)
    }
  }

  window.addEventListener('message', handleMessage)

  // Also set up periodic sync by reading localStorage (for same-origin games)
  const interval = setInterval(() => {
    syncFromIframe(gameId, iframe)
  }, SYNC_INTERVAL)

  // Sync on page unload
  const unloadHandler = () => {
    syncFromIframe(gameId, iframe, true)
  }
  window.addEventListener('beforeunload', unloadHandler)

  // Cleanup function
  return () => {
    window.removeEventListener('message', handleMessage)
    window.removeEventListener('beforeunload', unloadHandler)
    clearInterval(interval)
  }
}

async function syncFromIframe(gameId: string, iframe: HTMLIFrameElement, force = false) {
  if (isSyncing && !force) return

  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) return

  try {
    const iframeWindow = iframe.contentWindow
    if (!iframeWindow) return

    let saveData: Record<string, any> = {}

    try {
      // Try to read localStorage from iframe (only works for same-origin)
      const iframeDoc = iframe.contentDocument || iframeWindow.document
      if (iframeDoc && iframeDoc.defaultView) {
        const iframeLocalStorage = iframeDoc.defaultView.localStorage
        if (iframeLocalStorage) {
          // Read all localStorage items
          for (let i = 0; i < iframeLocalStorage.length; i++) {
            const key = iframeLocalStorage.key(i)
            if (key) {
              saveData[key] = iframeLocalStorage.getItem(key)
            }
          }
        }
      }
    } catch (error) {
      // Cross-origin restriction - can't access localStorage directly
      // Will rely on postMessage instead
      return
    }

    // Only save if there's data and enough time has passed
    const now = Date.now()
    if (Object.keys(saveData).length > 0 && (force || now - lastSaveTime > DEBOUNCE_DELAY)) {
      await syncGameSaveToBackend(gameId, saveData)
    }
  } catch (error) {
    console.error('Failed to sync from iframe:', error)
  }
}

async function syncGameSaveToBackend(gameId: string, saveData: Record<string, any>) {
  if (isSyncing) return

  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) return

  // Only save if there's data and enough time has passed
  const now = Date.now()
  if (Object.keys(saveData).length > 0 && now - lastSaveTime > DEBOUNCE_DELAY) {
    try {
      isSyncing = true
      await api.saveGame(gameId, saveData)
      lastSaveTime = now
    } catch (error) {
      console.error('Failed to sync game save:', error)
    } finally {
      isSyncing = false
    }
  }
}
