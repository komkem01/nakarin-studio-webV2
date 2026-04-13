<script setup lang="ts">
const props = withDefaults(defineProps<{
  currentPage: number
  totalPages: number
  siblingCount?: number
}>(), {
  siblingCount: 1,
})

const emit = defineEmits<{
  'update:currentPage': [page: number]
  change: [page: number]
}>()

const pages = computed(() => {
  const total = props.totalPages
  const current = props.currentPage
  const sibling = props.siblingCount

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const leftSibling = Math.max(current - sibling, 1)
  const rightSibling = Math.min(current + sibling, total)

  const showLeftDots = leftSibling > 2
  const showRightDots = rightSibling < total - 1

  if (!showLeftDots && showRightDots) {
    const leftRange = Array.from({ length: 3 + 2 * sibling }, (_, i) => i + 1)
    return [...leftRange, '...', total]
  }

  if (showLeftDots && !showRightDots) {
    const rightRange = Array.from({ length: 3 + 2 * sibling }, (_, i) => total - (3 + 2 * sibling) + i + 1)
    return [1, '...', ...rightRange]
  }

  const middleRange = Array.from({ length: rightSibling - leftSibling + 1 }, (_, i) => leftSibling + i)
  return [1, '...', ...middleRange, '...', total]
})

const goTo = (page: number | string) => {
  if (typeof page !== 'number') return
  if (page < 1 || page > props.totalPages) return
  emit('update:currentPage', page)
  emit('change', page)
}
</script>

<template>
  <div class="join">
    <button
      class="join-item btn"
      :class="{ 'btn-disabled': currentPage === 1 }"
      :disabled="currentPage === 1"
      @click="goTo(currentPage - 1)"
    >
      «
    </button>
    <button
      v-for="(page, index) in pages"
      :key="index"
      class="join-item btn"
      :class="{
        'btn-active': page === currentPage,
        'btn-disabled': page === '...',
      }"
      :disabled="page === '...'"
      @click="goTo(page)"
    >
      {{ page }}
    </button>
    <button
      class="join-item btn"
      :class="{ 'btn-disabled': currentPage === totalPages }"
      :disabled="currentPage === totalPages"
      @click="goTo(currentPage + 1)"
    >
      »
    </button>
  </div>
</template>
