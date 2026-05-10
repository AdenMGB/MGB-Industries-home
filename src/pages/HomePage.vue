<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@/utils/cn'
import Hero3D from '@/components/Hero3D.vue'
import {
  CommandLineIcon,
  ArrowPathIcon,
  CodeBracketSquareIcon,
  HashtagIcon,
  ClockIcon,
  AcademicCapIcon,
  SparklesIcon,
  ArrowRightIcon,
  BoltIcon,
} from '@heroicons/vue/24/outline'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const router = useRouter()
const heroProgress = ref(0)
const taglineRef = ref<HTMLElement | null>(null)
const subRef = ref<HTMLElement | null>(null)
const microRef = ref<HTMLElement | null>(null)
const heroSection = ref<HTMLElement | null>(null)
let heroTrigger: ScrollTrigger | null = null

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

interface BentoTile {
  title: string
  caption: string
  href: string
  icon: typeof CommandLineIcon
  span: string
  accent: 'ochre' | 'terracotta' | 'eucalyptus' | 'mixed'
  body?: string
  tag?: string
}

const tiles: BentoTile[] = [
  {
    title: 'All Utilities',
    caption: 'The full kit',
    href: '/developer-tools',
    icon: CommandLineIcon,
    span: 'md:col-span-2 md:row-span-2',
    accent: 'mixed',
    body: 'Twenty-something handcrafted developer tools — converters, formatters, generators, git inspectors. No tracking, no ads, no fluff.',
    tag: '20+ tools',
  },
  {
    title: 'Conversion Trainer',
    caption: 'Practice that actually sticks',
    href: '/developer-tools/conversion-trainer',
    icon: AcademicCapIcon,
    span: 'md:col-span-2',
    accent: 'ochre',
    body: 'Drill binary, hex and IP-address conversion. Solo, with a friend, or in a 10,000-player tournament.',
    tag: 'Solo · 1v1 · Tournament',
  },
  {
    title: 'JSON Formatter',
    caption: 'Pretty. Minified. Validated.',
    href: '/developer-tools/json-formatter',
    icon: CodeBracketSquareIcon,
    span: '',
    accent: 'eucalyptus',
  },
  {
    title: 'Hash Generator',
    caption: 'MD5 → SHA-512',
    href: '/developer-tools/hash-generator',
    icon: HashtagIcon,
    span: '',
    accent: 'terracotta',
  },
  {
    title: 'Git Tools',
    caption: 'Inspect any public repo',
    href: '/developer-tools/git',
    icon: CodeBracketSquareIcon,
    span: 'md:col-span-2',
    accent: 'mixed',
    body: 'Walk history, search by commit, diff branches, follow a single file across renames.',
  },
  {
    title: 'Base64',
    caption: 'Encode / decode',
    href: '/developer-tools/base64',
    icon: ArrowPathIcon,
    span: '',
    accent: 'ochre',
  },
  {
    title: 'Unix Timestamp',
    caption: 'Time, made readable',
    href: '/developer-tools/unix-timestamp',
    icon: ClockIcon,
    span: '',
    accent: 'eucalyptus',
  },
]

const accentRing = (accent: BentoTile['accent']) =>
  ({
    ochre: 'group-hover:shadow-[0_0_0_1px_rgba(204,123,60,0.45),0_30px_80px_-30px_rgba(204,123,60,0.45)]',
    terracotta:
      'group-hover:shadow-[0_0_0_1px_rgba(140,58,53,0.45),0_30px_80px_-30px_rgba(140,58,53,0.45)]',
    eucalyptus:
      'group-hover:shadow-[0_0_0_1px_rgba(92,122,104,0.45),0_30px_80px_-30px_rgba(92,122,104,0.45)]',
    mixed:
      'group-hover:shadow-[0_0_0_1px_rgba(204,123,60,0.45),0_30px_80px_-30px_rgba(140,58,53,0.45)]',
  }[accent])

const accentIconBg = (accent: BentoTile['accent']) =>
  ({
    ochre: 'bg-ochre-500/15 text-ochre-500',
    terracotta: 'bg-terracotta-500/15 text-terracotta-500',
    eucalyptus: 'bg-eucalyptus-400/20 text-eucalyptus-500',
    mixed: 'bg-gradient-to-br from-ochre-500/20 to-terracotta-500/20 text-ochre-500',
  }[accent])

const facts = [
  { icon: BoltIcon, label: 'No accounts required to use any tool' },
  { icon: SparklesIcon, label: 'Lives entirely in your browser, fast and private' },
  { icon: CommandLineIcon, label: 'Open source — see how every tool works' },
]

onMounted(async () => {
  await nextTick()

  const tl = gsap.timeline({ defaults: { ease: premiumEase } })
  if (taglineRef.value) {
    tl.fromTo(
      taglineRef.value,
      { opacity: 0, y: 50, filter: 'blur(12px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.0 },
      0,
    )
  }
  if (subRef.value) {
    tl.fromTo(
      subRef.value,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.7 },
      0.15,
    )
  }
  if (microRef.value) {
    tl.fromTo(
      microRef.value,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6 },
      0.3,
    )
  }
  tl.fromTo(
    '.hero-cta',
    { opacity: 0, y: 18, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08 },
    0.45,
  )

  if (heroSection.value) {
    heroTrigger = ScrollTrigger.create({
      trigger: heroSection.value,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.6,
      onUpdate: (self) => {
        heroProgress.value = self.progress
      },
    })
  }

  gsap.utils.toArray<HTMLElement>('.bento-tile').forEach((el, i) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 40, scale: 0.96 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        delay: i * 0.04,
        ease: premiumEase,
        scrollTrigger: { trigger: el, start: 'top 88%' },
      },
    )
  })

  gsap.fromTo(
    '.fact-row',
    { opacity: 0, y: 20 },
    {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: premiumEase,
      scrollTrigger: { trigger: '.fact-row', start: 'top 90%' },
    },
  )
})

onBeforeUnmount(() => {
  heroTrigger?.kill()
})
</script>

<template>
  <div class="relative">
    <!-- Hero -->
    <section
      ref="heroSection"
      class="relative min-h-[100vh] flex items-center overflow-hidden px-4 md:px-8 pt-32 pb-20"
    >
      <Hero3D :progress="heroProgress" />

      <div class="relative z-10 max-w-7xl mx-auto w-full">
        <div class="grid md:grid-cols-12 gap-10 items-center">
          <div class="md:col-span-7 space-y-6">
            <p
              ref="microRef"
              class="font-mono text-xs uppercase tracking-[0.32em] text-ochre-500/90"
            >
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-ochre-500 align-middle mr-2" />
              Aden Hitchins · Open source developer
            </p>
            <h1
              ref="taglineRef"
              class="font-display text-balance text-5xl md:text-7xl lg:text-[6.5rem] leading-[0.95] tracking-tight text-charcoal-500 dark:text-cream-100"
            >
              <span class="block italic font-normal text-terracotta-500 dark:text-ochre-300">Carefully</span>
              crafted utilities,<br />
              <span class="text-charcoal-200 dark:text-cream-100/60">in a quiet shop.</span>
            </h1>
            <p
              ref="subRef"
              class="text-base md:text-lg max-w-xl text-charcoal-300 dark:text-cream-100/70 leading-relaxed"
            >
              A small, opinionated collection of developer tools — built one at a time,
              kept fast, kept honest. No newsletters, no upsells, no surveillance.
            </p>

            <div class="flex flex-wrap items-center gap-3 pt-2">
              <button
                @click="router.push('/developer-tools')"
                data-cursor="magnetic"
                class="hero-cta group inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-cream-100 bg-gradient-to-br from-ochre-500 to-terracotta-500 shadow-edge-ochre transition-all duration-300 hover:shadow-glow hover:scale-[1.04] active:scale-[0.97]"
              >
                Open the toolkit
                <ArrowRightIcon class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <a
                href="https://github.com/AdenMGB"
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="magnetic"
                class="hero-cta inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-charcoal-500 dark:text-cream-100 ring-1 ring-charcoal-500/15 dark:ring-cream-100/15 hover:ring-ochre-500/40 hover:bg-ochre-500/5 transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]"
              >
                GitHub
              </a>
            </div>
          </div>

          <div class="md:col-span-5 flex items-center justify-center">
            <!-- The 3D orb is absolutely positioned via Hero3D -->
            <div class="relative h-[400px] w-full md:h-[520px]" />
          </div>
        </div>
      </div>

      <div
        class="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-charcoal-200 dark:text-cream-100/50 text-[10px] uppercase tracking-[0.32em]"
      >
        <span>Scroll</span>
        <span class="block h-8 w-px bg-gradient-to-b from-charcoal-200/60 to-transparent dark:from-cream-100/40" />
      </div>
    </section>

    <!-- Bento Grid: Utilities -->
    <section class="relative px-4 md:px-8 py-24 md:py-32">
      <div class="max-w-7xl mx-auto">
        <div class="mb-12 md:mb-16 max-w-3xl">
          <p class="font-mono text-xs uppercase tracking-[0.32em] text-ochre-500/90 mb-3">
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-ochre-500 align-middle mr-2" />
            The Toolkit
          </p>
          <h2
            class="font-display text-balance text-4xl md:text-6xl tracking-tight text-charcoal-500 dark:text-cream-100"
          >
            Small things,<br />
            <span class="italic text-terracotta-500 dark:text-ochre-300">made well.</span>
          </h2>
          <p class="mt-5 text-base md:text-lg text-charcoal-300 dark:text-cream-100/70 leading-relaxed">
            Each tool was built because I needed it once and the existing options
            were either ugly, ad-laden, or both. They&rsquo;re all free.
          </p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 auto-rows-[170px] md:auto-rows-[200px] gap-4 md:gap-5">
          <button
            v-for="tile in tiles"
            :key="tile.href"
            data-cursor="magnetic"
            @click="router.push(tile.href)"
            :class="
              cn(
                'bento-tile group relative overflow-hidden text-left',
                'rounded-2xl p-5 md:p-6',
                'glass glass-edge',
                'transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]',
                'hover:scale-[1.015] hover:-translate-y-0.5',
                accentRing(tile.accent),
                tile.span,
              )
            "
          >
            <div class="relative z-10 flex h-full flex-col justify-between">
              <div class="flex items-start justify-between gap-3">
                <div
                  :class="cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-500 group-hover:rotate-[-6deg] group-hover:scale-105',
                    accentIconBg(tile.accent),
                  )"
                >
                  <component :is="tile.icon" class="w-5 h-5" />
                </div>
                <span
                  v-if="tile.tag"
                  class="font-mono text-[10px] uppercase tracking-[0.24em] text-charcoal-200 dark:text-cream-100/50"
                >
                  {{ tile.tag }}
                </span>
              </div>

              <div>
                <h3
                  class="font-display text-2xl md:text-3xl tracking-tight text-charcoal-500 dark:text-cream-100 leading-tight"
                >
                  {{ tile.title }}
                </h3>
                <p class="mt-1 text-sm text-charcoal-300 dark:text-cream-100/70">
                  {{ tile.caption }}
                </p>
                <p
                  v-if="tile.body"
                  class="mt-3 text-sm text-charcoal-300 dark:text-cream-100/65 leading-relaxed max-w-md"
                >
                  {{ tile.body }}
                </p>
              </div>

              <div class="flex items-center justify-end">
                <span
                  class="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-[0.24em] text-charcoal-300 dark:text-cream-100/65 group-hover:text-ochre-500 transition-colors duration-300"
                >
                  Open
                  <ArrowRightIcon class="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>

            <!-- subtle decorative grain corner -->
            <div
              aria-hidden="true"
              class="absolute -bottom-12 -right-12 h-40 w-40 rounded-full opacity-[0.08] group-hover:opacity-[0.18] transition-opacity duration-500 blur-2xl"
              :class="
                tile.accent === 'ochre'
                  ? 'bg-ochre-500'
                  : tile.accent === 'terracotta'
                    ? 'bg-terracotta-500'
                    : tile.accent === 'eucalyptus'
                      ? 'bg-eucalyptus-400'
                      : 'bg-gradient-to-br from-ochre-500 to-terracotta-500'
              "
            />
          </button>
        </div>
      </div>
    </section>

    <!-- Quiet credo -->
    <section class="relative px-4 md:px-8 py-24 md:py-32">
      <div class="max-w-5xl mx-auto">
        <div
          class="rounded-3xl glass glass-edge p-8 md:p-14 grid md:grid-cols-12 gap-10 items-center"
        >
          <div class="md:col-span-7 space-y-5">
            <p class="font-mono text-xs uppercase tracking-[0.32em] text-ochre-500/90">
              The handshake
            </p>
            <h2 class="font-display text-3xl md:text-5xl tracking-tight text-charcoal-500 dark:text-cream-100 leading-tight text-balance">
              Sign in to <span class="italic text-terracotta-500 dark:text-ochre-300">save your work</span>
              &mdash; or just keep using the tools, freely.
            </h2>
            <p class="text-base text-charcoal-300 dark:text-cream-100/70 leading-relaxed max-w-xl">
              An account unlocks cross-device sync for the conversion trainer
              (XP, achievements, streaks) and lets you host private multiplayer
              rooms. Everything else stays anonymous.
            </p>
            <div class="flex flex-wrap items-center gap-3 pt-1">
              <button
                @click="router.push('/signup')"
                data-cursor="magnetic"
                class="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-cream-100 bg-gradient-to-br from-ochre-500 to-terracotta-500 shadow-edge-ochre transition-all duration-300 hover:shadow-glow hover:scale-[1.04] active:scale-[0.97]"
              >
                Create an account
                <ArrowRightIcon class="w-4 h-4" />
              </button>
              <button
                @click="router.push('/login')"
                data-cursor="magnetic"
                class="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-charcoal-500 dark:text-cream-100 ring-1 ring-charcoal-500/15 dark:ring-cream-100/15 hover:ring-ochre-500/40 hover:bg-ochre-500/5 transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]"
              >
                I already have one
              </button>
            </div>
          </div>
          <div class="md:col-span-5 space-y-3">
            <div
              v-for="(fact, i) in facts"
              :key="i"
              class="fact-row flex items-start gap-3 rounded-2xl px-4 py-3 ring-1 ring-charcoal-500/8 dark:ring-cream-100/10 bg-cream-100/40 dark:bg-charcoal-400/30"
            >
              <span
                class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ochre-500/15 text-ochre-500"
              >
                <component :is="fact.icon" class="w-4 h-4" />
              </span>
              <p class="text-sm text-charcoal-400 dark:text-cream-100/80 leading-relaxed">
                {{ fact.label }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer line -->
    <footer class="relative px-4 md:px-8 pb-12 pt-8">
      <div
        class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-charcoal-200 dark:text-cream-100/50"
      >
        <div class="flex items-center gap-2 font-mono uppercase tracking-[0.24em]">
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-ochre-500" />
          AdenMGB &mdash; Adelaide, AU
        </div>
        <div class="flex items-center gap-5">
          <a
            href="https://github.com/AdenMGB"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:text-ochre-500 transition-colors"
            data-cursor="magnetic"
          >
            GitHub
          </a>
          <router-link
            to="/developer-tools"
            class="hover:text-ochre-500 transition-colors"
            data-cursor="magnetic"
          >
            Utilities
          </router-link>
          <router-link
            to="/account"
            class="hover:text-ochre-500 transition-colors"
            data-cursor="magnetic"
          >
            Account
          </router-link>
        </div>
      </div>
    </footer>
  </div>
</template>
