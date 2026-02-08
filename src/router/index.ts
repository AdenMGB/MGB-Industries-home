import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

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

router.beforeEach(async (to, from, next) => {
  const { checkAuth, isAuthenticated, isAdmin } = useAuth()

  // Check authentication status
  await checkAuth()

  // Public routes (login, signup) - redirect to account if already logged in
  if (to.meta.public) {
    if (isAuthenticated.value) {
      next({ name: 'Account' })
    } else {
      next()
    }
    return
  }

  // Protected routes
  if (to.meta.requiresAuth) {
    if (!isAuthenticated.value) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }

    // Admin-only routes
    if (to.meta.requiresAdmin && !isAdmin.value) {
      next({ name: 'Account' })
      return
    }
  }

  next()
})

export default router
