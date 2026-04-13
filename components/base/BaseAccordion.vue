<script setup lang="ts">
export interface AccordionLink {
  label: string
  to: string
  icon?:
    | 'dashboard'
    | 'products'
    | 'categories'
    | 'packages'
    | 'orders'
    | 'messages'
    | 'users'
    | 'admins'
}

export interface AccordionItem {
  title: string
  description?: string
  content?: string
  links?: AccordionLink[]
}

const props = withDefaults(defineProps<{
  items: AccordionItem[]
  name?: string
  defaultOpen?: number
}>(), {
  name: 'base-accordion',
  defaultOpen: 0,
})

const activeIndex = ref(-1)

onMounted(() => {
  if (props.defaultOpen >= 0 && props.defaultOpen < props.items.length) {
    activeIndex.value = props.defaultOpen
  }
})

const toggleItem = (index: number) => {
  activeIndex.value = activeIndex.value === index ? -1 : index
}

const iconPaths: Record<string, string> = {
  dashboard: 'M3 12l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  products: 'M4 7h16M4 12h16M4 17h10',
  categories: 'M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z',
  packages: 'M12 3l8 4-8 4-8-4 8-4zM4 11l8 4 8-4M4 15l8 4 8-4',
  orders: 'M6 4h9l3 3v13H6zM15 4v3h3',
  messages: 'M4 6h16v12H4zM4 8l8 6 8-6',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  admins: 'M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6zM9 12l2 2 4-4',
}

const getIconPath = (icon?: string) => iconPaths[icon || ''] || 'M12 6v12M6 12h12'
</script>

<template>
  <div class="w-full">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="collapse collapse-arrow mb-2 rounded-xl border border-neutral-200 bg-white/95"
      :class="activeIndex === index ? 'collapse-open' : 'collapse-close'"
    >
      <button
        type="button"
        class="collapse-title py-3.5 text-left w-full"
        @click="toggleItem(index)"
      >
        <p class="font-semibold text-neutral-800">{{ item.title }}</p>
        <p v-if="item.description" class="text-xs text-neutral-500 mt-0.5">{{ item.description }}</p>
      </button>
      <div v-show="activeIndex === index" class="collapse-content text-sm pt-0">
        <div v-if="item.links?.length" class="flex flex-col gap-1.5">
          <NuxtLink
            v-for="link in item.links"
            :key="link.to"
            :to="link.to"
            class="rounded-lg border border-transparent px-3 py-2.5 text-neutral-700 hover:bg-[#f0fdf4] hover:text-[#166534] hover:border-[#dcfce7] transition-colors"
            active-class="bg-[#f0fdf4] text-[#166534] font-semibold border-[#bbf7d0]"
          >
            <span class="flex items-center gap-2.5">
              <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path :d="getIconPath(link.icon)" />
              </svg>
              <span>{{ link.label }}</span>
            </span>
          </NuxtLink>
        </div>
        <p v-else>{{ item.content || '' }}</p>
      </div>
    </div>
  </div>
</template>
