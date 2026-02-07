<script setup lang="ts">
import { cn } from '@/utils/cn'

interface Props {
  title: string
  description: string
  tags: string[]
  href?: string
  image?: string
  featured?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  featured: false,
})
</script>

<template>
  <a
    v-if="href"
    :href="href"
    :class="cn(
      'group relative block h-full transform-gpu',
      'bg-white/40 backdrop-blur-md border border-gray-200/50',
      'rounded-xl p-6',
      'transition-all duration-300',
      'hover:bg-white/60 hover:scale-[1.02] hover:-translate-y-1',
      'hover:shadow-lg',
      featured && 'md:col-span-2 md:row-span-2',
    )"
    target="_blank"
    rel="noopener noreferrer"
  >
    <div class="h-full flex flex-col">
      <h3 class="text-xl font-semibold mb-2 text-gray-800 group-hover:text-coral transition-colors duration-300">
        {{ title }}
      </h3>
      <p class="text-sm text-gray-600 mb-4 flex-1 leading-relaxed">
        {{ description }}
      </p>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="tag in tags"
          :key="tag"
          :class="cn(
            'px-2.5 py-1 text-xs font-normal rounded-md',
            'bg-mint/20 text-gray-600 border border-mint/30',
            'transition-all duration-300',
            'group-hover:bg-mint/30 group-hover:scale-105',
          )"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </a>
  <div
    v-else
    :class="cn(
      'group relative block h-full transform-gpu',
      'bg-white/40 backdrop-blur-md border border-gray-200/50',
      'rounded-xl p-6',
      'transition-all duration-300',
      'hover:bg-white/60 hover:scale-[1.02] hover:-translate-y-1',
      'hover:shadow-lg',
      featured && 'md:col-span-2 md:row-span-2',
    )"
  >
    <div class="h-full flex flex-col">
      <h3 class="text-xl font-semibold mb-2 text-gray-800 group-hover:text-coral transition-colors duration-300">
        {{ title }}
      </h3>
      <p class="text-sm text-gray-600 mb-4 flex-1 leading-relaxed">
        {{ description }}
      </p>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="tag in tags"
          :key="tag"
          :class="cn(
            'px-2.5 py-1 text-xs font-normal rounded-md',
            'bg-mint/20 text-gray-600 border border-mint/30',
            'transition-all duration-300',
            'group-hover:bg-mint/30 group-hover:scale-105',
          )"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.group {
  transform-origin: center center;
  transform-style: preserve-3d;
}
</style>
