import { createApp } from 'vue'
import Tres from '@tresjs/core'
import App from './App.vue'
import router from './router'
import { useAuth } from './composables/useAuth'
import './style.css'

const app = createApp(App)
app.use(Tres)
app.use(router)

// Mount app immediately (non-blocking)
app.mount('#app')

// Check authentication in background after mount
const { checkAuth } = useAuth()
checkAuth().catch(() => {
  // Silently handle errors - UI will show as not authenticated
})
