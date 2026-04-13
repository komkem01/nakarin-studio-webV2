export type ToastType = 'info' | 'success' | 'warning' | 'error'
export type ToastPosition =
  | 'top-start' | 'top-center' | 'top-end'
  | 'middle-start' | 'middle-center' | 'middle-end'
  | 'bottom-start' | 'bottom-center' | 'bottom-end'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration: number
}

const toasts = ref<ToastItem[]>([])

export const useToast = () => {
  const add = (message: string, type: ToastType = 'info', duration = 3000) => {
    const id = Math.random().toString(36).slice(2)
    toasts.value.push({ id, message, type, duration })
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
    return id
  }

  const remove = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) toasts.value.splice(index, 1)
  }

  const info = (message: string, duration?: number) => add(message, 'info', duration)
  const success = (message: string, duration?: number) => add(message, 'success', duration)
  const warning = (message: string, duration?: number) => add(message, 'warning', duration)
  const error = (message: string, duration?: number) => add(message, 'error', duration)

  return { toasts: readonly(toasts), add, remove, info, success, warning, error }
}
