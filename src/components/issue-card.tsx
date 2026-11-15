'use client'

import { ReactNode } from 'react'
import { MapPin, Clock, User, CheckCircle2, Star, MessageSquare, XCircle, AlertCircle, AlertTriangle, ThumbsUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PhotoView } from './photo-view'
import { categoryMeta, priorityMeta, statusMeta, formatDateTime, relativeTime, formatDuration, toFa } from '@/lib/constants'

export interface IssueWithRelations {
  id: string
  ticketCode: string
  roomNumber: string
  description: string
  category: string
  priority: string
  status: string
  beforePhoto: string | null
  afterPhoto: string | null
  reportedAt: string
  assignedAt: string | null
  resolvedAt: string | null
  resolutionMinutes: number | null
  resolutionNote: string | null
  rating: number | null
  resolutionFeedback: string | null
  reportedBy: { id: string; fullName: string; username: string } | null
  assignedTo: { id: string; fullName: string; username: string } | null
}

// متادیتای تأیید وضعیت رفع
export const feedbackMeta: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  FIXED: {
    label: 'مشکل برطرف شده است',
    icon: ThumbsUp,
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
  },
  STILL_EXISTS: {
    label: 'مشکل همچنان وجود دارد',
    icon: XCircle,
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-100 dark:bg-red-900/40',
  },
  PARTIALLY_FIXED: {
    label: 'مشکل تا حدی برطرف شده است',
    icon: AlertTriangle,
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-100 dark:bg-amber-900/40',
  },
}

interface Props {
  issue: IssueWithRelations
  actions?: ReactNode
  compact?: boolean
}

export function IssueCard({ issue, actions, compact }: Props) {
  const cat = categoryMeta(issue.category)
  const prio = priorityMeta(issue.priority)
  const stat = statusMeta(issue.status)
  const Icon = cat.icon
  const fb = issue.resolutionFeedback ? feedbackMeta[issue.resolutionFeedback] : null
  const FbIcon = fb?.icon

  return (
    <Card className="overflow-hidden transition hover:shadow-md animate-slide-up">
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="flex size-9 items-center justify-center rounded-lg text-white"
              style={{ background: cat.color }}
            >
              <Icon className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">{issue.ticketCode}</span>
                <Badge variant="outline" className="gap-1">
                  <MapPin className="size-3" />
                  اتاق {issue.roomNumber}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">{cat.label}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${prio.bg} ${prio.color}`}>
              {prio.label}
            </span>
            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${stat.bg} ${stat.color}`}>
              {stat.label}
            </span>
          </div>
        </div>

        <p className="mb-3 text-sm leading-relaxed text-foreground/90 line-clamp-3">{issue.description}</p>

        {!compact && (issue.beforePhoto || issue.afterPhoto) && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">عکس قبل از رفع</div>
              <PhotoView src={issue.beforePhoto} alt="عکس قبل از رفع" className="h-24 w-full" label="قبل" />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">عکس بعد از رفع</div>
              <PhotoView src={issue.afterPhoto} alt="عکس بعد از رفع" className="h-24 w-full" label="بعد" />
            </div>
          </div>
        )}

        {issue.resolutionNote && (
          <div className="mb-3 flex items-start gap-2 rounded-md bg-muted/40 p-2 text-xs">
            <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">{issue.resolutionNote}</span>
          </div>
        )}

        {fb && FbIcon && (
          <div className={`mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${fb.bg} ${fb.color}`}>
            <FbIcon className="size-4 shrink-0" />
            <span>{fb.label}</span>
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {relativeTime(issue.reportedAt)}
          </span>
          {issue.reportedBy && (
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {issue.reportedBy.fullName}
            </span>
          )}
          {issue.assignedTo && (
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {issue.assignedTo.fullName}
            </span>
          )}
          {issue.resolutionMinutes != null && (
            <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3" />
              {formatDuration(issue.resolutionMinutes)}
            </span>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
