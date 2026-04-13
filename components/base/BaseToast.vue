<script setup lang="ts">
import type { ToastPosition } from '~/composables/useAppToast'

const props = withDefaults(defineProps<{
  position?: ToastPosition
}>(), {
  position: 'top-end',
})

const { toasts, remove } = useAppToast()

const wrapperClasses = computed(() => {
  const map: Record<string, string> = {
    'top-start':     'top-4 left-4 items-start',
    'top-center':    'top-4 left-1/2 -translate-x-1/2 items-center',
    'top-end':       'top-4 right-4 items-end',
    'middle-start':  'top-1/2 -translate-y-1/2 left-4 items-start',
    'middle-center': 'top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 items-center',
    'middle-end':    'top-1/2 -translate-y-1/2 right-4 items-end',
    'bottom-start':  'bottom-4 left-4 items-start',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
    'bottom-end':    'bottom-4 right-4 items-end',
  }
  return map[props.position] ?? 'top-4 right-4 items-end'
})

const colorMap: Record<string, string> = {
  success: '#10b981',
  error:   '#ef4444',
  warning: '#f59e0b',
  info:    '#3b82f6',
}
</script>

<template>
  <div class="fixed z-[9999] flex flex-col gap-3 pointer-events-none" :class="wrapperClasses">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-card pointer-events-auto"
        :style="{ '--c': colorMap[toast.type], '--dur': `${toast.duration}ms` }"
        @click="remove(toast.id)"
      >
        <!-- left accent bar -->
        <span class="toast-accent" />

        <!-- icon -->
        <span class="toast-icon">
          <!-- success -->
          <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" />
          </svg>
          <!-- error -->
          <svg v-else-if="toast.type === 'error'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd" />
          </svg>
          <!-- warning -->
          <svg v-else-if="toast.type === 'warning'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd" />
          </svg>
          <!-- info -->
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5A.75.75 0 0 0 12 9Z" clip-rule="evenodd" />
          </svg>
        </span>

        <!-- message -->
        <p class="toast-msg">{{ toast.message }}</p>

        <!-- close -->
        <button class="toast-close" @click.stop="remove(toast.id)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>

        <!-- progress bar -->
        <span class="toast-progress" />
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* ---- card ---- */
.toast-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 340px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0,0,0,.10), 0 1.5px 6px rgba(0,0,0,.06);
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  padding: 13px 12px 16px 0;
}

/* ---- left accent ---- */
.toast-accent {
  flex-shrink: 0;
  width: 4px;
  align-self: stretch;
  background: var(--c);
  border-radius: 0 4px 4px 0;
  margin-right: 2px;
}

/* ---- icon ---- */
.toast-icon {
  flex-shrink: 0;
  color: var(--c);
  line-height: 0;
}
.toast-icon svg {
  width: 20px;
  height: 20px;
}

/* ---- message ---- */
.toast-msg {
  flex: 1;
  font-size: 13.5px;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1.45;
  margin: 0;
}

/* ---- close button ---- */
.toast-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  padding: 0;
}
.toast-close:hover {
  background: #f3f4f6;
  color: #374151;
}
.toast-close svg {
  width: 14px;
  height: 14px;
}

/* ---- progress bar ---- */
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: var(--c);
  border-radius: 0;
  animation: shrink var(--dur, 3000ms) linear forwards;
  opacity: 0.7;
}

@keyframes shrink {
  from { width: 100%; }
  to   { width: 0%; }
}

/* ---- transitions ---- */
.toast-enter-active {
  transition: all 0.35s cubic-bezier(0.21, 1.02, 0.73, 1);
}
.toast-leave-active {
  transition: all 0.2s ease-in;
  position: absolute;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(110%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(110%);
}
.toast-move {
  transition: transform 0.3s ease;
}
</style>

