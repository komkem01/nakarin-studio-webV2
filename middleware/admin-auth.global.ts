const CUSTOMER_PROTECTED = ['/booking', '/profile', '/orders']

export default defineNuxtRouteMiddleware((to) => {
  // ── Admin routes ──────────────────────────────────────────────────────────
  if (to.path.startsWith('/admin/')) {
    if (to.path.startsWith('/admin/auth/')) return

    // admin routes are ssr:false — only run client-side
    if (!import.meta.client) return

    try {
      const raw =
        localStorage.getItem('ns_admin_auth') ||
        sessionStorage.getItem('ns_admin_auth')

      if (!raw) return navigateTo('/admin/auth/login')

      const session = JSON.parse(raw) as { member?: { role?: string } }
      if (session?.member?.role !== 'admin') {
        localStorage.removeItem('ns_admin_auth')
        sessionStorage.removeItem('ns_admin_auth')
        document.cookie = 'access_token=; Path=/; Max-Age=0; SameSite=Lax'
        document.cookie = 'refresh_token=; Path=/; Max-Age=0; SameSite=Lax'
        return navigateTo('/admin/auth/login')
      }
    } catch {
      return navigateTo('/admin/auth/login')
    }
    return
  }

  // ── Customer protected routes ─────────────────────────────────────────────
  const needsAuth = CUSTOMER_PROTECTED.some(p => to.path === p || to.path.startsWith(p + '/'))
  if (!needsAuth) return
  if (!import.meta.client) return

  try {
    const raw =
      localStorage.getItem('ns_auth') ||
      sessionStorage.getItem('ns_auth')

    if (!raw) return navigateTo(`/auth/login?redirect=${encodeURIComponent(to.fullPath)}`)

    const session = JSON.parse(raw) as { member?: { role?: string } }
    if (!session?.member?.role) {
      return navigateTo(`/auth/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
  } catch {
    return navigateTo('/auth/login')
  }
})
