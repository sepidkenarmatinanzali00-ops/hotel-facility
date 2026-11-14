'use client'

import { useState, useEffect } from 'react'
import { Bell, LogOut, Menu, Moon, Sun, Building2, Wifi, WifiOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTheme } from 'next-themes'
import { useRealtimeNotifications, RealtimeNotification } from '@/hooks/use-realtime'
import { relativeTime } from '@/lib/constants'
import { toast } from 'sonner'

interface NotificationItem {
  id: string
  title: string
  body: string
  type: string
  issueId: string | null
  read: boolean
  createdAt: string
}

interface Props {
  user: { id: string; username: string; fullName: string; role: string }
  onLogout: () => void
  onOpenSidebar?: () => void
  onNotification?: (n: RealtimeNotification) => void
}

const roleLabels: Record<string, string> = {
  MANAGER: 'مدیر',
  HOUSEKEEPING: 'خانه‌داری',
  FACILITY: 'تاسیسات',
}

export function AppHeader({ user, onLogout, onOpenSidebar, onNotification }: Props) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [openNotif, setOpenNotif] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => { setMounted(true) }, []) // eslint-disable-line react-hooks/set-state-in-effect

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/notifications', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications || [])
          setUnread(data.unreadCount || 0)
        }
      } catch {}
    }
    fetchNotifs()
    const t = setInterval(fetchNotifs, 30000) // polling fallback
    return () => clearInterval(t)
  }, [refreshTick])

  useRealtimeNotifications({
    role: user.role,
    userId: user.id,
    onNotification: (n) => {
      onNotification?.(n)
      // رفرش لیست اعلان‌ها
      setRefreshTick(t => t + 1)
    },
  })

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' })
    setRefreshTick(t => t + 1)
  }

  const markOneRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    setRefreshTick(t => t + 1)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-16 items-center justify-between gap-2 px-3 sm:px-6">
        <div className="flex items-center gap-2">
          {onOpenSidebar && (
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSidebar} aria-label="منو">
              <Menu className="size-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-5" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold leading-tight">سامانه تاسیسات هتل</div>
              <div className="text-xs text-muted-foreground">{roleLabels[user.role] ?? user.role}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Popover open={openNotif} onOpenChange={setOpenNotif}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="اعلان‌ها">
                <Bell className="size-5" />
                {unread > 0 && (
                  <span className="pulse-ring absolute -top-0.5 -left-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unread > 9 ? '۹+' : String(unread).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-screen max-w-md p-0" align="end">
              <div className="flex items-center justify-between border-b p-3">
                <span className="font-bold">اعلان‌ها</span>
                {unread > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs">
                    خواندن همه
                  </Button>
                )}
              </div>
              <ScrollArea className="h-96">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    <Bell className="mx-auto mb-2 size-8 opacity-30" />
                    اعلانی وجود ندارد
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map(n => (
                      <button
                        key={n.id}
                        onClick={() => { if (!n.read) markOneRead(n.id) }}
                        className={`flex w-full flex-col gap-1 p-3 text-right transition hover:bg-muted/50 ${!n.read ? 'bg-primary/5' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{n.title}</span>
                          {!n.read && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                        </div>
                        <span className="text-xs text-muted-foreground">{n.body}</span>
                        <span className="text-[10px] text-muted-foreground/70">{relativeTime(n.createdAt)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="تغییر تم"
            >
              {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
          )}

          <div className="hidden items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 sm:flex">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {user.fullName.charAt(0)}
            </div>
            <div className="leading-tight">
              <div className="text-xs font-bold">{user.fullName}</div>
              <div className="text-[10px] text-muted-foreground">{roleLabels[user.role]}</div>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onLogout} aria-label="خروج">
            <LogOut className="size-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
