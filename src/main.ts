import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useAuth } from './composables/useAuth'
import './style.css'

const app = createApp(App)
app.use(router)

app.mount('#app')

const { checkAuth } = useAuth()
checkAuth().catch(() => {
  /* silently handle errors */
})
