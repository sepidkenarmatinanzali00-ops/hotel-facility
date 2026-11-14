'use client'

import { useState } from 'react'
import { Building2, LogIn, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

interface Props {
  onLogin: (user: { id: string; username: string; fullName: string; role: string }) => void
}

export function LoginScreen({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) { toast.error('نام کاربری و رمز عبور را وارد کنید'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'خطا در ورود')
      toast.success(`خوش آمدید ${data.user.fullName}`)
      onLogin(data.user)
    } catch (e: any) {
      toast.error(e.message)
    } finally { setLoading(false) }
  }

  const quickFill = (u: string) => {
    setUsername(u); setPassword('123456')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Building2 className="size-9" />
          </div>
          <CardTitle className="text-2xl">سامانه مدیریت تاسیسات هتل</CardTitle>
          <CardDescription>برای ورود، نام کاربری و رمز عبور خود را وارد کنید</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="username">نام کاربری</Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="نام کاربری"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">رمز عبور</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="نمایش رمز"
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              {loading ? 'در حال ورود...' : 'ورود'}
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">حساب‌های نمونه (رمز همه: ۱۲۳۴۵۶)</div>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <button onClick={() => quickFill('manager')} className="flex items-center justify-between rounded bg-card p-2 text-right hover:bg-primary/5">
                <span className="font-medium">مدیر هتل</span>
                <code className="text-muted-foreground">manager</code>
              </button>
              <button onClick={() => quickFill('housekeeping1')} className="flex items-center justify-between rounded bg-card p-2 text-right hover:bg-primary/5">
                <span className="font-medium">مریم احمدی (خانه‌داری)</span>
                <code className="text-muted-foreground">housekeeping1</code>
              </button>
              <button onClick={() => quickFill('facility1')} className="flex items-center justify-between rounded bg-card p-2 text-right hover:bg-primary/5">
                <span className="font-medium">علی محمدی (تاسیسات)</span>
                <code className="text-muted-foreground">facility1</code>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
