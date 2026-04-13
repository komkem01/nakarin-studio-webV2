<script setup lang="ts">
export interface DropdownItem {
  label: string
  href?: string
  action?: () => void
  disabled?: boolean
  divider?: boolean
}

const props = withDefaults(defineProps<{
  label?: string
  items: DropdownItem[]
  position?: 'bottom' | 'top' | 'left' | 'right'
  align?: 'start' | 'end'
  triggerClass?: string
  contentClass?: string
}>(), {
  label: 'Click',
  position: 'bottom',
  align: 'start',
  triggerClass: '',
  contentClass: '',
})

const positionClass = computed(() => {
  const map: Record<string, string> = {
    top: 'dropdown-top',
    left: 'dropdown-left',
    right: 'dropdown-right',
    bottom: '',
  }
  return map[props.position] ?? ''
})

const alignClass = computed(() => props.align === 'end' ? 'dropdown-end' : '')
</script>

<template>
  <div :class="['dropdown', positionClass, alignClass]">
    <div tabindex="0" role="button" :class="['btn', props.triggerClass || 'm-1']">
      <slot name="trigger">{{ label }}</slot>
    </div>
    <ul
      tabindex="-1"
      :class="[
        'dropdown-content menu bg-base-100 rounded-box z-10 w-52 p-2 shadow-sm',
        props.contentClass,
      ]"
    >
      <template v-for="(item, index) in items" :key="index">
        <li v-if="item.divider" class="divider" />
        <li v-else :class="{ disabled: item.disabled }">
          <a
            v-if="item.href"
            :href="item.href"
          >{{ item.label }}</a>
          <button
            v-else
            type="button"
            @click="item.action?.()"
          >{{ item.label }}</button>
        </li>
      </template>
    </ul>
  </div>
</template>
