<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  CodeBracketSquareIcon,
  DocumentDuplicateIcon,
  LinkIcon,
  HashtagIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  SwatchIcon,
} from '@heroicons/vue/24/outline'
import { ChevronRightIcon } from '@heroicons/vue/24/solid'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'
const router = useRouter()

const categories = [
  {
    id: 'converters',
    title: 'Converters',
    tools: [
      { name: 'IPv4 ↔ Binary', description: 'Convert between IPv4 addresses and binary notation.', path: '/developer-tools/ipv4-to-binary', icon: ArrowPathIcon, accent: 'peach' },
      { name: 'IPv6 ↔ Hexadecimal', description: 'Convert between IPv6 addresses and hexadecimal.', path: '/developer-tools/ipv6-to-hex', icon: ArrowPathIcon, accent: 'lavender' },
      { name: 'Number ↔ Binary', description: 'Convert between decimal and binary notation.', path: '/developer-tools/number-to-binary', icon: ArrowPathIcon, accent: 'peach' },
      { name: 'Number to Hex & Decimal', description: 'Convert numbers between decimal, hex, octal, and binary.', path: '/developer-tools/number-to-hex', icon: ArrowPathIcon, accent: 'lavender' },
      { name: 'Base64 Encode/Decode', description: 'Encode and decode text or files to Base64.', path: '/developer-tools/base64', icon: DocumentDuplicateIcon, accent: 'mint' },
      { name: 'URL Encode/Decode', description: 'Encode and decode URL parameters.', path: '/developer-tools/url-encode', icon: LinkIcon, accent: 'soft-blue' },
      { name: 'HTML Encode/Decode', description: 'Escape and unescape HTML entities.', path: '/developer-tools/html-encode', icon: CodeBracketSquareIcon, accent: 'soft-blue' },
      { name: 'Color Converter', description: 'Convert colors between hex, RGB, and HSL.', path: '/developer-tools/color-converter', icon: SwatchIcon, accent: 'coral' },
    ],
  },
  {
    id: 'formatters',
    title: 'Formatters',
    tools: [
      { name: 'JSON Formatter', description: 'Pretty print, minify, and validate JSON.', path: '/developer-tools/json-formatter', icon: CodeBracketSquareIcon, accent: 'soft-yellow' },
      { name: 'Case Converter', description: 'Convert between camelCase, snake_case, kebab-case, and more.', path: '/developer-tools/case-converter', icon: ArrowsRightLeftIcon, accent: 'warm-pink' },
    ],
  },
  {
    id: 'generators',
    title: 'Generators',
    tools: [
      { name: 'UUID Generator', description: 'Generate random UUIDs (v4).', path: '/developer-tools/uuid-generator', icon: HashtagIcon, accent: 'warm-pink' },
      { name: 'Hash Generator', description: 'Generate MD5, SHA-1, SHA-256, SHA-384, SHA-512 hashes.', path: '/developer-tools/hash-generator', icon: ArrowPathIcon, accent: 'coral' },
    ],
  },
  {
    id: 'git',
    title: 'Git',
    tools: [
      { name: 'History Visualizer', description: 'View commit history with timeline and links to commits.', path: '/developer-tools/git-history', icon: CodeBracketSquareIcon, accent: 'soft-blue' },
      { name: 'Commit Stats', description: 'Total commits and per-author breakdown.', path: '/developer-tools/git-stats', icon: CodeBracketSquareIcon, accent: 'soft-blue' },
      { name: 'Commit Search', description: 'Search commits by author and date range.', path: '/developer-tools/git-search', icon: CodeBracketSquareIcon, accent: 'soft-blue' },
      { name: 'File History', description: 'View commits that modified a specific file.', path: '/developer-tools/git-file-history', icon: CodeBracketSquareIcon, accent: 'soft-blue' },
      { name: 'Branch Compare', description: 'Compare branches and view commits ahead.', path: '/developer-tools/git-compare', icon: CodeBracketSquareIcon, accent: 'soft-blue' },
    ],
  },
  {
    id: 'utilities',
    title: 'Utilities',
    tools: [
      { name: 'Unix Timestamp', description: 'Convert between Unix timestamp and human-readable date.', path: '/developer-tools/unix-timestamp', icon: ClockIcon, accent: 'peach' },
      { name: 'JWT Decoder', description: 'Decode and inspect JWT tokens.', path: '/developer-tools/jwt-decoder', icon: CodeBracketSquareIcon, accent: 'soft-yellow' },
      { name: 'Regex Tester', description: 'Test regular expressions with matches and replace.', path: '/developer-tools/regex-tester', icon: MagnifyingGlassIcon, accent: 'lavender' },
      { name: 'Diff Checker', description: 'Compare two texts and see the differences.', path: '/developer-tools/diff-checker', icon: ArrowsRightLeftIcon, accent: 'mint' },
    ],
  },
]

const openTool = (path: string) => {
  router.push(path)
}

onMounted(() => {
  gsap.fromTo('.page-header', { opacity: 0, y: 30, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: premiumEase })
  gsap.fromTo('.tool-card', { opacity: 0, y: 30, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, delay: 0.1, ease: premiumEase })
})
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          Developer Tools
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Handy converters and utilities for network developers.
        </p>
      </div>

      <!-- Tools List -->
      <div class="space-y-10">
        <section v-for="category in categories" :key="category.id">
          <h2 class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">{{ category.title }}</h2>
          <div class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <button
              v-for="tool in category.tools"
              :key="tool.path"
              class="tool-card group text-left"
              @click="openTool(tool.path)"
              :class="cn(
                'p-6 rounded-xl backdrop-blur-md border',
                'bg-white/40 dark:bg-gray-800/40 border-gray-200/50 dark:border-gray-700/50',
                'hover:bg-white/60 dark:hover:bg-gray-700/60',
                'transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                tool.accent === 'peach' && 'focus:ring-peach/50 hover:border-peach/30',
                tool.accent === 'lavender' && 'focus:ring-lavender/50 hover:border-lavender/30',
                tool.accent === 'mint' && 'focus:ring-mint/50 hover:border-mint/30',
                tool.accent === 'soft-yellow' && 'focus:ring-soft-yellow/50 hover:border-soft-yellow/30',
                tool.accent === 'soft-blue' && 'focus:ring-soft-blue/50 hover:border-soft-blue/30',
                tool.accent === 'warm-pink' && 'focus:ring-warm-pink/50 hover:border-warm-pink/30',
                tool.accent === 'coral' && 'focus:ring-coral/50 hover:border-coral/30',
              )"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-2">
                    <component
                      :is="tool.icon"
                      :class="cn(
                        'w-5 h-5 shrink-0',
                        tool.accent === 'peach' && 'text-peach',
                        tool.accent === 'lavender' && 'text-lavender',
                        tool.accent === 'mint' && 'text-mint',
                        tool.accent === 'soft-yellow' && 'text-soft-yellow',
                        tool.accent === 'soft-blue' && 'text-soft-blue',
                        tool.accent === 'warm-pink' && 'text-warm-pink',
                        tool.accent === 'coral' && 'text-coral',
                      )"
                    />
                    <h3 class="text-lg font-light text-gray-800 dark:text-white">
                      {{ tool.name }}
                    </h3>
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ tool.description }}
                  </p>
                </div>
                <ChevronRightIcon
                  class="w-5 h-5 shrink-0 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200"
                />
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-card {
  transform-origin: center center;
}
</style>
