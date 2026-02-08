import type { Plugin } from 'vite'

let server: any = null

export function vitePluginServer(): Plugin {
  return {
    name: 'vite-plugin-server',
    async configureServer(viteServer) {
      // Lazy load server code only when plugin runs
      const { createServer } = await import('./server/index.js')
      
      // Start Fastify server
      const fastify = await createServer()
      const port = Number(process.env.PORT) || 3001
      const host = process.env.HOST || 'localhost'

      await fastify.listen({ port, host })
      server = fastify

      viteServer.httpServer?.on('close', async () => {
        await fastify.close()
      })
    },
    configurePreviewServer(previewServer) {
      // Also start server in preview mode
      import('./server/index.js').then(({ createServer }) => {
        createServer().then((fastify) => {
          const port = Number(process.env.PORT) || 3001
          const host = process.env.HOST || 'localhost'
          fastify.listen({ port, host })
          server = fastify

          previewServer.httpServer?.on('close', async () => {
            await fastify.close()
          })
        })
      })
    },
  }
}
