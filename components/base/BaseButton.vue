<script setup lang="ts">
type ButtonVariant = 'default' | 'primary' | 'secondary' | 'accent' | 'ghost' | 'link' | 'outline' | 'info' | 'success' | 'warning' | 'error'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const props = withDefaults(defineProps<{
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
  wide?: boolean
  block?: boolean
}>(), {
  variant: 'default',
  size: 'md',
  type: 'button',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const classes = computed(() => [
  'btn',
  props.variant !== 'default' && `btn-${props.variant}`,
  props.size !== 'md' && `btn-${props.size}`,
  props.wide && 'btn-wide',
  props.block && 'btn-block',
  (props.disabled || props.loading) && 'btn-disabled',
].filter(Boolean).join(' '))
</script>

<template>
  <button
    :class="classes"
    :type="type"
    :disabled="disabled || loading"
    @click="emit('click', $event)"
  >
    <span v-if="loading" class="loading loading-spinner loading-sm" />
    <slot />
  </button>
</template>
