// مرکز اعلان‌های بلادرنگ بین API routes و WebSocket service
import type { SessionUser } from './auth'

type NotificationPayload = {
  userId?: string         // کاربر مشخص
  role?: string           // یا همه کاربران یک نقش
  title: string
  body: string
  type: string
  issueId?: string
}

type Listener = (payload: NotificationPayload) => void

class NotificationHub {
  private listeners = new Set<Listener>()
  private history: NotificationPayload[] = []

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  publish(payload: NotificationPayload) {
    this.history.push(payload)
    if (this.history.length > 200) this.history.shift()
    for (const fn of this.listeners) {
      try { fn(payload) } catch (e) { /* ignore */ }
    }
  }

  recent(limit = 50): NotificationPayload[] {
    return this.history.slice(-limit)
  }
}

export const notificationHub = new NotificationHub()

// Helper برای ارسال اعلان به نقش تاسیسات
export function notifyFacility(payload: Omit<NotificationPayload, 'role'> & { role?: string }) {
  notificationHub.publish({ ...payload, role: 'FACILITY' })
}

export function notifyUser(userId: string, payload: Omit<NotificationPayload, 'userId'>) {
  notificationHub.publish({ ...payload, userId })
}
