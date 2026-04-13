<script setup lang="ts">
type LoadingType = 'spinner' | 'dots' | 'ring' | 'ball' | 'bars' | 'infinity'
type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

withDefaults(defineProps<{
  type?: LoadingType
  size?: LoadingSize
}>(), {
  type: 'ring',
  size: 'md',
})
</script>

<template>
  <span :class="`loading loading-${type} loading-${size}`" />
</template>
