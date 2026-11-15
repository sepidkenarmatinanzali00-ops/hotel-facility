'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ListChecks, ClipboardList, Send, X, CheckCircle2, RefreshCw, ThumbsUp, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { PhotoInput } from '@/components/photo-input'
import { IssueCard, IssueWithRelations, feedbackMeta } from '@/components/issue-card'
import { CATEGORIES, PRIORITIES, toFa, formatDuration } from '@/lib/constants'

interface Props {
  user: { id: string; username: string; fullName: string; role: string }
}

export function HousekeepingPanel({ user }: Props) {
  const [tab, setTab] = useState('mine')
  const [issues, setIssues] = useState<IssueWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [openForm, setOpenForm] = useState(false)
  const [confirmIssue, setConfirmIssue] = useState<IssueWithRelations | null>(null)
  const [rooms, setRooms] = useState<{ id: string; number: string; floor: number; type: string }[]>([])

  const [roomNumber, setRoomNumber] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('ELECTRICAL')
  const [priority, setPriority] = useState('MEDIUM')
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/issues?scope=mine', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setIssues(data.issues || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setRooms(data.rooms || [])
      }
    } catch {}
  }, [])

  useEffect(() => { load(); loadRooms() }, [load, loadRooms])

  const submit = async () => {
    if (!roomNumber || !description || !category) {
      toast.error('لطفاً شماره اتاق، شرح و نوع خرابی را وارد کنید')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomNumber, description, category, priority, beforePhoto }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'خطا در ثبت')
      toast.success(`خرابی با کد ${data.issue.ticketCode} ثبت شد و به واحد تاسیسات اطلاع داده شد`)
      setRoomNumber(''); setDescription(''); setCategory('ELECTRICAL'); setPriority('MEDIUM'); setBeforePhoto(null)
      setOpenForm(false)
      load()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const cancelIssue = async (id: string) => {
    if (!confirm('این خرابی لغو شود؟')) return
    const res = await fetch(`/api/issues/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'لغو توسط خانه‌داری' }),
    })
    if (res.ok) { toast.success('لغو شد'); load() }
    else toast.error('خطا در لغو')
  }

  // تأیید وضعیت رفع با سه گزینه
  const submitFeedback = async (id: string, feedback: string) => {
    const res = await fetch(`/api/issues/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolutionFeedback: feedback }),
    })
    if (res.ok) {
      toast.success('تأیید وضعیت ثبت شد')
      setConfirmIssue(null)
      load()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'خطا در ثبت تأیید')
    }
  }

  const pending = issues.filter(i => i.status === 'PENDING')
  const inProgress = issues.filter(i => i.status === 'IN_PROGRESS')
  const awaitingConfirm = issues.filter(i => i.status === 'RESOLVED' && !i.resolutionFeedback)
  const confirmed = issues.filter(i => i.status === 'RESOLVED' && !!i.resolutionFeedback)

  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="در انتظار پذیرش" value={pending.length} icon={ClipboardList} color="text-amber-600" />
        <StatCard label="در حال رسیدگی" value={inProgress.length} icon={RefreshCw} color="text-blue-600" />
        <StatCard label="منتظر تأیید" value={awaitingConfirm.length} icon={CheckCircle2} color="text-emerald-600" />
        <StatCard label="تأیید شده" value={confirmed.length} icon={ListChecks} color="text-zinc-500" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">خرابی‌های اعلام‌شده توسط شما</h2>
        <Button onClick={() => setOpenForm(true)} className="gap-2">
          <Plus className="size-4" />
          اعلام خرابی جدید
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="mine">همه ({toFa(issues.length)})</TabsTrigger>
          <TabsTrigger value="pending">در انتظار ({toFa(pending.length)})</TabsTrigger>
          <TabsTrigger value="active">فعال ({toFa(inProgress.length)})</TabsTrigger>
          <TabsTrigger value="resolved">رفع شده ({toFa(awaitingConfirm.length + confirmed.length)})</TabsTrigger>
        </TabsList>
        <TabsContent value="mine" className="mt-4">
          <IssueList issues={issues} loading={loading} onCancel={cancelIssue} onConfirm={setConfirmIssue} />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <IssueList issues={pending} loading={loading} onCancel={cancelIssue} onConfirm={setConfirmIssue} />
        </TabsContent>
        <TabsContent value="active" className="mt-4">
          <IssueList issues={inProgress} loading={loading} onCancel={cancelIssue} onConfirm={setConfirmIssue} />
        </TabsContent>
        <TabsContent value="resolved" className="mt-4">
          <IssueList issues={[...awaitingConfirm, ...confirmed]} loading={loading} onCancel={cancelIssue} onConfirm={setConfirmIssue} />
        </TabsContent>
      </Tabs>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>اعلام خرابی جدید</DialogTitle>
            <DialogDescription>فرم زیر را تکمیل کنید. پس از ثبت، بلافاصله به واحد تاسیسات اطلاع داده می‌شود.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>شماره اتاق *</Label>
                <Input value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="مثال 201" list="rooms-list" />
                <datalist id="rooms-list">
                  {rooms.map(r => <option key={r.id} value={r.number} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label>اولویت</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>نوع خرابی *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>شرح خرابی *</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="مشکل را به طور کامل شرح دهید..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>عکس از خرابی (توصیه می‌شود)</Label>
              <PhotoInput value={beforePhoto} onChange={setBeforePhoto} label="عکس بگیرید" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>انصراف</Button>
            <Button onClick={submit} disabled={submitting} className="gap-2">
              <Send className="size-4" />
              {submitting ? 'در حال ثبت...' : 'ثبت و ارسال به تاسیسات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmIssue} onOpenChange={(o) => !o && setConfirmIssue(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تأیید وضعیت رفع خرابی</DialogTitle>
            <DialogDescription>
              {confirmIssue?.ticketCode} - اتاق {confirmIssue?.roomNumber}
              {confirmIssue?.resolutionMinutes != null && (
                <span className="mt-1 block text-xs">زمان رفع: {formatDuration(confirmIssue.resolutionMinutes)}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <FeedbackButtons issueId={confirmIssue?.id ?? ''} onDone={submitFeedback} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function IssueList({
  issues, loading, onCancel, onConfirm,
}: {
  issues: IssueWithRelations[]
  loading: boolean
  onCancel: (id: string) => void
  onConfirm: (issue: IssueWithRelations) => void
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-lg" />)}
      </div>
    )
  }
  if (issues.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
          <ClipboardList className="size-10 opacity-30" />
          <span>موردی برای نمایش وجود ندارد</span>
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {issues.map(issue => (
        <IssueCard
          key={issue.id}
          issue={issue}
          actions={
            <>
              {(issue.status === 'PENDING' || issue.status === 'IN_PROGRESS') && (
                <Button size="sm" variant="outline" onClick={() => onCancel(issue.id)} className="gap-1 text-destructive">
                  <X className="size-3.5" />
                  لغو
                </Button>
              )}
              {issue.status === 'RESOLVED' && !issue.resolutionFeedback && (
                <Button size="sm" onClick={() => onConfirm(issue)} className="gap-1">
                  <CheckCircle2 className="size-3.5" />
                  تأیید وضعیت رفع
                </Button>
              )}
              {issue.status === 'RESOLVED' && issue.resolutionFeedback && (() => {
                const fb = feedbackMeta[issue.resolutionFeedback!]
                const FbIcon = fb?.icon
                return (
                  <Badge variant="outline" className={`gap-1 ${fb?.color} ${fb?.bg}`}>
                    {FbIcon && <FbIcon className="size-3.5" />}
                    {fb?.label}
                  </Badge>
                )
              })()}
            </>
          }
        />
      ))}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-2xl font-bold">{toFa(value)}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
        <Icon className={`size-8 ${color} opacity-80`} />
      </CardContent>
    </Card>
  )
}

// سه گزینه‌ی تأیید وضعیت رفع
function FeedbackButtons({ issueId, onDone }: { issueId: string; onDone: (id: string, feedback: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null)

  const click = async (feedback: string) => {
    setBusy(feedback)
    try {
      await onDone(issueId, feedback)
    } finally {
      setBusy(null)
    }
  }

  const options: { value: string; label: string; icon: any; cls: string }[] = [
    {
      value: 'FIXED',
      label: 'مشکل برطرف شده است',
      icon: ThumbsUp,
      cls: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    {
      value: 'PARTIALLY_FIXED',
      label: 'مشکل تا حدی برطرف شده است',
      icon: AlertTriangle,
      cls: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    {
      value: 'STILL_EXISTS',
      label: 'مشکل همچنان وجود دارد',
      icon: XCircle,
      cls: 'bg-red-600 hover:bg-red-700 text-white',
    },
  ]

  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-muted-foreground">
        لطفاً یکی از گزینه‌های زیر را انتخاب کنید تا وضعیت رفع خرابی تأیید شود:
      </p>
      <div className="space-y-2">
        {options.map(opt => {
          const OptIcon = opt.icon
          return (
            <Button
              key={opt.value}
              className={`w-full justify-start gap-3 py-6 text-base ${opt.cls}`}
              onClick={() => click(opt.value)}
              disabled={busy !== null}
            >
              <OptIcon className="size-5" />
              {opt.label}
              {busy === opt.value && <span className="ms-auto text-xs">در حال ثبت...</span>}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
