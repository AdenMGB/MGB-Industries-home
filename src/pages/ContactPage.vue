<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'
import { cn } from '@/utils/cn'
import { EnvelopeIcon, HeartIcon, PaperAirplaneIcon } from '@heroicons/vue/24/solid'
import { api } from '@/api/client'
import { useToast } from '@/composables/useToast'

const premiumEase = 'cubic-bezier(0.4, 0, 0.2, 1)'

const { success, error: showError } = useToast()

const formName = ref('')
const formEmail = ref('')
const formMessage = ref('')
const isSubmitting = ref(false)
const submitError = ref('')

const handleSubmit = async () => {
  submitError.value = ''

  if (!formName.value.trim()) {
    submitError.value = 'Please enter your name'
    return
  }
  if (!formEmail.value.trim()) {
    submitError.value = 'Please enter your email'
    return
  }
  if (!formMessage.value.trim()) {
    submitError.value = 'Please enter a message'
    return
  }

  isSubmitting.value = true
  try {
    const response = await api.sendContactMessage({
      name: formName.value.trim(),
      email: formEmail.value.trim(),
      message: formMessage.value.trim(),
    })
    if (response.error) {
      submitError.value = response.error
      showError(response.error)
    } else {
      success('Message sent! I\'ll get back to you soon.')
      formName.value = ''
      formEmail.value = ''
      formMessage.value = ''
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send message'
    submitError.value = msg
    showError(msg)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  // Header with fade + scale + translateY
  gsap.fromTo('.page-header',
    {
      opacity: 0,
      y: 30,
      scale: 0.96,
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.6,
      ease: premiumEase,
    }
  )

  // Contact cards with stagger and scale
  gsap.fromTo('.contact-card',
    {
      opacity: 0,
      y: 30,
      scale: 0.95,
      rotationY: -5,
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      rotationY: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: premiumEase,
    }
  )
})
</script>

<template>
  <div class="min-h-screen py-24 px-4 md:px-8 flex items-center">
    <div class="max-w-4xl mx-auto w-full">
      <!-- Header (Admin-style typography) -->
      <div class="page-header mb-12">
        <h1 class="text-5xl md:text-7xl font-light mb-4 tracking-tight text-gray-800 dark:text-white">
          Get in Touch
        </h1>
        <p class="text-base text-gray-600 dark:text-gray-400">
          Have a project in mind? Want to collaborate? Or just want to say hi?
        </p>
      </div>

      <!-- Contact Info -->
      <div class="space-y-6">
        <!-- Contact Form -->
        <div class="contact-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
          <h2 class="text-xl font-light mb-6 text-gray-800 dark:text-gray-200">
            Send a Message
          </h2>
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div v-if="submitError" class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {{ submitError }}
            </div>
            <div>
              <label for="contact-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input
                id="contact-name"
                v-model="formName"
                type="text"
                :disabled="isSubmitting"
                :class="cn(
                  'w-full px-4 py-3 rounded-lg border',
                  'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-peach/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-all duration-300',
                )"
                placeholder="Your name"
              />
            </div>
            <div>
              <label for="contact-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                id="contact-email"
                v-model="formEmail"
                type="email"
                :disabled="isSubmitting"
                :class="cn(
                  'w-full px-4 py-3 rounded-lg border',
                  'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-peach/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-all duration-300',
                )"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label for="contact-message" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
              <textarea
                id="contact-message"
                v-model="formMessage"
                rows="4"
                :disabled="isSubmitting"
                :class="cn(
                  'w-full px-4 py-3 rounded-lg border resize-none',
                  'bg-white/60 dark:bg-gray-700/60 border-gray-200/50 dark:border-gray-600/50',
                  'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-peach/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-all duration-300',
                )"
                placeholder="What's on your mind?"
              />
            </div>
            <button
              type="submit"
              :disabled="isSubmitting"
              :class="cn(
                'flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg',
                'bg-peach/30 hover:bg-peach/40 dark:bg-peach/20 dark:hover:bg-peach/30',
                'text-gray-800 dark:text-gray-200 font-medium',
                'transition-all duration-300 transform-gpu hover:scale-105 active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-peach/50',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
              )"
            >
              <PaperAirplaneIcon v-if="!isSubmitting" class="w-5 h-5" />
              <span v-else class="inline-block animate-spin rounded-full h-5 w-5 border-2 border-gray-800 dark:border-gray-200 border-t-transparent" />
              {{ isSubmitting ? 'Sending...' : 'Send Message' }}
            </button>
          </form>
        </div>

        <div
          class="contact-card p-8 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50"
        >
          <h2 class="text-xl font-light mb-6 text-gray-800 dark:text-gray-200">
            Or reach out directly
          </h2>
          <div class="space-y-3">
            <a
              href="mailto:aden@adenmgb.com"
              :class="cn(
                'flex items-center gap-3 p-4 rounded-lg',
                'bg-white/40 hover:bg-white/60 dark:bg-gray-700/40 dark:hover:bg-gray-700/60',
                'transition-all duration-300 hover:scale-105',
                'text-gray-700 dark:text-gray-300',
                'border border-gray-200/50 dark:border-gray-600/50',
              )"
            >
              <EnvelopeIcon class="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span>aden@adenmgb.com</span>
            </a>
            <a
              href="https://github.com/AdenMGB"
              target="_blank"
              rel="noopener noreferrer"
              :class="cn(
                'flex items-center gap-3 p-4 rounded-lg',
                'bg-white/40 hover:bg-white/60 dark:bg-gray-700/40 dark:hover:bg-gray-700/60',
                'transition-all duration-300 hover:scale-105',
                'text-gray-700 dark:text-gray-300',
                'border border-gray-200/50 dark:border-gray-600/50',
              )"
            >
              <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
              </svg>
              <span>github.com/AdenMGB</span>
            </a>
          </div>
        </div>

        <div
          class="contact-card p-6 rounded-xl bg-mint/20 dark:bg-mint/10 backdrop-blur-sm border border-mint/30 dark:border-mint/20"
        >
          <h3 class="text-sm font-medium mb-3 text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <HeartIcon class="w-4 h-4 text-gray-500 dark:text-gray-400" />
            Availability
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Currently available for freelance projects and open-source collaborations. 
            Always interested in discussing new opportunities.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contact-card {
  transform-style: preserve-3d;
  transform-origin: center center;
}
</style>
