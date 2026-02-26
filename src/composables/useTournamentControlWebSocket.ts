/**
 * WebSocket for tournament control panel - creator only, receives bracket updates.
 */
import { shallowRef } from 'vue'
import { getCookie } from '@/utils/cookies'
import { getWsBase } from '@/utils/wsBase'

export interface TournamentControlCallbacks {
  onBracketUpdate: (data: { bracketIndex: number; status: string; syncRound?: number }) => void
}

export function createTournamentControlWebSocket() {
  const ws = shallowRef<WebSocket | null>(null)
  let callbacks: TournamentControlCallbacks | null = null

  function setCallbacks(cb: TournamentControlCallbacks) {
    callbacks = cb
  }

  function connect(tournamentId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = getCookie('auth_token')
      if (!token) {
        reject(new Error('Not authenticated'))
        return
      }
      const wsUrl = `${getWsBase()}/ws/tournament/${tournamentId}/control?token=${encodeURIComponent(token)}`
      try {
        const socket = new WebSocket(wsUrl)
        ws.value = socket

        socket.onopen = () => resolve()

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data) as { type: string; payload?: unknown }
            const cb = callbacks
            if (!cb) return
            if (msg.type === 'bracket_update') {
              cb.onBracketUpdate(msg.payload as { bracketIndex: number; status: string; syncRound?: number })
            }
          } catch {
            /* ignore */
          }
        }

        socket.onclose = () => { ws.value = null }
        socket.onerror = () => reject(new Error('WebSocket connection failed'))
      } catch (err) {
        reject(err)
      }
    })
  }

  function disconnect(): void {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
  }

  return { ws, setCallbacks, connect, disconnect }
}
