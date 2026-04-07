import { api } from '@/api/client'
import { useAuth } from '@/composables/useAuth'

const DEBOUNCE_MS = 3000
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let isSyncing = false

/**
 * Load a saved state for an in-house arcade game.
 * Returns an empty object if not authenticated or no save exists.
 */
export async function loadArcadeSave<T extends Record<string, unknown>>(
  gameId: string,
): Promise<T> {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) return {} as T

  try {
    const res = await api.getGameSave(gameId)
    return (res.data?.saveData as T) ?? ({} as T)
  } catch {
    return {} as T
  }
}

/**
 * Debounced save for in-house arcade games.
 * Calls are deduplicated; the last value wins within the debounce window.
 */
export function saveArcadeState(
  gameId: string,
  state: Record<string, unknown>,
): void {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) return

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(async () => {
    if (isSyncing) return
    isSyncing = true
    try {
      await api.saveGame(gameId, state)
    } catch {
      /* silently fail — game is still playable */
    } finally {
      isSyncing = false
    }
  }, DEBOUNCE_MS)
}

/**
 * Immediately flush any pending debounced save.
 * Call this on unmount / route-leave so no state is lost.
 */
export async function flushArcadeSave(
  gameId: string,
  state: Record<string, unknown>,
): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) return

  try {
    await api.saveGame(gameId, state)
  } catch {
    /* silently fail */
  }
}

/**
 * Record a game visit (history).
 */
export async function recordArcadeVisit(
  gameId: string,
  gameName: string,
  gameHref: string,
): Promise<void> {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) return
  try {
    await api.recordGameVisit(gameId, gameName, gameHref)
  } catch {
    /* silently fail */
  }
}
