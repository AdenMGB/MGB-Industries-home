interface SocketLike {
  send(data: string): void
  readyState: number
}

const roomConnections = new Map<string, Map<string, SocketLike>>()

export function addConnection(roomId: string, participantId: string, socket: SocketLike): void {
  let conns = roomConnections.get(roomId)
  if (!conns) {
    conns = new Map()
    roomConnections.set(roomId, conns)
  }
  conns.set(participantId, socket)
}

export function removeConnection(roomId: string, participantId: string): void {
  const conns = roomConnections.get(roomId)
  if (conns) {
    conns.delete(participantId)
    if (conns.size === 0) roomConnections.delete(roomId)
  }
}

export function broadcastToRoom(
  roomId: string,
  message: object,
  excludeParticipantId?: string
): void {
  const conns = roomConnections.get(roomId)
  if (!conns) return
  const msg = JSON.stringify(message)
  for (const [pid, socket] of conns) {
    if ((excludeParticipantId === undefined || pid !== excludeParticipantId) && socket.readyState === 1) {
      try {
        socket.send(msg)
      } catch {
        /* ignore */
      }
    }
  }
}


export function sendToParticipant(roomId: string, participantId: string, message: object): void {
  const conns = roomConnections.get(roomId)
  const socket = conns?.get(participantId)
  if (socket && socket.readyState === 1) {
    try {
      socket.send(JSON.stringify(message))
    } catch {
      /* ignore */
    }
  }
}
