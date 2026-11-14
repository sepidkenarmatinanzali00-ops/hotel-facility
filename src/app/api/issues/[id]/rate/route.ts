import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notifyUser } from '@/lib/notification-hub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// تأیید وضعیت رفع توسط خانه‌داری (سه گزینه)
// FIXED         = مشکل برطرف شده است
// STILL_EXISTS  = مشکل همچنان وجود دارد
// PARTIALLY_FIXED = مشکل تا حدی برطرف شده است
const VALID_FEEDBACKS = ['FIXED', 'STILL_EXISTS', 'PARTIALLY_FIXED']

// معادل فارسی برای اعلان به تاسیسات‌کار
const FEEDBACK_FA: Record<string, string> = {
  FIXED: 'مشکل برطرف شده است',
  STILL_EXISTS: 'مشکل همچنان وجود دارد',
  PARTIALLY_FIXED: 'مشکل تا حدی برطرف شده است',
}

// برای leaderboard: امتیاز عددی متناظر با هر گزینه (از ۵)
const FEEDBACK_SCORE: Record<string, number> = {
  FIXED: 5,
  PARTIALLY_FIXED: 3,
  STILL_EXISTS: 1,
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })
  if (session.role !== 'HOUSEKEEPING' && session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط خانه‌داری می‌تواند وضعیت رفع را تأیید کند' }, { status: 403 })
  }
  const { id } = await ctx.params
  const body = await req.json()
  const feedback = String(body.resolutionFeedback || '').trim()

  if (!VALID_FEEDBACKS.includes(feedback)) {
    return NextResponse.json({ error: 'گزینه تأیید نامعتبر است' }, { status: 400 })
  }

  const issue = await db.issue.findUnique({ where: { id } })
  if (!issue) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })
  if (issue.status !== 'RESOLVED') {
    return NextResponse.json({ error: 'فقط خرابی رفع شده قابل تأیید است' }, { status: 400 })
  }
  if (issue.reportedById !== session.id && session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط ثبت‌کننده می‌تواند تأیید کند' }, { status: 403 })
  }

  // ذخیره‌ی بازخورد متنی و امتیاز عددی معادل آن (برای back-compat با leaderboard)
  const score = FEEDBACK_SCORE[feedback]
  const updated = await db.issue.update({
    where: { id },
    data: {
      resolutionFeedback: feedback,
      rating: score,
    },
    include: {
      reportedBy: { select: { id: true, fullName: true, username: true } },
      assignedTo: { select: { id: true, fullName: true, username: true } },
    },
  })

  // اعلان به تاسیسات‌کار که تأیید شد
  if (issue.assignedToId) {
    const msg = FEEDBACK_FA[feedback]
    try {
      await db.notification.create({
        data: {
          userId: issue.assignedToId,
          issueId: issue.id,
          title: `تأیید وضعیت: ${issue.ticketCode}`,
          body: `خانه‌دار تأیید کرد: ${msg}`,
          type: 'rated',
        }
      })
    } catch {}
    try {
      notifyUser(issue.assignedToId, {
        title: `تأیید وضعیت: ${issue.ticketCode}`,
        body: `خانه‌دار تأیید کرد: ${msg}`,
        type: 'rated',
        issueId: issue.id,
      })
    } catch {}
  }

  await db.activityLog.create({
    data: {
      userId: session.id,
      action: 'rate_issue',
      detail: `تأیید وضعیت رفع ${issue.ticketCode}: ${FEEDBACK_FA[feedback]}`,
      issueId: issue.id,
    }
  }).catch(() => {})

  return NextResponse.json({ issue: updated })
}
