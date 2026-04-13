<script setup lang="ts">
export interface AccordionItem {
  title: string
  content: string
}

const props = withDefaults(defineProps<{
  items: AccordionItem[]
  name?: string
  defaultOpen?: number
}>(), {
  name: 'base-accordion',
  defaultOpen: 0,
})
</script>

<template>
  <div class="w-full">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="collapse collapse-arrow bg-base-100 border border-base-300 mb-1"
    >
      <input
        type="radio"
        :name="name"
        :checked="index === defaultOpen"
      />
      <div class="collapse-title font-semibold">
        {{ item.title }}
      </div>
      <div class="collapse-content text-sm">
        {{ item.content }}
      </div>
    </div>
  </div>
</template>
