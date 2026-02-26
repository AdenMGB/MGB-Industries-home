/**
 * WebSocket connection for tournaments - uses callback pattern.
 * Connect with tournamentId and participantId.
 */
import { shallowRef } from 'vue'
import { getWsBase } from '@/utils/wsBase'

export interface TournamentWsCallbacks {
  onRoomState: (data: {
    tournamentId: string
    bracketIndex: number
    status: string
    config: Record<string, unknown>
    participants: Array<{ id: string; displayName: string; score: number }>
    syncRound: number
  }) => void
  onSyncRoundComplete?: (data: { round: number; allReady: boolean }) => void
  onGameStarted?: () => void
  onQuestion?: (data: { value: string; index: number }) => void
  onAnswerResult?: (data: { correct: boolean }) => void
  onLeaderboard?: (data: Array<{ rank: number; displayName: string; score: number; isGuest: boolean }>) => void
  onGameEnded?: (data: { leaderboard: Array<{ rank: number; displayName: string; score: number; isGuest: boolean }>; reason?: string }) => void
}

export function createTournamentWebSocket() {
  const ws = shallowRef<WebSocket | null>(null)
  let callbacks: TournamentWsCallbacks | null = null

  function setCallbacks(cb: TournamentWsCallbacks) {
    callbacks = cb
  }

  function connect(tournamentId: string, participantId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${getWsBase()}/ws/tournament/${tournamentId}?participantId=${encodeURIComponent(participantId)}`
      try {
        const socket = new WebSocket(wsUrl)
        ws.value = socket

        socket.onopen = () => resolve()

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data) as { type: string; payload?: unknown }
            const cb = callbacks
            if (!cb) return

            switch (msg.type) {
              case 'room_state':
                cb.onRoomState(msg.payload as Parameters<TournamentWsCallbacks['onRoomState']>[0])
                break
              case 'sync_round_complete':
                cb.onSyncRoundComplete?.(msg.payload as { round: number; allReady: boolean })
                break
              case 'game_started':
                cb.onGameStarted?.()
                break
              case 'question':
                cb.onQuestion?.(msg.payload as { value: string; index: number })
                break
              case 'answer_result':
                cb.onAnswerResult?.(msg.payload as { correct: boolean })
                break
              case 'leaderboard':
                cb.onLeaderboard?.(msg.payload as Array<{ rank: number; displayName: string; score: number; isGuest: boolean }>)
                break
              case 'game_ended':
                cb.onGameEnded?.(msg.payload as { leaderboard: Array<{ rank: number; displayName: string; score: number; isGuest: boolean }>; reason?: string })
                break
              default:
                break
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

  function send(type: string, payload?: unknown): void {
    const s = ws.value
    if (s && s.readyState === WebSocket.OPEN) {
      s.send(JSON.stringify({ type, payload }))
    }
  }

  function disconnect(): void {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
  }

  return { ws, setCallbacks, connect, disconnect, send }
}
