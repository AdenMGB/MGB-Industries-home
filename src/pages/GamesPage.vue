<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@/utils/cn'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

interface Game {
  name: string
  href: string
  section: string
  img: string
  type?: string
}

const searchQuery = ref('')
const selectedSection = ref<string | null>(null)

// Extract games list from Gams.html structure
const gamesData = [
  { title: 'Basic', type: 'section' },
  { name: 'Stickman Hook' },
  { name: 'Drive Mad', href: 'Gams-main/g/g/drivemad/drivemad.html' },
  { name: '2048' },
  { name: 'Cookie Clicker', href: 'Gams-main/g/g/cookie/index.html' },
  { name: 'Cube Field', href: 'Gams-main/g/g/cubefield/index.html' },
  { name: 'Spacebar Clicker' },
  { name: 'Offline Paradise' },
  { name: 'Sand Game' },
  { name: 'Agario Lite' },
  { name: 'Evil Glitch' },
  { name: 'Its Raining Boxes' },
  { name: 'T Rex' },
  { name: 'Stack' },
  { name: 'Rolling Forests' },
  { name: 'Radius Raid' },
  { name: 'Mountain Maze' },
  { name: 'Fluid Simulator' },
  { name: 'Edge Not Found' },
  { name: 'Ninja vs EVILCORP' },
  { name: 'Geometry Dash' },
  { name: 'Wordle' },
  { name: 'Paper IO 2' },

  { title: 'Unity', type: 'section' },
  { name: 'Slope' },
  { name: 'Burrito Bison', href: 'Gams-main/g/g/burritobison/burritobison.html' },
  { name: 'Tube Jumpers' },
  { name: 'Hole IO' },
  { name: 'Madalin Stunt Cars', href: 'Gams-main/g/g/madalinstuntcars/madalinstuntcars.html' },
  { name: 'Glass City', href: 'Gams-main/g/g/glasscity/glasscity.html' },
  { name: 'Tunnel Rush', href: 'Gams-main/g/g/tunnelrush/tunnelrush.html' },
  { name: 'Tanuki Sunset', href: 'Gams-main/g/g/tanukisunset/tanukisunset.html' },
  { name: 'A Dance of Fire and Ice', href: 'Gams-main/g/g/fireice/index.html' },
  { name: 'Game Inside a Game', href: 'Gams-main/g/g/gameinsideagame/index.html' },
  { name: 'Cell Machine', href: 'Gams-main/g/g/cellmachine/index.html' },
  { name: 'Slope 2', href: 'Gams-main/g/g/slope2/index.html' },
  { name: 'Ai Creatures', href: 'Gams-main/g/g/aicreatures/index.html' },
  { name: 'Grey Box Testing', href: 'Gams-main/g/g/greybox/index.html' },

  { title: 'Retrogaming', type: 'section' },
  { name: 'Super Mario 64' },
  { name: 'Celeste' },
  { name: 'Just One Boss' },
  { name: 'Super Mario RPG' },

  { title: 'Henry Stickmin Flash', type: 'section' },
  { name: 'Breaking The Bank' },
  { name: 'Escaping The Prison' },
  { name: 'Stealing The Diamond' },
  { name: 'Infiltrating The Airship' },
  { name: 'Fleeing The Complex' },

  { title: 'Flash', type: 'section' },
  { name: 'Bloxorz' },
  { name: 'Tetris' },
  { name: 'Flood Runner 4' },
  { name: 'Raft Wars' },
  { name: 'Raft Wars 2' },
  { name: 'Worlds Hardest Game' },
  { name: 'The Impossible Quiz' },
  { name: 'Learn To Fly Idle' },
  { name: 'Learn To Fly 1' },
  { name: 'Learn To Fly 2' },
  { name: 'Learn To Fly 3' },
  { name: 'Bloons Tower Defense 1' },
  { name: 'Bloons Tower Defense 2' },
  { name: 'Bloons Tower Defense 5' },
  { name: 'Cat Ninja' },
  { name: 'Pacman' },
  { name: '1 on 1 Soccer' },
  { name: 'QWOP' },
  { name: 'Use Boxmen' },
  { name: '40x Escape' },
  { name: 'Stickman Life' },
  { name: 'Duck Life 1' },
  { name: 'Duck Life 2' },
  { name: 'Duck Life 3' },
  { name: 'Duck Life 4' },
  { name: 'Duck Life 5' },

  { title: 'Tools', type: 'section' },
  { name: 'Ruffle Flash Player', href: 'Gams-main/g/g/Ruffle/Ruffle.html' },
  { name: 'Code Editor', type: 'raw' },
  { name: 'Web Retro' },
]

// Process games data into structured format
const games = computed<Game[]>(() => {
  const result: Game[] = []
  let currentSection = ''

  gamesData.forEach((item) => {
    if (item.type === 'section' && item.title) {
      currentSection = item.title
    } else if (item.name) {
      const imgName = item.name.toLowerCase().replace(/\s/g, '')
      const href = item.href || `Gams-main/g/${imgName}.html`
      const img = `Gams-main/img/${imgName}.png`

      result.push({
        name: item.name,
        href,
        section: currentSection,
        img,
        type: item.type,
      })
    }
  })

  return result
})

const sections = computed(() => {
  return Array.from(new Set(games.value.map((g) => g.section)))
})

const filteredGames = computed(() => {
  let filtered = games.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        g.section.toLowerCase().includes(query),
    )
  }

  if (selectedSection.value) {
    filtered = filtered.filter((g) => g.section === selectedSection.value)
  }

  return filtered
})

const router = useRouter()

const openGame = (game: Game) => {
  const gameId = game.name.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9-]/g, '')
  router.push({
    name: 'Game',
    params: { id: gameId },
    query: { href: game.href },
  })
}

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

onMounted(async () => {
  await nextTick()

  // Set initial states to prevent flash
  gsap.set('.page-header', { opacity: 0, y: 30, scale: 0.96 })
  gsap.set('.search-container', { opacity: 0, x: -30, scale: 0.95 })
  gsap.set('.filter-tag', { opacity: 0, scale: 0.8, x: 20 })
  gsap.set('[data-game-card]', { opacity: 0, y: 40, scale: 0.95 })

  // Create a timeline - all top elements animate together
  const tl = gsap.timeline({ defaults: { ease: premiumEase } })

  // All three animate simultaneously at the same time
  tl.to(
    '.page-header',
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.6,
    },
    0,
  )

  tl.to(
    '.search-container',
    {
      opacity: 1,
      x: 0,
      scale: 1,
      duration: 0.5,
    },
    0,
  )

  tl.to(
    '.filter-tag',
    {
      opacity: 1,
      scale: 1,
      x: 0,
      duration: 0.4,
      stagger: 0.04,
    },
    0,
  )

  // Simple card animation on scroll
  await nextTick()
  ScrollTrigger.refresh()

  gsap.to('[data-game-card]', {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.6,
    stagger: 0.05,
    ease: premiumEase,
    scrollTrigger: {
      trigger: '.games-grid',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  })
})
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Asymmetric header layout -->
      <div class="page-header mb-20 grid md:grid-cols-12 gap-8 items-end">
        <div class="md:col-span-8">
          <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800">
            Games
          </h1>
        </div>
        <div class="md:col-span-4">
          <p class="text-base text-gray-600">
            A collection of classic and modern browser games. Click any game to play!
          </p>
        </div>
      </div>

      <!-- Search and filters side by side -->
      <div class="mb-16 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <!-- Search bar -->
        <div class="search-container md:flex-1 md:min-w-[300px] md:max-w-md">
          <div
            :class="
              cn(
                'relative w-full',
                'bg-white/40 backdrop-blur-md rounded-xl',
                'border border-gray-200/50',
                'transition-all duration-300 hover:bg-white/50',
              )
            "
          >
            <MagnifyingGlassIcon
              class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search games..."
              :class="
                cn(
                  'w-full pl-12 pr-4 py-3 bg-transparent',
                  'text-gray-700 placeholder-gray-400',
                  'focus:outline-none rounded-xl',
                )
              "
            />
          </div>
        </div>

        <!-- Filter Tags next to search -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            @click="selectedSection = null"
            class="filter-tag"
            :class="
              cn(
                'px-4 py-1.5 rounded-lg text-sm font-normal transition-all duration-300',
                selectedSection === null
                  ? 'bg-peach/30 text-gray-800 scale-105'
                  : 'bg-white/40 text-gray-600 hover:bg-white/60 hover:scale-105',
              )
            "
          >
            All
          </button>
          <button
            v-for="section in sections"
            :key="section"
            @click="selectedSection = selectedSection === section ? null : section"
            class="filter-tag"
            :class="
              cn(
                'px-4 py-1.5 rounded-lg text-sm font-normal transition-all duration-300',
                selectedSection === section
                  ? 'bg-lavender/30 text-gray-800 scale-105'
                  : 'bg-white/40 text-gray-600 hover:bg-white/60 hover:scale-105',
              )
            "
          >
            {{ section }}
          </button>
        </div>
      </div>

      <!-- Games grid -->
      <div
        v-if="filteredGames.length > 0"
        class="games-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
      >
        <div
          v-for="(game, index) in filteredGames"
          :key="index"
          data-game-card
          @click="openGame(game)"
          :class="
            cn(
              'group cursor-pointer transform-gpu',
              'bg-white/40 backdrop-blur-md rounded-xl',
              'border border-gray-200/50',
              'hover:bg-white/60 transition-all duration-300',
              'hover:scale-105 active:scale-95',
            )
          "
        >
          <div class="aspect-square relative overflow-hidden rounded-t-xl">
            <img
              :src="`/${game.img}`"
              :alt="game.name"
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              @error="
                ($event.target as HTMLImageElement).src = '/Gams-main/img/gams-g.png'
              "
            />
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
          </div>
          <div class="p-3 md:p-4">
            <h3
              class="text-sm md:text-base font-medium text-gray-800 group-hover:text-coral transition-colors duration-300 line-clamp-2"
            >
              {{ game.name }}
            </h3>
            <p
              class="text-xs text-gray-500 mt-1 line-clamp-1"
            >
              {{ game.section }}
            </p>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else
        :class="
          cn(
            'text-center py-24 rounded-xl',
            'bg-white/40 backdrop-blur-sm border border-gray-200/50',
          )
        "
      >
        <p class="text-gray-600">
          No games found
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-tag {
  transform-origin: center center;
}

[data-game-card] {
  transform-style: preserve-3d;
  perspective: 1000px;
}
</style>
