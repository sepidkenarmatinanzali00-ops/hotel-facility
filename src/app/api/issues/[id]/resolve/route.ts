import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notifyUser } from '@/lib/notification-hub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// رفع خرابی + عکس بعد از رفع
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })
  if (session.role !== 'FACILITY' && session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط تاسیسات می‌تواند رفع کند' }, { status: 403 })
  }
  const { id } = await ctx.params

  const body = await req.json()
  const { afterPhoto, resolutionNote } = body

  if (!afterPhoto) {
    return NextResponse.json({ error: 'عکس بعد از رفع الزامی است' }, { status: 400 })
  }

  const issue = await db.issue.findUnique({ where: { id } })
  if (!issue) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })
  if (issue.status !== 'IN_PROGRESS') {
    return NextResponse.json({ error: 'ابتدا خرابی باید پذیرفته شده باشد' }, { status: 400 })
  }

  const resolvedAt = new Date()
  const assignedAt = issue.assignedAt ?? issue.createdAt
  const diffMs = resolvedAt.getTime() - new Date(assignedAt).getTime()
  const resolutionMinutes = Math.max(1, Math.round(diffMs / 60000))

  const updated = await db.issue.update({
    where: { id },
    data: {
      status: 'RESOLVED',
      afterPhoto,
      resolutionNote: resolutionNote?.trim() || null,
      resolvedAt,
      resolutionMinutes,
    },
    include: {
      reportedBy: { select: { id: true, fullName: true, username: true } },
      assignedTo: { select: { id: true, fullName: true, username: true } },
    },
  })

  // اعلان به خانه‌داری
  await db.notification.create({
    data: {
      userId: issue.reportedById,
      issueId: issue.id,
      title: `رفع شد: ${issue.ticketCode}`,
      body: `${session.fullName} اعلام کرد مشکل رفع شد. لطفاً وضعیت رفع را تأیید کنید`,
      type: 'resolved',
    }
  }).catch(() => {})
  notifyUser(issue.reportedById, {
    title: `رفع شد: ${issue.ticketCode}`,
   body: `${session.fullName} اعلام کرد مشکل رفع شد. لطفاً وضعیت رفع را تأیید کنید`,
    type: 'resolved',
    issueId: issue.id,
  })

  await db.activityLog.create({
    data: {
      userId: session.id,
      action: 'resolve_issue',
      detail: `رفع خرابی ${issue.ticketCode} در ${resolutionMinutes} دقیقه`,
      issueId: issue.id,
    }
  }).catch(() => {})

  return NextResponse.json({ issue: updated })
}
