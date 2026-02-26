import fastifyWebsocket from '@fastify/websocket'
import type { FastifyInstance } from 'fastify'
import { registerMultiplayerWebSocket } from '../websocket/multiplayerHandler.js'
import { registerTournamentWebSocket } from '../websocket/tournamentHandler.js'

export async function websocketPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyWebsocket)
  registerMultiplayerWebSocket(fastify)
  registerTournamentWebSocket(fastify)
}
