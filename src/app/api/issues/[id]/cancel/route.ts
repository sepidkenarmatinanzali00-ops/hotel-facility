import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notifyUser } from '@/lib/notification-hub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// لغو خرابی توسط خانه‌داری
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })
  if (session.role !== 'HOUSEKEEPING' && session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط خانه‌داری می‌تواند لغو کند' }, { status: 403 })
  }
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const reason = body.reason || ''

  const issue = await db.issue.findUnique({ where: { id } })
  if (!issue) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })
  if (issue.status === 'RESOLVED' || issue.status === 'CANCELLED') {
    return NextResponse.json({ error: 'این خرابی قابل لغو نیست' }, { status: 400 })
  }
  if (issue.reportedById !== session.id && session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط ثبت‌کننده می‌تواند لغو کند' }, { status: 403 })
  }

  const updated = await db.issue.update({
    where: { id },
    data: { status: 'CANCELLED', resolutionNote: reason ? `لغو: ${reason}` : 'لغو شد' },
    include: {
      reportedBy: { select: { id: true, fullName: true, username: true } },
      assignedTo: { select: { id: true, fullName: true, username: true } },
    },
  })

  if (issue.assignedToId) {
    await db.notification.create({
      data: {
        userId: issue.assignedToId,
        issueId: issue.id,
        title: `لغو شد: ${issue.ticketCode}`,
        body: `خانه‌داری این خرابی را لغو کرد. ${reason}`,
        type: 'cancelled',
      }
    }).catch(() => {})
    notifyUser(issue.assignedToId, {
      title: `لغو شد: ${issue.ticketCode}`,
      body: `خانه‌داری این خرابی را لغو کرد. ${reason}`,
      type: 'cancelled',
      issueId: issue.id,
    })
  }

  return NextResponse.json({ issue: updated })
}
