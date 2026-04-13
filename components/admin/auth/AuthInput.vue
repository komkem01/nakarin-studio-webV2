<script setup lang="ts">
defineProps<{
  label: string
  name: string
  type?: string
  modelValue: string
  placeholder?: string
  error?: string
  required?: boolean
  autocomplete?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="name" class="text-xs font-semibold uppercase tracking-widest text-neutral-600">
      {{ label }}
      <span v-if="required" class="text-[#166534] ml-0.5">*</span>
    </label>
    <input
      :id="name"
      :name="name"
      :type="type ?? 'text'"
      :value="modelValue"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :disabled="disabled"
      :aria-describedby="error ? `${name}-error` : undefined"
      class="w-full px-3.5 py-3 rounded border text-sm bg-white text-neutral-900 placeholder:text-neutral-400 outline-none transition
        focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534]
        disabled:opacity-50 disabled:cursor-not-allowed"
      :class="error ? 'border-red-400' : 'border-neutral-400'"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" :id="`${name}-error`" class="text-xs text-red-500" role="alert">
      {{ error }}
    </p>
  </div>
</template>
