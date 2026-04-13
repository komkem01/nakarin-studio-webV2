/**
 * useAdminActivityWatcher
 *
 * Tracks user activity and manages session lifecycle:
 * - Proactively refreshes the access token every 4 minutes while the user is active
 * - Auto-logs out after INACTIVITY_TIMEOUT_MS of no interaction
 *
 * Token TTL is 5 minutes on the server.
 * Refresh happens 1 minute before expiry (at 4 min mark) when active.
 * Inactivity window matches the token TTL (5 min).
 */

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000      // 5 minutes — logout if no activity
const PROACTIVE_REFRESH_MS = 4 * 60 * 1000        // 4 minutes — refresh while active
const TICK_INTERVAL_MS = 30 * 1000                // check every 30 seconds
const ACTIVITY_THROTTLE_MS = 5 * 1000             // throttle activity update to every 5s

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const

export const useAdminActivityWatcher = () => {
  const { refreshAccessToken, clearSession } = useAdminSession()

  let lastActivityAt = 0
  let lastRefreshedAt = 0
  let tickTimer: ReturnType<typeof setInterval> | null = null
  let throttleTimer: ReturnType<typeof setTimeout> | null = null
  let running = false

  const updateActivity = () => {
    // Update immediately on first touch within throttle window
    if (!throttleTimer) {
      lastActivityAt = Date.now()
      throttleTimer = setTimeout(() => {
        throttleTimer = null
      }, ACTIVITY_THROTTLE_MS)
    }
  }

  const tick = async () => {
    const now = Date.now()
    const inactive = now - lastActivityAt

    if (inactive >= INACTIVITY_TIMEOUT_MS) {
      // User has been idle — log out
      stop()
      await clearSession()
      return
    }

    // User is active — proactively refresh token before it expires
    if (now - lastRefreshedAt >= PROACTIVE_REFRESH_MS) {
      try {
        await refreshAccessToken()
        lastRefreshedAt = Date.now()
      } catch {
        // Refresh failed (e.g. refresh token expired) — force logout
        stop()
        await clearSession()
      }
    }
  }

  const start = () => {
    if (!import.meta.client || running) return
    running = true
    lastActivityAt = Date.now()
    lastRefreshedAt = Date.now()

    ACTIVITY_EVENTS.forEach(ev =>
      document.addEventListener(ev, updateActivity, { passive: true })
    )
    tickTimer = setInterval(tick, TICK_INTERVAL_MS)
  }

  const stop = () => {
    if (!import.meta.client) return
    running = false

    ACTIVITY_EVENTS.forEach(ev =>
      document.removeEventListener(ev, updateActivity)
    )
    if (tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
    }
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
  }

  return { start, stop }
}
