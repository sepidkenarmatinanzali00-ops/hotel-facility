'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { LoginScreen } from '@/components/login-screen'
import { AppHeader } from '@/components/app-header'
import { HousekeepingPanel } from '@/components/panels/housekeeping-panel'
import { FacilityPanel } from '@/components/panels/facility-panel'
import { ManagerPanel } from '@/components/panels/manager-panel'

interface User {
  id: string
  username: string
  fullName: string
  role: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data.user) setUser(data.user)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { checkSession() }, [checkSession])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <AppHeader user={user} onLogout={logout} />
      <main className="flex-1">
        {user.role === 'HOUSEKEEPING' && <HousekeepingPanel user={user} />}
        {user.role === 'FACILITY' && <FacilityPanel user={user} />}
        {user.role === 'MANAGER' && <ManagerPanel user={user} />}
      </main>
      <footer className="mt-auto border-t border-border bg-card py-3 text-center text-xs text-muted-foreground">
        سامانه مدیریت تاسیسات هتل • نسخه ۱.۰ • {new Date().getFullYear()}
      </footer>
    </div>
  )
}
