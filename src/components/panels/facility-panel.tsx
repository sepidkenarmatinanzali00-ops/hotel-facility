'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ListChecks, ClipboardList, CheckCircle2, RefreshCw, Send, Camera, Check, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { PhotoInput } from '@/components/photo-input'
import { IssueCard, IssueWithRelations } from '@/components/issue-card'
import { toFa, formatDuration } from '@/lib/constants'

interface Props {
  user: { id: string; username: string; fullName: string; role: string }
}

export function FacilityPanel({ user }: Props) {
  const [tab, setTab] = useState('pending')
  const [pendingIssues, setPendingIssues] = useState<IssueWithRelations[]>([])
  const [myIssues, setMyIssues] = useState<IssueWithRelations[]>([])
  const [history, setHistory] = useState<IssueWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [resolveIssue, setResolveIssue] = useState<IssueWithRelations | null>(null)

  // فرم رفع
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, m, all] = await Promise.all([
        fetch('/api/issues?status=PENDING', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/issues?status=IN_PROGRESS&scope=mine', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/issues?status=RESOLVED&scope=mine', { cache: 'no-store' }).then(r => r.json()),
      ])
      setPendingIssues(p.issues || [])
      setMyIssues(m.issues || [])
      setHistory(all.issues || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const accept = async (id: string) => {
    const res = await fetch(`/api/issues/${id}/assign`, { method: 'POST' })
    if (res.ok) { toast.success('خرابی پذیرفته شد'); load() }
    else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'خطا')
    }
  }

  const submitResolve = async () => {
    if (!resolveIssue) return
    if (!afterPhoto) {
      toast.error('عکس بعد از رفع الزامی است')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/issues/${resolveIssue.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ afterPhoto, resolutionNote }),
      })
      if (res.ok) {
        toast.success('رفع خرابی ثبت شد. منتظر تأیید خانه‌داری')
        setResolveIssue(null)
        setAfterPhoto(null); setResolutionNote('')
        load()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'خطا')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="در انتظار پذیرش" value={pendingIssues.length} icon={ClipboardList} color="text-amber-600" pulse={pendingIssues.length > 0} />
        <StatCard label="در حال رسیدگی شما" value={myIssues.length} icon={RefreshCw} color="text-blue-600" />
        <StatCard label="رفع شده توسط شما" value={history.length} icon={CheckCircle2} color="text-emerald-600" />
        <StatCard
          label="میانگین زمان رفع شما"
          value={history.length ? formatDuration(Math.round(history.reduce((s, i) => s + (i.resolutionMinutes ?? 0), 0) / history.length)) : '-'}
          icon={History}
          color="text-purple-600"
          isString
        />
      </div>

      <h2 className="text-lg font-bold">کارهای تاسیسات</h2>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="gap-1">
            در انتظار
            {pendingIssues.length > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                {toFa(pendingIssues.length)}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="mine">فعال من ({toFa(myIssues.length)})</TabsTrigger>
          <TabsTrigger value="history">تاریخچه ({toFa(history.length)})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">{[1, 2].map(i => <Skeleton key={i} className="h-48" />)}</div>
          ) : pendingIssues.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <CheckCircle2 className="size-10 opacity-30" />
                <span>هیچ خرابی در انتظار پذیرش نیست</span>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pendingIssues.map(issue => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  actions={
                    <Button size="sm" onClick={() => accept(issue.id)} className="gap-1">
                      <Check className="size-3.5" />
                      پذیرش و شروع رسیدگی
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">{[1, 2].map(i => <Skeleton key={i} className="h-48" />)}</div>
          ) : myIssues.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <RefreshCw className="size-10 opacity-30" />
                <span>شما در حال حاضر روی هیچ خرابی کار نمی‌کنید</span>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {myIssues.map(issue => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  actions={
                    <Button size="sm" onClick={() => { setResolveIssue(issue); setAfterPhoto(null); setResolutionNote('') }} className="gap-1">
                      <Camera className="size-3.5" />
                      ثبت رفع با عکس
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}</div>
          ) : history.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <History className="size-10 opacity-30" />
                <span>هنوز خرابی‌ای را رفع نکرده‌اید</span>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {history.map(issue => <IssueCard key={issue.id} issue={issue} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* مودال رفع */}
      <Dialog open={!!resolveIssue} onOpenChange={(o) => !o && setResolveIssue(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ثبت رفع خرابی</DialogTitle>
            <DialogDescription>
              {resolveIssue?.ticketCode} - اتاق {resolveIssue?.roomNumber}
              <br />
              {resolveIssue?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>عکس بعد از رفع (الزامی)</Label>
              <PhotoInput value={afterPhoto} onChange={setAfterPhoto} label="عکس از وضعیت رفع شده" />
            </div>
            <div className="space-y-1.5">
              <Label>توضیحات (اختیاری)</Label>
              <Textarea
                value={resolutionNote}
                onChange={e => setResolutionNote(e.target.value)}
                rows={3}
                placeholder="اقدامات انجام شده را شرح دهید..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveIssue(null)}>انصراف</Button>
            <Button onClick={submitResolve} disabled={submitting} className="gap-2">
              <Send className="size-4" />
              {submitting ? 'در حال ثبت...' : 'ثبت رفع'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, pulse, isString }: { label: string; value: number | string; icon: any; color: string; pulse?: boolean; isString?: boolean }) {
  return (
    <Card className={pulse ? 'ring-2 ring-amber-400/50' : ''}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-xl font-bold">{isString ? value : toFa(value as number)}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
        <Icon className={`size-8 ${color} opacity-80`} />
      </CardContent>
    </Card>
  )
}
