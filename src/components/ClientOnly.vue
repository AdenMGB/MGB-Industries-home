<script setup lang="ts">
import { ref, onMounted } from 'vue'

const mounted = ref(false)

onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <div v-if="mounted">
    <slot />
  </div>
</template>
