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
        title: 'IPv4 ↔ Binary',
        description: 'Convert between IPv4 addresses and binary notation.',
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
        title: 'IPv6 ↔ Hexadecimal',
        description: 'Convert between IPv6 addresses and hexadecimal notation.',
      },
    },
  },
  {
    path: '/developer-tools/number-to-binary',
    name: 'NumberToBinary',
    component: () => import('@/pages/NumberToBinaryPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Number to Binary',
        description: 'Convert numbers to binary notation.',
      },
    },
  },
  {
    path: '/developer-tools/conversion-trainer',
    name: 'ConversionTrainer',
    component: () => import('@/pages/ConversionTrainerPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Conversion Trainer',
        description: 'Practice binary and hexadecimal conversion with calculator, reference table, and quiz games.',
      },
    },
  },
  {
    path: '/developer-tools/number-to-hex',
    name: 'NumberToHex',
    component: () => import('@/pages/NumberToHexPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Number to Hex & Decimal',
        description: 'Convert numbers between decimal and hexadecimal notation.',
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
    path: '/developer-tools/color-converter',
    name: 'ColorConverter',
    component: () => import('@/pages/ColorConverterPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Color Converter',
        description: 'Convert colors between hex, RGB, and HSL.',
      },
    },
  },
  {
    path: '/developer-tools/diff-checker',
    name: 'DiffChecker',
    component: () => import('@/pages/DiffCheckerPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Diff Checker',
        description: 'Compare two texts and see the differences.',
      },
    },
  },
  {
    path: '/developer-tools/case-converter',
    name: 'CaseConverter',
    component: () => import('@/pages/CaseConverterPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Case Converter',
        description: 'Convert text between camelCase, snake_case, kebab-case, and more.',
      },
    },
  },
  {
    path: '/developer-tools/html-encode',
    name: 'HtmlEncode',
    component: () => import('@/pages/HtmlEncodePage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'HTML Encode/Decode',
        description: 'Escape and unescape HTML entities.',
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
    path: '/developer-tools/regex-tester',
    name: 'RegexTester',
    component: () => import('@/pages/RegexTesterPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Regex Tester',
        description: 'Test regular expressions with sample text.',
      },
    },
  },
  {
    path: '/developer-tools/jwt-decoder',
    name: 'JwtDecoder',
    component: () => import('@/pages/JwtDecoderPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'JWT Decoder',
        description: 'Decode and inspect JWT tokens.',
      },
    },
  },
  {
    path: '/developer-tools/hash-generator',
    name: 'HashGenerator',
    component: () => import('@/pages/HashGeneratorPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Hash Generator',
        description: 'Generate MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes.',
      },
    },
  },
  {
    path: '/developer-tools/git-history',
    name: 'GitHistory',
    component: () => import('@/pages/GitHistoryPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Git History Visualizer',
        description: 'View commit history with timeline and links to commits.',
      },
    },
  },
  {
    path: '/developer-tools/git-commit',
    name: 'GitCommit',
    component: () => import('@/pages/GitCommitPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Git Commit',
        description: 'View commit details and file diff.',
      },
    },
  },
  {
    path: '/developer-tools/git-stats',
    name: 'GitStats',
    component: () => import('@/pages/GitStatsPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Git Commit Stats',
        description: 'Total commits and per-author breakdown.',
      },
    },
  },
  {
    path: '/developer-tools/git-search',
    name: 'GitSearch',
    component: () => import('@/pages/GitSearchPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Git Commit Search',
        description: 'Search commits by author and date range.',
      },
    },
  },
  {
    path: '/developer-tools/git-file-history',
    name: 'GitFileHistory',
    component: () => import('@/pages/GitFileHistoryPage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Git File History',
        description: 'View commits that modified a specific file.',
      },
    },
  },
  {
    path: '/developer-tools/git-compare',
    name: 'GitCompare',
    component: () => import('@/pages/GitComparePage.vue'),
    meta: {
      transition: 'slide-up',
      seo: {
        title: 'Git Branch Compare',
        description: 'Compare branches and view commits ahead.',
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
