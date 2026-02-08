import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { templateCompilerOptions } from '@tresjs/core'

// https://vite.dev/config/
export default defineConfig(async () => {
  const plugins: any[] = [
    vue({
      ...templateCompilerOptions,
    }),
    vueDevTools(),
  ]

  // Only add server plugin in development (not during production build)
  // Check if we're in dev mode and the file exists
  if (process.env.NODE_ENV !== 'production' && !process.env.VITE_BUILD) {
    try {
      const { vitePluginServer } = await import('./vite-plugin-server.js')
      plugins.push(vitePluginServer())
    } catch (error) {
      // Ignore if plugin file doesn't exist or can't be imported during build
      // This is expected in production builds
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      include: ['three', '@tresjs/core'],
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
