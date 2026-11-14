'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export interface RealtimeNotification {
  title: string
  body: string
  type: string
  issueId?: string
}

interface Options {
  role: string
  userId: string
  onNotification?: (n: RealtimeNotification) => void
}

// هوک اعلان‌های بلادرنگ
// در محیط production بدون WebSocket از Polling استفاده می‌کنه
// در محیط sandbox از WebSocket واقعی استفاده می‌کنه
export function useRealtimeNotifications({ role, userId, onNotification }: Options) {
  const [connected, setConnected] = useState(false)
  const onNotificationRef = useRef(onNotification)
  const lastNotificationTime = useRef<string>('')

  useEffect(() => {
    onNotificationRef.current = onNotification
  }, [onNotification])

  // راه‌حل ۱: تلاش برای WebSocket (اگه موجود باشه)
  useEffect(() => {
    if (!role || !userId) return

    let socket: any = null
    let cleanup: (() => void) | null = null
    let active = true

    // تلاش برای WebSocket
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { io } = require('socket.io-client')
      socket = io('/?XTransformPort=3003', {
        transports: ['websocket', 'polling'],
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 3, // کمتر تا سریع‌تر fallback بشه
        reconnectionDelay: 2000,
        timeout: 5000,
      })

      socket.on('connect', () => {
        if (!active) return
        setConnected(true)
        socket.emit('register', { role, userId })
      })
      socket.on('disconnect', () => { if (active) setConnected(false) })
      socket.on('connect_error', () => { if (active) setConnected(false) })

      socket.on('notification', (payload: RealtimeNotification) => {
        toast.info(payload.title, { description: payload.body, duration: 6000 })
        onNotificationRef.current?.(payload)
      })

      cleanup = () => {
        try { socket.disconnect() } catch {}
      }
    } catch {
      // socket.io در production موجود نیست
    }

    return () => {
      active = false
      if (cleanup) cleanup()
    }
  }, [role, userId])

  // راه‌حل ۲: Polling همیشه فعال به عنوان fallback
  useEffect(() => {
    if (!role || !userId) return
    let active = true

    const poll = async () => {
      try {
        const res = await fetch('/api/notifications?unread=1', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const notifications = data.notifications || []
        if (notifications.length === 0) {
          lastNotificationTime.current = ''
          return
        }
        const latest = notifications[0]
        if (latest && latest.createdAt !== lastNotificationTime.current) {
          // نوتیفیکیشن جدید (یا اولین بار)
          if (lastNotificationTime.current) {
            // این یک نوتیفیکیشن جدید واقعیه
            toast.info(latest.title, { description: latest.body, duration: 6000 })
            onNotificationRef.current?.({
              title: latest.title,
              body: latest.body,
              type: latest.type,
              issueId: latest.issueId,
            })
          }
          lastNotificationTime.current = latest.createdAt
        }
        if (!connected) setConnected(true) // حداقل polling کار می‌کنه
      } catch {}
    }

    poll()
    const interval = setInterval(poll, 8000) // هر ۸ ثانیه

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [role, userId, connected])

  return { connected }
}
