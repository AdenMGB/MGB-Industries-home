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

export default router
