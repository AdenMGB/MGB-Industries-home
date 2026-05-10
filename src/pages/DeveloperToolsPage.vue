<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { useAuth } from '@/composables/useAuth'
import { api } from '@/api/client'
import {
  AcademicCapIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  CodeBracketSquareIcon,
  DocumentDuplicateIcon,
  LinkIcon,
  HashtagIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  SwatchIcon,
  UserGroupIcon,
  ArrowRightIcon,
} from '@heroicons/vue/24/outline'
import { TrophyIcon as TrophyIconSolid } from '@heroicons/vue/24/solid'
import { CONVERSION_TRAINER_ACHIEVEMENTS } from '@/config/conversionTrainerAchievements'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const router = useRouter()
const { isAuthenticated } = useAuth()
const conversionAchievements = ref<Set<string>>(new Set())
const conversionAchievementCount = computed(() => conversionAchievements.value.size)

type Accent = 'ochre' | 'terracotta' | 'eucalyptus'

interface Tool {
  name: string
  description: string
  path: string
  icon: typeof CommandLineIcon
  accent: Accent
}

interface Category {
  id: string
  title: string
  blurb: string
  tools: Tool[]
}

import { CommandLineIcon } from '@heroicons/vue/24/outline'

const categories: Category[] = [
  {
    id: 'learn-practice',
    title: 'Learn & Practice',
    blurb: 'Build mental models the slow, satisfying way.',
    tools: [
      {
        name: 'Conversion Trainer',
        description:
          'Practice mental binary and hex conversion with calculator, reference table, and quiz games.',
        path: '/developer-tools/conversion-trainer',
        icon: AcademicCapIcon,
        accent: 'ochre',
      },
      {
        name: 'Conversion Trainer · Multiplayer',
        description:
          'Real-time 1v1 or up to 32 players with shareable links. Tournament mode goes to 10,000.',
        path: '/developer-tools/conversion-trainer/multiplayer',
        icon: UserGroupIcon,
        accent: 'terracotta',
      },
    ],
  },
  {
    id: 'converters',
    title: 'Converters',
    blurb: 'Numbers, addresses, encodings — translated cleanly.',
    tools: [
      {
        name: 'IPv4 ↔ Binary',
        description: 'Convert between IPv4 addresses and binary notation.',
        path: '/developer-tools/ipv4-to-binary',
        icon: ArrowPathIcon,
        accent: 'ochre',
      },
      {
        name: 'IPv6 ↔ Hexadecimal',
        description: 'Convert between IPv6 addresses and hexadecimal.',
        path: '/developer-tools/ipv6-to-hex',
        icon: ArrowPathIcon,
        accent: 'terracotta',
      },
      {
        name: 'Number ↔ Binary',
        description: 'Convert between decimal and binary notation.',
        path: '/developer-tools/number-to-binary',
        icon: ArrowPathIcon,
        accent: 'ochre',
      },
      {
        name: 'Number to Hex & Decimal',
        description: 'Convert numbers between decimal, hex, octal, and binary.',
        path: '/developer-tools/number-to-hex',
        icon: ArrowPathIcon,
        accent: 'terracotta',
      },
      {
        name: 'Base64 Encode/Decode',
        description: 'Encode and decode text or files to Base64.',
        path: '/developer-tools/base64',
        icon: DocumentDuplicateIcon,
        accent: 'eucalyptus',
      },
      {
        name: 'URL Encode/Decode',
        description: 'Encode and decode URL parameters.',
        path: '/developer-tools/url-encode',
        icon: LinkIcon,
        accent: 'ochre',
      },
      {
        name: 'HTML Encode/Decode',
        description: 'Escape and unescape HTML entities.',
        path: '/developer-tools/html-encode',
        icon: CodeBracketSquareIcon,
        accent: 'eucalyptus',
      },
      {
        name: 'Color Converter',
        description: 'Convert colors between hex, RGB, and HSL.',
        path: '/developer-tools/color-converter',
        icon: SwatchIcon,
        accent: 'terracotta',
      },
    ],
  },
  {
    id: 'formatters',
    title: 'Formatters',
    blurb: 'Make a mess of text presentable.',
    tools: [
      {
        name: 'JSON Formatter',
        description: 'Pretty print, minify, and validate JSON.',
        path: '/developer-tools/json-formatter',
        icon: CodeBracketSquareIcon,
        accent: 'eucalyptus',
      },
      {
        name: 'Case Converter',
        description: 'camelCase, snake_case, kebab-case, and more — translated.',
        path: '/developer-tools/case-converter',
        icon: ArrowsRightLeftIcon,
        accent: 'ochre',
      },
    ],
  },
  {
    id: 'generators',
    title: 'Generators',
    blurb: 'Create things from nothing.',
    tools: [
      {
        name: 'UUID Generator',
        description: 'Generate random UUIDs (v4).',
        path: '/developer-tools/uuid-generator',
        icon: HashtagIcon,
        accent: 'terracotta',
      },
      {
        name: 'Hash Generator',
        description: 'Generate MD5, SHA-1, SHA-256, SHA-384, SHA-512 hashes.',
        path: '/developer-tools/hash-generator',
        icon: ArrowPathIcon,
        accent: 'ochre',
      },
    ],
  },
  {
    id: 'git',
    title: 'Git',
    blurb: 'Inspect any public repository on GitHub or GitLab.',
    tools: [
      {
        name: 'Git Tools',
        description:
          'History, stats, search, file history, and branch compare for any public repo.',
        path: '/developer-tools/git',
        icon: CodeBracketSquareIcon,
        accent: 'eucalyptus',
      },
    ],
  },
  {
    id: 'utilities',
    title: 'Utilities',
    blurb: 'The rest of the toolbox.',
    tools: [
      {
        name: 'Unix Timestamp',
        description: 'Convert between Unix timestamp and human-readable date.',
        path: '/developer-tools/unix-timestamp',
        icon: ClockIcon,
        accent: 'ochre',
      },
      {
        name: 'JWT Decoder',
        description: 'Decode and inspect JWT tokens.',
        path: '/developer-tools/jwt-decoder',
        icon: CodeBracketSquareIcon,
        accent: 'eucalyptus',
      },
      {
        name: 'Regex Tester',
        description: 'Test regular expressions with matches and replace.',
        path: '/developer-tools/regex-tester',
        icon: MagnifyingGlassIcon,
        accent: 'terracotta',
      },
      {
        name: 'Diff Checker',
        description: 'Compare two texts and see the differences.',
        path: '/developer-tools/diff-checker',
        icon: ArrowsRightLeftIcon,
        accent: 'ochre',
      },
    ],
  },
]

const accentIconBg = (accent: Accent) =>
  ({
    ochre: 'bg-ochre-500/15 text-ochre-500',
    terracotta: 'bg-terracotta-500/15 text-terracotta-500',
    eucalyptus: 'bg-eucalyptus-400/20 text-eucalyptus-500',
  })[accent]

const accentRing = (accent: Accent) =>
  ({
    ochre:
      'group-hover:shadow-[0_0_0_1px_rgba(204,123,60,0.4),0_24px_60px_-26px_rgba(204,123,60,0.4)]',
    terracotta:
      'group-hover:shadow-[0_0_0_1px_rgba(140,58,53,0.4),0_24px_60px_-26px_rgba(140,58,53,0.4)]',
    eucalyptus:
      'group-hover:shadow-[0_0_0_1px_rgba(92,122,104,0.4),0_24px_60px_-26px_rgba(92,122,104,0.4)]',
  })[accent]

const totalTools = computed(() => categories.reduce((acc, c) => acc + c.tools.length, 0))

const openTool = (path: string) => router.push(path)

onMounted(async () => {
  gsap.fromTo(
    '.dt-header',
    { opacity: 0, y: 30, scale: 0.97 },
    { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: premiumEase },
  )
  gsap.fromTo(
    '.dt-category-header',
    { opacity: 0, y: 16 },
    {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.05,
      ease: premiumEase,
      delay: 0.1,
    },
  )
  gsap.fromTo(
    '.dt-tool',
    { opacity: 0, y: 22, scale: 0.97 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.45,
      stagger: 0.04,
      ease: premiumEase,
      delay: 0.15,
    },
  )

  if (isAuthenticated.value) {
    try {
      const res = await api.getConversionAchievements()
      if (res.data?.achievements) {
        conversionAchievements.value = new Set(res.data.achievements.map((a) => a.id))
      }
    } catch {
      /* ignore */
    }
  }
})
</script>

<template>
  <div class="min-h-screen pt-32 pb-24 px-4 md:px-8">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <header class="dt-header mb-14 md:mb-20">
        <p class="font-mono text-xs uppercase tracking-[0.32em] text-ochre-500/90 mb-3">
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-ochre-500 align-middle mr-2" />
          Utilities · {{ totalTools }} tools
        </p>
        <h1
          class="font-display text-balance text-5xl md:text-7xl tracking-tight leading-[0.95] text-charcoal-500 dark:text-cream-100 max-w-4xl"
        >
          The toolkit.
          <span class="italic text-terracotta-500 dark:text-ochre-300">Free, ad-free, always.</span>
        </h1>
        <p class="mt-5 max-w-2xl text-base md:text-lg text-charcoal-300 dark:text-cream-100/70 leading-relaxed">
          A small collection of developer tools, kept honest. Most run entirely
          in your browser. None require an account.
        </p>
      </header>

      <div class="space-y-16 md:space-y-20">
        <section v-for="(category, ci) in categories" :key="category.id" class="dt-category">
          <div class="dt-category-header mb-6 md:mb-8 flex items-end justify-between gap-6">
            <div>
              <p class="font-mono text-[10px] uppercase tracking-[0.32em] text-charcoal-200 dark:text-cream-100/45 mb-2">
                {{ String(ci + 1).padStart(2, '0') }} · {{ category.tools.length }} tools
              </p>
              <h2
                class="font-display text-3xl md:text-4xl tracking-tight text-charcoal-500 dark:text-cream-100"
              >
                {{ category.title }}
              </h2>
              <p class="mt-1 text-sm md:text-base text-charcoal-300 dark:text-cream-100/65">
                {{ category.blurb }}
              </p>
            </div>
          </div>

          <div class="grid gap-4 md:gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <button
              v-for="tool in category.tools"
              :key="tool.path"
              @click="openTool(tool.path)"
              data-cursor="magnetic"
              :class="
                cn(
                  'dt-tool group relative overflow-hidden text-left',
                  'rounded-2xl p-5',
                  'glass glass-edge',
                  'transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]',
                  'hover:scale-[1.015] hover:-translate-y-0.5',
                  accentRing(tool.accent),
                )
              "
            >
              <div class="flex items-start gap-4">
                <span
                  :class="
                    cn(
                      'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-500 group-hover:rotate-[-6deg] group-hover:scale-105',
                      accentIconBg(tool.accent),
                    )
                  "
                >
                  <component :is="tool.icon" class="w-5 h-5" />
                </span>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3
                      class="font-display text-xl tracking-tight text-charcoal-500 dark:text-cream-100 leading-snug"
                    >
                      {{ tool.name }}
                    </h3>
                    <span
                      v-if="
                        tool.path === '/developer-tools/conversion-trainer' && isAuthenticated
                      "
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-ochre-500/15 text-ochre-500 text-[10px] font-mono uppercase tracking-widest"
                      :title="`${conversionAchievementCount}/${Object.keys(CONVERSION_TRAINER_ACHIEVEMENTS).length} achievements`"
                    >
                      <TrophyIconSolid class="w-3 h-3" />
                      {{ conversionAchievementCount }}/{{
                        Object.keys(CONVERSION_TRAINER_ACHIEVEMENTS).length
                      }}
                    </span>
                  </div>
                  <p class="mt-1.5 text-sm text-charcoal-300 dark:text-cream-100/65 leading-relaxed">
                    {{ tool.description }}
                  </p>
                </div>

                <ArrowRightIcon
                  class="w-4 h-4 mt-1 shrink-0 text-charcoal-200 dark:text-cream-100/40 group-hover:text-ochre-500 group-hover:translate-x-0.5 transition-all duration-300"
                />
              </div>

              <!-- Edge glow corner -->
              <div
                aria-hidden="true"
                :class="
                  cn(
                    'pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full blur-2xl opacity-0 group-hover:opacity-[0.18] transition-opacity duration-500',
                    tool.accent === 'ochre' && 'bg-ochre-500',
                    tool.accent === 'terracotta' && 'bg-terracotta-500',
                    tool.accent === 'eucalyptus' && 'bg-eucalyptus-400',
                  )
                "
              />
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
