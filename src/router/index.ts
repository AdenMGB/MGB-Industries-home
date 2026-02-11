import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { getCookie } from '@/utils/cookies'
import { setMeta, type MetaOptions } from '@/composables/useMeta'
import { SITE_URL } from '@/config/seo'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/HomePage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'AdenMGB',
        description: 'Open source developer & creative technologist. Portfolio of projects, games, and contact.',
        canonical: SITE_URL + '/',
      },
    },
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('@/pages/ProjectsPage.vue'),
    meta: {
      transition: 'morph',
      seo: {
        title: 'Projects',
        description: 'Open source projects and creative technology work by AdenMGB.',
      },
    },
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/pages/AboutPage.vue'),
    meta: {
      transition: 'flip',
      seo: {
        title: 'About',
        description: 'About AdenMGB - Open source developer, creative technologist. Timeline and background.',
      },
    },
  },
  {
    path: '/contact',
    name: 'Contact',
    component: () => import('@/pages/ContactPage.vue'),
    meta: {
      transition: 'zoom',
      seo: {
        title: 'Contact',
        description: 'Get in touch with AdenMGB. Send a message or reach out via email.',
      },
    },
  },
  {
    path: '/developer-tools',
    name: 'DeveloperTools',
    component: () => import('@/pages/DeveloperToolsPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Developer Tools',
        description: 'Developer utilities: Base64, JSON, URL, UUID, timestamps, and more.',
      },
    },
  },
  {
    path: '/developer-tools/ipv4-to-binary',
    name: 'IPv4ToBinary',
    component: () => import('@/pages/IPv4ToBinaryPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'IPv4 to Binary',
        description: 'Convert IPv4 addresses to binary notation.',
      },
    },
  },
  {
    path: '/developer-tools/ipv6-to-hex',
    name: 'IPv6ToHex',
    component: () => import('@/pages/IPv6ToHexPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'IPv6 to Hexadecimal',
        description: 'Convert IPv6 addresses to expanded and pure hexadecimal.',
      },
    },
  },
  {
    path: '/developer-tools/base64',
    name: 'Base64',
    component: () => import('@/pages/Base64Page.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Base64 Encode/Decode',
        description: 'Encode and decode text to and from Base64.',
      },
    },
  },
  {
    path: '/developer-tools/json-formatter',
    name: 'JsonFormatter',
    component: () => import('@/pages/JsonFormatterPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'JSON Formatter',
        description: 'Pretty print, minify, and validate JSON.',
      },
    },
  },
  {
    path: '/developer-tools/url-encode',
    name: 'UrlEncode',
    component: () => import('@/pages/UrlEncodePage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'URL Encode/Decode',
        description: 'Encode and decode URL parameters.',
      },
    },
  },
  {
    path: '/developer-tools/uuid-generator',
    name: 'UuidGenerator',
    component: () => import('@/pages/UuidGeneratorPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'UUID Generator',
        description: 'Generate random UUIDs (v4).',
      },
    },
  },
  {
    path: '/developer-tools/unix-timestamp',
    name: 'UnixTimestamp',
    component: () => import('@/pages/UnixTimestampPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Unix Timestamp',
        description: 'Convert between Unix timestamp and human-readable date.',
      },
    },
  },
  {
    path: '/games',
    name: 'Games',
    component: () => import('@/pages/GamesPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Games',
        description: 'Play browser games and offline HTML games. Save progress and favorite games.',
      },
    },
  },
  {
    path: '/games/:id',
    name: 'Game',
    component: () => import('@/pages/GamePage.vue'),
    meta: {
      transition: 'zoom',
      seo: {
        title: 'Game',
        description: 'Play browser games. Save progress and favorite games.',
        // Game page overrides with dynamic title/description in component
      },
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: {
      transition: 'slide-up',
      public: true,
      seo: { title: 'Login', description: 'Log in to your AdenMGB account.', noIndex: true },
    },
  },
  {
    path: '/signup',
    name: 'Signup',
    component: () => import('@/pages/SignupPage.vue'),
    meta: {
      transition: 'slide-up',
      public: true,
      seo: { title: 'Sign Up', description: 'Create an AdenMGB account.', noIndex: true },
    },
  },
  {
    path: '/account',
    name: 'Account',
    component: () => import('@/pages/AccountDashboard.vue'),
    meta: {
      transition: 'slide-up',
      requiresAuth: true,
      seo: { title: 'Account', description: 'Manage your account settings.', noIndex: true },
    },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/pages/AdminDashboard.vue'),
    meta: {
      transition: 'slide-up',
      requiresAuth: true,
      requiresAdmin: true,
      seo: { title: 'Admin', description: 'Admin dashboard.', noIndex: true },
    },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/pages/ResetPasswordPage.vue'),
    meta: {
      transition: 'slide-up',
      public: true,
      seo: { title: 'Reset Password', description: 'Reset your password.', noIndex: true },
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: { title: 'Not Found', description: 'Page not found.', noIndex: true },
    },
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

// Apply SEO meta on every navigation
router.afterEach((to) => {
  if (typeof document === 'undefined') return
  const seo = to.meta?.seo as Record<string, unknown> | undefined
  const canonical = seo?.canonical ?? `${SITE_URL}${to.fullPath.split('?')[0]}`
  setMeta({ ...seo, canonical } as MetaOptions)
})

router.beforeEach((to, from, next) => {
  // Check token synchronously (non-blocking)
  const hasToken = !!getCookie('auth_token')

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
