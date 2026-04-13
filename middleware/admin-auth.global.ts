export default defineNuxtRouteMiddleware((to) => {
  // Only protect /admin/** routes
  if (!to.path.startsWith('/admin/')) return

  // Allow access to login/register pages (no auth required)
  if (to.path.startsWith('/admin/auth/')) return

  // Middleware runs client-side only for admin routes (ssr: false in nuxt.config.ts)
  if (!import.meta.client) return

  try {
    const raw =
      localStorage.getItem('ns_admin_auth') ||
      sessionStorage.getItem('ns_admin_auth')

    if (!raw) {
      return navigateTo('/admin/auth/login')
    }

    const session = JSON.parse(raw) as { member?: { role?: string } }

    if (session?.member?.role !== 'admin') {
      // Clear any partial/invalid session
      localStorage.removeItem('ns_admin_auth')
      sessionStorage.removeItem('ns_admin_auth')
      document.cookie = 'access_token=; Path=/; Max-Age=0; SameSite=Lax'
      document.cookie = 'refresh_token=; Path=/; Max-Age=0; SameSite=Lax'
      return navigateTo('/admin/auth/login')
    }
  } catch {
    return navigateTo('/admin/auth/login')
  }
})
