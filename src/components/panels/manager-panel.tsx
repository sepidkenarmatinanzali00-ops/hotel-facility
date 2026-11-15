'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard, Trophy, Archive, Users, Building2, RefreshCw, TrendingUp,
  Clock, Star, CheckCircle2, AlertCircle, XCircle, Plus, Pencil, Trash2, Power, Search, ThumbsUp, AlertTriangle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { IssueCard, IssueWithRelations, feedbackMeta } from '@/components/issue-card'
import {
  CATEGORIES, PRIORITIES, STATUSES, categoryMeta, priorityMeta, statusMeta,
  formatDateTime, formatDuration, toFa, relativeTime,
} from '@/lib/constants'

type TabKey = 'dashboard' | 'leaderboard' | 'archive' | 'users' | 'rooms'
interface Props { user: { id: string; username: string; fullName: string; role: string } }

export function ManagerPanel({ user }: Props) {
  const [tab, setTab] = useState<TabKey>('dashboard')

  return (
    <div className="p-3 sm:p-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="mb-4 grid h-auto w-full grid-cols-3 gap-1 sm:grid-cols-5">
          <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="size-4" />داشبورد</TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-1.5"><Trophy className="size-4" />امتیازات</TabsTrigger>
          <TabsTrigger value="archive" className="gap-1.5"><Archive className="size-4" />آرشیو</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="size-4" />کاربران</TabsTrigger>
          <TabsTrigger value="rooms" className="gap-1.5"><Building2 className="size-4" />اتاق‌ها</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="leaderboard"><LeaderboardTab /></TabsContent>
        <TabsContent value="archive"><ArchiveTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="rooms"><RoomsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

/* ---------------- داشبورد ---------------- */
function DashboardTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' })
      if (res.ok) setData(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading || !data) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}</div>
  }

  const s = data.summary
  return (
    <div className="space-y-4">
      {/* KPI کارت‌ها */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="کل خرابی‌ها" value={s.total} icon={LayoutDashboard} color="bg-primary/10 text-primary" />
        <KpiCard label="در انتظار" value={s.pending} icon={AlertCircle} color="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" />
        <KpiCard label="در حال رسیدگی" value={s.inProgress} icon={RefreshCw} color="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" />
        <KpiCard label="رفع شده" value={s.resolved} icon={CheckCircle2} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" />
        <KpiCard label="لغو شده" value={s.cancelled} icon={XCircle} color="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" />
        <KpiCard label="میانگین زمان رفع" value={formatDuration(s.avgResolutionMinutes)} icon={Clock} color="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" isString />
        <KpiCard label="نرخ تأیید رفع" value={s.avgRating ? `${toFa(Math.round(s.avgRating * 20))}٪` : '-'} icon={ThumbsUp} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" isString />
        <KpiCard label="نیروهای تاسیسات" value={s.users.facility} icon={Users} color="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" />
      </div>

      {/* نمودار روزانه */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="size-4" />روند ۱۴ روز اخیر</CardTitle>
          <CardDescription>تعداد خرابی‌های ثبت‌شده و رفع‌شده در هر روز</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.charts.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: 'inherit' }} reversed />
              <YAxis tick={{ fontSize: 11, fontFamily: 'inherit' }} orientation="right" allowDecimals={false} />
              <Tooltip contentStyle={{ fontFamily: 'inherit', fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontFamily: 'inherit', fontSize: 12 }} />
              <Line type="monotone" dataKey="total" name="ثبت شده" stroke="#ea580c" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="resolved" name="رفع شده" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* نمودار دسته‌بندی */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">توزیع بر اساس نوع خرابی</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.charts.byCategory.map((c: any) => ({ ...c, label: categoryMeta(c.label).label }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'inherit' }} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'inherit' }} allowDecimals={false} orientation="right" />
                <Tooltip contentStyle={{ fontFamily: 'inherit', fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" name="تعداد" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* نمودار اولویت */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">توزیع بر اساس اولویت</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.charts.byPriority.map((p: any) => ({ ...p, label: priorityMeta(p.label).label }))}
                  dataKey="value"
                  nameKey="label"
                  cx="50%" cy="50%"
                  outerRadius={90}
                  label={(e: any) => `${e.label}: ${toFa(e.value)}`}
                  labelLine={false}
                >
                  {data.charts.byPriority.map((p: any, i: number) => {
                    const m = priorityMeta(p.label)
                    const color = m.color.includes('emerald') ? '#10b981' : m.color.includes('amber') ? '#f59e0b' : m.color.includes('orange') ? '#f97316' : '#ef4444'
                    return <Cell key={i} fill={color} />
                  })}
                </Pie>
                <Tooltip contentStyle={{ fontFamily: 'inherit', fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ۱۰ اتاق پرخرابی */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">۱۰ اتاق با بیشترین خرابی</CardTitle>
          </CardHeader>
          <CardContent>
            {data.charts.byRoom.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">داده‌ای موجود نیست</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.charts.byRoom} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11, fontFamily: 'inherit' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fontFamily: 'inherit' }} width={60} orientation="right" />
                  <Tooltip contentStyle={{ fontFamily: 'inherit', fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" name="تعداد خرابی" fill="#ca8a04" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, color, isString }: { label: string; value: number | string; icon: any; color: string; isString?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`mb-2 inline-flex size-9 items-center justify-center rounded-lg ${color}`}>
          <Icon className="size-5" />
        </div>
        <div className="text-2xl font-bold leading-tight">{isString ? value : toFa(value as number)}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}

/* ---------------- جدول امتیازات ---------------- */
function LeaderboardTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leaderboard?days=${days}`, { cache: 'no-store' })
      if (res.ok) setData(await res.json())
    } finally { setLoading(false) }
  }, [days])

  useEffect(() => { load() }, [load])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2"><Trophy className="size-5 text-amber-500" />جدول امتیازات نیروهای تاسیسات</CardTitle>
              <CardDescription>بر اساس سرعت رفع (۶۰٪)، کیفیت (۲۵٪) و حجم کار (۱۵٪) در {toFa(days)} روز گذشته</CardDescription>
            </div>
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">۷ روز</SelectItem>
                <SelectItem value="30">۳۰ روز</SelectItem>
                <SelectItem value="90">۹۰ روز</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
          ) : !data?.leaderboard?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">داده‌ای برای نمایش موجود نیست</p>
          ) : (
            <div className="space-y-3">
              {data.leaderboard.map((row: any, i: number) => (
                <div
                  key={row.userId}
                  className={`flex flex-wrap items-center gap-4 rounded-lg border p-3 transition ${i === 0 ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20' : 'border-border'}`}
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-lg font-bold">
                    {i < 3 ? medals[i] : toFa(i + 1)}
                  </div>
                  <Avatar className="size-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {row.fullName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-32">
                    <div className="font-bold">{row.fullName}</div>
                    <div className="text-xs text-muted-foreground">@{row.username}</div>
                  </div>
                  <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                    <div>
                      <div className="text-muted-foreground">رفع شده</div>
                      <div className="font-bold">{toFa(row.resolvedCount)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">میانگین زمان</div>
                      <div className="font-bold">{formatDuration(row.avgMinutes)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">سریع‌ترین</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">{formatDuration(row.minMinutes)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">میانگین امتیاز</div>
                      <div className="font-bold">{row.avgRating ? `${toFa(row.avgRating)} از ۵` : '-'}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-3xl font-bold text-primary">{toFa(row.score)}</div>
                    <div className="text-[10px] text-muted-foreground">از ۱۰۰</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* توضیح فرمول */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">فرمول امتیازدهی</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2"><span className="font-bold text-foreground">سرعت (۶۰ امتیاز):</span> هرچه میانگین زمان رفع کمتر، امتیاز بیشتر. نرمال‌سازی بر اساس بیشترین زمان.</div>
          <div className="flex items-start gap-2"><span className="font-bold text-foreground">کیفیت (۲۵ امتیاز):</span> بر اساس میانگین امتیاز خانه‌داری (۱ تا ۵ ستاره).</div>
          <div className="flex items-start gap-2"><span className="font-bold text-foreground">حجم کار (۱۵ امتیاز):</span> تعداد خرابی‌های رفع‌شده نسبت به بیشترین.</div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ---------------- آرشیو ---------------- */
function ArchiveTab() {
  const [issues, setIssues] = useState<IssueWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', category: '', room: '', q: '' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
      const res = await fetch(`/api/archive?${params.toString()}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setIssues(data.issues || [])
        setSelected(new Set())
      }
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load() }, [load])

  const deleteIssue = async (issue: IssueWithRelations) => {
    if (!confirm(`رکورد "${issue.ticketCode}" حذف شود؟ این عمل قابل بازگشت نیست.`)) return
    try {
      const res = await fetch(`/api/archive?id=${issue.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'خطا در حذف')
      }
      toast.success(`رکورد ${issue.ticketCode} حذف شد`)
      load()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === issues.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(issues.map(i => i.id)))
    }
  }

  const bulkDelete = async () => {
    if (selected.size === 0) {
      toast.error('هیچ رکوردی انتخاب نشده')
      return
    }
    if (!confirm(`${toFa(selected.size)} رکورد انتخاب‌شده حذف شود؟ این عمل قابل بازگشت نیست.`)) return
    setBulkDeleting(true)
    try {
      const ids = Array.from(selected)
      const results = await Promise.all(
        ids.map(id =>
          fetch(`/api/archive?id=${id}`, { method: 'DELETE' }).then(r => r.ok)
        )
      )
      const success = results.filter(Boolean).length
      toast.success(`${toFa(success)} رکورد با موفقیت حذف شد`)
      load()
    } catch (e: any) {
      toast.error(e.message || 'خطا در حذف گروهی')
    } finally {
      setBulkDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجو..."
                value={filters.q}
                onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                className="pr-9"
              />
            </div>
            <Select value={filters.status || 'ALL'} onValueChange={v => setFilters(f => ({ ...f, status: v === 'ALL' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="وضعیت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">همه وضعیت‌ها</SelectItem>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.category || 'ALL'} onValueChange={v => setFilters(f => ({ ...f, category: v === 'ALL' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="نوع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">همه نوع‌ها</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="شماره اتاق"
              value={filters.room}
              onChange={e => setFilters(f => ({ ...f, room: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {toFa(issues.length)} مورد یافت شد
            {selected.size > 0 && (
              <span className="mr-2 rounded-md bg-primary/10 px-2 py-0.5 text-primary">
                {toFa(selected.size)} انتخاب‌شده
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {issues.length > 0 && (
            <Button variant="outline" size="sm" onClick={toggleSelectAll} className="gap-1.5">
              <CheckCircle2 className="size-3.5" />
              {selected.size === issues.length ? 'لغو همه' : 'انتخاب همه'}
            </Button>
          )}
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={bulkDelete} disabled={bulkDeleting} className="gap-1.5">
              <Trash2 className="size-3.5" />
              {bulkDeleting ? 'در حال حذف...' : `حذف ${toFa(selected.size)} مورد`}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={load} className="gap-1">
            <RefreshCw className="size-3.5" />بروزرسانی
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48" />)}</div>
      ) : issues.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Archive className="size-10 opacity-30" />
            <span>موردی یافت نشد</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {issues.map(issue => {
            const isSelected = selected.has(issue.id)
            return (
              <div key={issue.id} className={`relative rounded-lg transition ${isSelected ? 'ring-2 ring-destructive' : ''}`}>
                <div className="absolute right-2 top-2 z-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(issue.id)}
                    className="size-4 cursor-pointer rounded border-border accent-destructive"
                    aria-label={`انتخاب ${issue.ticketCode}`}
                  />
                </div>
                <IssueCard
                  issue={issue}
                  actions={
                    <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => deleteIssue(issue)}>
                      <Trash2 className="size-3.5" />
                      حذف از آرشیو
                    </Button>
                  }
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ---------------- مدیریت کاربران ---------------- */
function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState<any | null>(null)
  const [openForm, setOpenForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users', { cache: 'no-store' })
      if (res.ok) setUsers((await res.json()).users || [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const toggleActive = async (u: any) => {
    const res = await fetch(`/api/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !u.active }),
    })
    if (res.ok) { toast.success(u.active ? 'غیرفعال شد' : 'فعال شد'); load() }
  }

  const deleteUser = async (u: any) => {
    if (!confirm(`کاربر "${u.fullName}" حذف شود؟`)) return
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('حذف شد'); load() }
  }

  const roleLabels: Record<string, string> = { MANAGER: 'مدیر', HOUSEKEEPING: 'خانه‌داری', FACILITY: 'تاسیسات' }
  const roleColors: Record<string, string> = {
    MANAGER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    HOUSEKEEPING: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
    FACILITY: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">مدیریت کاربران ({toFa(users.length)})</h2>
        <Button onClick={() => { setEditUser(null); setOpenForm(true) }} className="gap-2">
          <Plus className="size-4" />افزودن کاربر
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <Card key={u.id} className={!u.active ? 'opacity-60' : ''}>
              <CardContent className="flex flex-wrap items-center gap-3 p-3">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">{u.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-32">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{u.fullName}</span>
                    <Badge className={roleColors[u.role]} variant="secondary">{roleLabels[u.role]}</Badge>
                    {!u.active && <Badge variant="outline">غیرفعال</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @{u.username} {u.phone && `• ${u.phone}`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditUser(u); setOpenForm(true) }} aria-label="ویرایش">
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => toggleActive(u)} aria-label="فعال/غیرفعال">
                    <Power className={`size-4 ${u.active ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteUser(u)} className="text-destructive" aria-label="حذف">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UserFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        user={editUser}
        onSaved={() => { setOpenForm(false); load() }}
      />
    </div>
  )
}

function UserFormDialog({ open, onOpenChange, user, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; user: any; onSaved: () => void }) {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('HOUSEKEEPING')
  const [phone, setPhone] = useState('')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.fullName); setUsername(user.username); setRole(user.role)
      setPhone(user.phone || ''); setActive(user.active); setPassword('')
    } else {
      setFullName(''); setUsername(''); setRole('HOUSEKEEPING'); setPhone(''); setActive(true); setPassword('')
    }
  }, [user, open])

  const save = async () => {
    if (!fullName || !username || (!user && !password)) {
      toast.error('نام، نام کاربری و رمز الزامی است')
      return
    }
    setSaving(true)
    try {
      const body: any = { fullName, role, phone, active }
      if (password) body.password = password
      if (!user) body.username = username
      const res = await fetch(user ? `/api/users/${user.id}` : '/api/users', {
        method: user ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'خطا')
      toast.success(user ? 'بروزرسانی شد' : 'کاربر جدید ساخته شد')
      onSaved()
    } catch (e: any) {
      toast.error(e.message)
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>نام و نام خانوادگی *</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>نام کاربری *</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)} disabled={!!user} />
            </div>
            <div className="space-y-1.5">
              <Label>رمز عبور {user ? '(اختیاری)' : '*'}</Label>
              <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder={user ? 'بدون تغییر خالی بگذارید' : ''} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>نقش</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">مدیر</SelectItem>
                  <SelectItem value="HOUSEKEEPING">خانه‌داری</SelectItem>
                  <SelectItem value="FACILITY">تاسیسات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>تلفن</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912..." />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)} />
            <Label htmlFor="active">کاربر فعال</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- مدیریت اتاق‌ها ---------------- */
function RoomsTab() {
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [number, setNumber] = useState('')
  const [floor, setFloor] = useState('1')
  const [type, setType] = useState('استاندارد')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rooms', { cache: 'no-store' })
      if (res.ok) setRooms((await res.json()).rooms || [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!number || !floor || !type) { toast.error('تمام فیلدها الزامی است'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, floor: Number(floor), type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'خطا')
      toast.success('اتاق اضافه شد')
      setNumber(''); setFloor('1'); setType('استاندارد')
      setOpenForm(false); load()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">اتاق‌های هتل ({toFa(rooms.length)})</h2>
        <Button onClick={() => setOpenForm(true)} className="gap-2"><Plus className="size-4" />افزودن اتاق</Button>
      </div>

      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map(r => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                    {r.number}
                  </div>
                  <div>
                    <div className="text-sm font-bold">طبقه {toFa(r.floor)}</div>
                    <div className="text-xs text-muted-foreground">{r.type}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>افزودن اتاق جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>شماره اتاق</Label>
                <Input value={number} onChange={e => setNumber(e.target.value)} placeholder="مثال 201" />
              </div>
              <div className="space-y-1.5">
                <Label>طبقه</Label>
                <Input value={floor} onChange={e => setFloor(e.target.value)} type="number" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>نوع اتاق</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="استاندارد">استاندارد</SelectItem>
                  <SelectItem value="دوبل">دوبل</SelectItem>
                  <SelectItem value="سوئیت">سوئیت</SelectItem>
                  <SelectItem value="سوئیت جونیور">سوئیت جونیور</SelectItem>
                  <SelectItem value="پرزیدنتال">پرزیدنتال</SelectItem>
                  <SelectItem value="سوئیت پرزیدنتال">سوئیت پرزیدنتال</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>انصراف</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'در حال ذخیره...' : 'افزودن'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
