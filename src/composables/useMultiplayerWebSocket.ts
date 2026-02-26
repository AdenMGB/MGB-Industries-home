/**
 * WebSocket connection for multiplayer - uses callback pattern so state lives in the component.
 * Call connect(roomId, participantId) when you have the IDs. No lifecycle hooks - component handles cleanup.
 */
import { shallowRef } from 'vue'

function getWsBase(): string {
  if (typeof window === 'undefined') return ''
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

export interface ParticipantInfo {
  id: string
  displayName: string
  role: string
  score: number
  isHost?: boolean
}

export interface RoomConfig {
  mode: string
  conv: string
  goalType: string
  goalValue: Record<string, unknown>
}

export interface WsMessage {
  type: string
  payload?: unknown
}

export interface MultiplayerWsCallbacks {
  onRoomState: (data: {
    roomId: string
    status: string
    config: RoomConfig
    participants: ParticipantInfo[]
    showLeaderboard: boolean
    syncRound: number
  }) => void
  onSyncRoundComplete?: (data: { round: number; allReady: boolean }) => void
  onGameStarted?: () => void
  onQuestion?: (data: { value: string; index: number }) => void
  onAnswerResult?: (data: { correct: boolean }) => void
  onLeaderboard?: (data: Array<{ rank: number; displayName: string; score: number; isGuest: boolean }>) => void
  onChatMessage?: (data: { participantId: string; displayName: string; message: string; timestamp: string }) => void
  onGameEnded?: (data: { leaderboard: Array<{ rank: number; displayName: string; score: number; isGuest: boolean }>; reason?: string }) => void
}

export function createMultiplayerWebSocket() {
  const ws = shallowRef<WebSocket | null>(null)
  let callbacks: MultiplayerWsCallbacks | null = null

  function setCallbacks(cb: MultiplayerWsCallbacks) {
    callbacks = cb
  }

  function connect(roomId: string, participantId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${getWsBase()}/ws/multiplayer/${roomId}?participantId=${encodeURIComponent(participantId)}`
      try {
        const socket = new WebSocket(wsUrl)
        ws.value = socket

        socket.onopen = () => resolve()

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data) as WsMessage
            const cb = callbacks
            if (!cb) return

            switch (msg.type) {
              case 'room_state': {
                const p = msg.payload as Parameters<MultiplayerWsCallbacks['onRoomState']>[0]
                cb.onRoomState(p)
                break
              }
              case 'sync_round_complete': {
                cb.onSyncRoundComplete?.(msg.payload as { round: number; allReady: boolean })
                break
              }
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
              case 'chat_message':
                cb.onChatMessage?.(msg.payload as { participantId: string; displayName: string; message: string; timestamp: string })
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

        socket.onclose = () => {
          ws.value = null
        }

        socket.onerror = () => {
          reject(new Error('WebSocket connection failed'))
        }
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

  return {
    ws,
    setCallbacks,
    connect,
    disconnect,
    send,
  }
}
