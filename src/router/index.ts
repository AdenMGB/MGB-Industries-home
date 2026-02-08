import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/HomePage.vue'),
    meta: { transition: 'slide-up' },
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('@/pages/ProjectsPage.vue'),
    meta: { transition: 'morph' },
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/pages/AboutPage.vue'),
    meta: { transition: 'flip' },
  },
  {
    path: '/contact',
    name: 'Contact',
    component: () => import('@/pages/ContactPage.vue'),
    meta: { transition: 'zoom' },
  },
  {
    path: '/games',
    name: 'Games',
    component: () => import('@/pages/GamesPage.vue'),
    meta: { transition: 'slide-up' },
  },
  {
    path: '/games/:id',
    name: 'Game',
    component: () => import('@/pages/GamePage.vue'),
    meta: { transition: 'zoom' },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { transition: 'slide-up', public: true },
  },
  {
    path: '/signup',
    name: 'Signup',
    component: () => import('@/pages/SignupPage.vue'),
    meta: { transition: 'slide-up', public: true },
  },
  {
    path: '/account',
    name: 'Account',
    component: () => import('@/pages/AccountDashboard.vue'),
    meta: { transition: 'slide-up', requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/pages/AdminDashboard.vue'),
    meta: { transition: 'slide-up', requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/pages/ResetPasswordPage.vue'),
    meta: { transition: 'slide-up', public: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  },
})

router.beforeEach((to, from, next) => {
  // Check token synchronously (non-blocking)
  const hasToken = !!localStorage.getItem('auth_token')

  // Start auth check in background (completely non-blocking)
  if (hasToken) {
    // Defer to next tick to avoid blocking
    Promise.resolve().then(() => {
      import('@/composables/useAuth').then(({ useAuth }) => {
        const { checkAuth } = useAuth()
        checkAuth().catch(() => {
          // Silently handle errors
        })
      })
    })
  }

  // Public routes - allow immediately
  if (to.meta.public) {
    next()
    // Redirect if authenticated (non-blocking, after navigation)
    if (hasToken) {
      Promise.resolve().then(() => {
        import('@/composables/useAuth').then(({ useAuth }) => {
          const { isAuthenticated } = useAuth()
          setTimeout(() => {
            if (isAuthenticated.value && (to.name === 'Login' || to.name === 'Signup')) {
              router.push({ name: 'Account' })
            }
          }, 100)
        })
      })
    }
    return
  }

  // Protected routes - check token only
  if (to.meta.requiresAuth) {
    if (!hasToken) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
    // Has token - allow navigation, component will verify
    next()
    return
  }

  // No auth requirements
  next()
})

export default router
