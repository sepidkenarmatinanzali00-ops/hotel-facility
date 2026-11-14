import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notifyUser } from '@/lib/notification-hub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// پذیرش خرابی توسط نیروی تاسیسات
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })
  if (session.role !== 'FACILITY' && session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط تاسیسات می‌تواند پذیرش کند' }, { status: 403 })
  }
  const { id } = await ctx.params

  const issue = await db.issue.findUnique({ where: { id } })
  if (!issue) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })
  if (issue.status !== 'PENDING') {
    return NextResponse.json({ error: 'این خرابی قبلاً پذیرفته یا رفع شده است' }, { status: 400 })
  }

  const updated = await db.issue.update({
    where: { id },
    data: {
      status: 'IN_PROGRESS',
      assignedToId: session.id,
      assignedAt: new Date(),
    },
    include: {
      reportedBy: { select: { id: true, fullName: true, username: true } },
      assignedTo: { select: { id: true, fullName: true, username: true } },
    },
  })

  // اعلان به خانه‌داری که خرابی پذیرفته شد
  await db.notification.create({
    data: {
      userId: issue.reportedById,
      issueId: issue.id,
      title: `پذیرفته شد: ${issue.ticketCode}`,
      body: `${session.fullName} خرابی را پذیرفت و در حال رسیدگی است`,
      type: 'assigned',
    }
  }).catch(() => {})
  notifyUser(issue.reportedById, {
    title: `پذیرفته شد: ${issue.ticketCode}`,
    body: `${session.fullName} خرابی را پذیرفت و در حال رسیدگی است`,
    type: 'assigned',
    issueId: issue.id,
  })

  await db.activityLog.create({
    data: {
      userId: session.id,
      action: 'assign_issue',
      detail: `پذیرش خرابی ${issue.ticketCode}`,
      issueId: issue.id,
    }
  }).catch(() => {})

  return NextResponse.json({ issue: updated })
}
