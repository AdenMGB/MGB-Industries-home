<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { cn } from '@/utils/cn'
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/vue/24/solid'

const { toasts, remove } = useToast()
</script>

<template>
  <div
    class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="cn(
          'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg',
          'backdrop-blur-md border transition-all duration-300',
          toast.type === 'success' && 'bg-green-50/95 dark:bg-green-900/30 border-green-200/50 dark:border-green-800/50',
          toast.type === 'error' && 'bg-red-50/95 dark:bg-red-900/30 border-red-200/50 dark:border-red-800/50',
          toast.type === 'info' && 'bg-white/95 dark:bg-gray-800/95 border-gray-200/50 dark:border-gray-600/50',
          toast.type === 'loading' && 'bg-white/95 dark:bg-gray-800/95 border-gray-200/50 dark:border-gray-600/50',
        )"
      >
        <CheckCircleIcon
          v-if="toast.type === 'success'"
          class="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0"
        />
        <XCircleIcon
          v-else-if="toast.type === 'error'"
          class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0"
        />
        <InformationCircleIcon
          v-else-if="toast.type === 'info'"
          class="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0"
        />
        <span
          v-else-if="toast.type === 'loading'"
          class="inline-block w-5 h-5 rounded-full border-2 border-gray-600 dark:border-gray-400 border-t-transparent animate-spin flex-shrink-0"
        />
        <p
          :class="cn(
            'text-sm font-medium flex-1',
            toast.type === 'success' && 'text-green-800 dark:text-green-200',
            toast.type === 'error' && 'text-red-800 dark:text-red-200',
            (toast.type === 'info' || toast.type === 'loading') && 'text-gray-800 dark:text-gray-200',
          )"
        >
          {{ toast.message }}
        </p>
        <button
          v-if="toast.type !== 'loading'"
          @click="remove(toast.id)"
          :aria-label="'Dismiss'"
          :class="cn(
            'p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10',
            'transition-all duration-200',
          )"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
.toast-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
