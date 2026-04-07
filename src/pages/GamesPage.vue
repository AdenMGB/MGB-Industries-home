<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@/utils/cn'
import {
  MagnifyingGlassIcon,
  ClockIcon,
  StarIcon,
  CubeIcon,
  Squares2X2Icon,
  SparklesIcon,
} from '@heroicons/vue/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/vue/24/solid'
import { useAuth } from '@/composables/useAuth'
import { api } from '@/api/client'
import { useToast } from '@/composables/useToast'
import { ARCADE_GAMES, type ArcadeGame } from '@/config/arcadeGames'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const searchQuery = ref('')
const selectedSection = ref<string | null>(null)
const gameHistory = ref<Array<{ game_id: string; game_name: string; game_href: string; visited_at: string }>>([])
const gameFavorites = ref<Array<{ game_id: string; game_name: string; game_href: string; created_at: string }>>([])
const favoritedGameIds = ref<Set<string>>(new Set())
const { isAuthenticated } = useAuth()
const { success, error: showError } = useToast()

const router = useRouter()
const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

const getGameHref = (id: string) => `in-house:${id}`

const games = computed(() =>
  ARCADE_GAMES.map((g) => ({
    name: g.name,
    href: getGameHref(g.id),
    section: g.section,
    id: g.id,
    color: g.color,
    textColor: g.textColor,
    emoji: g.emoji,
    description: g.description,
    tags: g.tags,
    controls: g.controls,
  })),
)

const sections = computed(() => Array.from(new Set(games.value.map((g) => g.section))))

const gameStats = computed(() => ({
  total: games.value.length,
  sections: sections.value.length,
  favorites: gameFavorites.value.length,
}))

const filteredGames = computed(() => {
  let filtered = games.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.section.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }
  if (selectedSection.value) {
    filtered = filtered.filter((g) => g.section === selectedSection.value)
  }
  return filtered
})

const openGame = (game: { id: string; name: string; href: string }) => {
  router.push({
    name: 'Game',
    params: { id: game.id },
    query: { href: game.href },
  })
}

const openGameFromHistory = (item: { game_id: string; game_href: string }) => {
  router.push({
    name: 'Game',
    params: { id: item.game_id },
    query: { href: item.game_href },
  })
}

const toggleFavorite = async (e: Event, game: { id: string; name: string; href: string }) => {
  e.stopPropagation()
  if (!isAuthenticated.value) return
  const isFav = favoritedGameIds.value.has(game.id)
  try {
    if (isFav) {
      await api.removeGameFavorite(game.id)
      favoritedGameIds.value = new Set([...favoritedGameIds.value].filter((id) => id !== game.id))
      gameFavorites.value = gameFavorites.value.filter((f) => f.game_id !== game.id)
      success('Removed from favorites')
    } else {
      await api.addGameFavorite(game.id, game.name, game.href)
      favoritedGameIds.value = new Set([...favoritedGameIds.value, game.id])
      gameFavorites.value = [
        { game_id: game.id, game_name: game.name, game_href: game.href, created_at: new Date().toISOString() },
        ...gameFavorites.value,
      ]
      success('Added to favorites')
    }
  } catch {
    showError('Failed to update favorites')
  }
}

const openGameFromFavorite = (fav: { game_id: string; game_href: string }) => {
  router.push({
    name: 'Game',
    params: { id: fav.game_id },
    query: { href: fav.game_href },
  })
}

const getArcadeByGameId = (id: string): ArcadeGame | undefined =>
  ARCADE_GAMES.find((g) => g.id === id)

onMounted(async () => {
  if (isAuthenticated.value) {
    try {
      const [historyRes, favoritesRes] = await Promise.all([
        api.getGameHistory(),
        api.getGameFavorites(),
      ])
      if (historyRes.data) {
        gameHistory.value = historyRes.data.history || []
      }
      if (favoritesRes.data) {
        gameFavorites.value = favoritesRes.data.favorites || []
        favoritedGameIds.value = new Set(favoritesRes.data.favorites.map((f) => f.game_id))
      }
    } catch {
      /* silently skip */
    }
  }

  await nextTick()

  gsap.set('.page-header', { opacity: 0, y: 30, scale: 0.96 })
  gsap.set('.stat-card', { opacity: 0, y: 20, scale: 0.98 })
  gsap.set('.search-container', { opacity: 0, x: -30, scale: 0.95 })
  gsap.set('.filter-tag', { opacity: 0, scale: 0.8, x: 20 })
  gsap.set('[data-game-card]', { opacity: 0, y: 40, scale: 0.95 })

  const tl = gsap.timeline({ defaults: { ease: premiumEase } })

  tl.to('.page-header', { opacity: 1, y: 0, scale: 1, duration: 0.6 }, 0)
  tl.to('.stat-card', { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, delay: 0.1 }, 0)
  tl.to('.search-container', { opacity: 1, x: 0, scale: 1, duration: 0.5 }, 0)
  tl.to('.filter-tag', { opacity: 1, scale: 1, x: 0, duration: 0.4, stagger: 0.04 }, 0)

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
      <!-- Header -->
      <div class="page-header mb-12">
        <div class="flex items-center gap-3 mb-4">
          <SparklesIcon class="w-8 h-8 text-peach dark:text-peach" />
          <h1 class="text-5xl md:text-7xl font-light tracking-tight text-gray-800 dark:text-white">
            Games
          </h1>
        </div>
        <p class="text-base text-gray-600 dark:text-gray-400">
          10 original arcade games built in-house — play instantly in your browser.
        </p>
      </div>

      <!-- Stats Cards -->
      <div
        :class="cn(
          'grid grid-cols-1 gap-6 mb-12',
          isAuthenticated ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
        )"
      >
        <div class="stat-card p-6 rounded-xl bg-white/40 dark:bg-peach/10 backdrop-blur-md border border-gray-200/50 dark:border-peach/20">
          <div class="flex items-center gap-4">
            <div class="p-3 rounded-lg bg-peach/20 dark:bg-peach/30">
              <CubeIcon class="w-8 h-8 text-gray-700 dark:text-peach" />
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Total Games</p>
              <p class="text-3xl font-semibold text-gray-800 dark:text-white">{{ gameStats.total }}</p>
            </div>
          </div>
        </div>

        <div class="stat-card p-6 rounded-xl bg-white/40 dark:bg-lavender/10 backdrop-blur-md border border-gray-200/50 dark:border-lavender/20">
          <div class="flex items-center gap-4">
            <div class="p-3 rounded-lg bg-lavender/20 dark:bg-lavender/30">
              <Squares2X2Icon class="w-8 h-8 text-gray-700 dark:text-lavender" />
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Categories</p>
              <p class="text-3xl font-semibold text-gray-800 dark:text-white">{{ gameStats.sections }}</p>
            </div>
          </div>
        </div>

        <div
          v-if="isAuthenticated"
          class="stat-card p-6 rounded-xl bg-white/40 dark:bg-mint/10 backdrop-blur-md border border-gray-200/50 dark:border-mint/20"
        >
          <div class="flex items-center gap-4">
            <div class="p-3 rounded-lg bg-mint/20 dark:bg-mint/30">
              <StarIconSolid class="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Favorites</p>
              <p class="text-3xl font-semibold text-gray-800 dark:text-white">{{ gameStats.favorites }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Search + filters -->
      <div class="mb-16 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div class="search-container md:flex-1 md:min-w-[300px] md:max-w-md">
          <div
            :class="cn(
              'relative w-full',
              'bg-white/40 dark:bg-gray-800/60 backdrop-blur-md rounded-xl',
              'border border-gray-200/50 dark:border-gray-600/50',
              'transition-all duration-300 hover:bg-white/50 dark:hover:bg-gray-700/60',
            )"
          >
            <MagnifyingGlassIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search games..."
              :class="cn(
                'w-full pl-12 pr-4 py-3 bg-transparent',
                'text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500',
                'focus:outline-none rounded-xl',
              )"
            />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            @click="selectedSection = null"
            class="filter-tag"
            :class="cn(
              'px-4 py-1.5 rounded-lg text-sm font-normal transition-all duration-300',
              selectedSection === null
                ? 'bg-peach/30 dark:bg-peach/30 text-gray-800 dark:text-white scale-105'
                : 'bg-white/40 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-600/60 hover:scale-105',
            )"
          >
            All
          </button>
          <button
            v-for="section in sections"
            :key="section"
            @click="selectedSection = selectedSection === section ? null : section"
            class="filter-tag"
            :class="cn(
              'px-4 py-1.5 rounded-lg text-sm font-normal transition-all duration-300',
              selectedSection === section
                ? 'bg-lavender/30 dark:bg-lavender/30 text-gray-800 dark:text-white scale-105'
                : 'bg-white/40 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-600/60 hover:scale-105',
            )"
          >
            {{ section }}
          </button>
        </div>
      </div>

      <!-- Favorites Strip -->
      <div v-if="isAuthenticated && gameFavorites.length > 0" class="mb-10">
        <div class="flex items-center gap-2 mb-3">
          <StarIconSolid class="w-4 h-4 text-amber-500" />
          <h2 class="text-base font-medium text-gray-700 dark:text-gray-300">Favorites</h2>
        </div>
        <div class="flex flex-wrap gap-3">
          <button
            v-for="item in gameFavorites"
            :key="item.game_id"
            @click="openGameFromFavorite(item)"
            :class="cn(
              'group flex items-center gap-2 px-3 py-2 rounded-xl',
              'bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50',
              'hover:bg-white/60 dark:hover:bg-gray-700/60 transition-all duration-200',
              'hover:scale-105 active:scale-95',
            )"
          >
            <span class="text-lg" :aria-hidden="true">
              {{ getArcadeByGameId(item.game_id)?.emoji ?? '🎮' }}
            </span>
            <span class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ item.game_name }}</span>
          </button>
        </div>
      </div>

      <!-- History Strip -->
      <div v-if="isAuthenticated && gameHistory.length > 0" class="mb-10">
        <div class="flex items-center gap-2 mb-3">
          <ClockIcon class="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <h2 class="text-base font-medium text-gray-700 dark:text-gray-300">Recently Played</h2>
        </div>
        <div class="flex flex-wrap gap-3">
          <button
            v-for="item in gameHistory"
            :key="item.game_id"
            @click="openGameFromHistory(item)"
            :class="cn(
              'group flex items-center gap-2 px-3 py-2 rounded-xl',
              'bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50',
              'hover:bg-white/60 dark:hover:bg-gray-700/60 transition-all duration-200',
              'hover:scale-105 active:scale-95',
            )"
          >
            <span class="text-lg">{{ getArcadeByGameId(item.game_id)?.emoji ?? '🎮' }}</span>
            <span class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ item.game_name }}</span>
          </button>
        </div>
      </div>

      <!-- Games Grid -->
      <div
        v-if="filteredGames.length > 0"
        class="games-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
      >
        <div
          v-for="game in filteredGames"
          :key="game.id"
          data-game-card
          @click="openGame(game)"
          :class="cn(
            'group cursor-pointer transform-gpu',
            'bg-white/40 dark:bg-gray-800/80 backdrop-blur-md rounded-xl',
            'border border-gray-200/50 dark:border-gray-700/50',
            'hover:bg-white/60 dark:hover:bg-gray-700/80 transition-all duration-300',
            'hover:scale-105 active:scale-95',
            'hover:shadow-lg hover:-translate-y-0.5',
          )"
        >
          <!-- Thumbnail -->
          <div
            class="aspect-square relative overflow-hidden rounded-t-xl flex items-center justify-center"
            :style="{ backgroundColor: game.color }"
          >
            <!-- Animated shimmer on hover -->
            <div
              class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              :style="{
                background: `radial-gradient(circle at 50% 50%, ${game.color}80 0%, transparent 70%)`,
              }"
            />
            <!-- Big emoji icon -->
            <span
              class="text-4xl md:text-5xl select-none transition-transform duration-300 group-hover:scale-110 relative z-10"
              :aria-hidden="true"
            >
              {{ game.emoji }}
            </span>
            <!-- Favorite button -->
            <button
              v-if="isAuthenticated"
              @click="toggleFavorite($event, game)"
              :aria-label="favoritedGameIds.has(game.id) ? 'Remove from favorites' : 'Add to favorites'"
              :class="cn(
                'absolute top-2 right-2 z-20 p-1.5 rounded-lg',
                'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm',
                'transition-all duration-200 hover:scale-110 active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-peach/50',
              )"
            >
              <StarIconSolid v-if="favoritedGameIds.has(game.id)" class="w-4 h-4 text-amber-500" />
              <StarIcon v-else class="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <!-- Card info -->
          <div class="p-3 md:p-4">
            <h3
              class="text-sm md:text-base font-medium text-gray-800 dark:text-white group-hover:text-coral transition-colors duration-300 line-clamp-1"
            >
              {{ game.name }}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
              {{ game.description }}
            </p>
            <!-- Tags -->
            <div class="flex flex-wrap gap-1 mt-2">
              <span
                v-for="tag in game.tags.slice(0, 2)"
                :key="tag"
                class="px-1.5 py-0.5 text-xs rounded-md bg-mint/20 dark:bg-mint/10 text-gray-600 dark:text-gray-400 border border-mint/20"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else
        :class="cn(
          'text-center py-24 rounded-xl',
          'bg-white/40 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50',
        )"
      >
        <p class="text-gray-600 dark:text-gray-400">No games found</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  transform-origin: center center;
}

.filter-tag {
  transform-origin: center center;
}

[data-game-card] {
  transform-style: preserve-3d;
  perspective: 1000px;
}
</style>
