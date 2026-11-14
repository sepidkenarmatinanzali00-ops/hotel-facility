import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// امتیازدهی خانه‌داری به کیفیت رفع
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })
  if (session.role !== 'HOUSEKEEPING' && session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط خانه‌داری می‌تواند امتیاز دهد' }, { status: 403 })
  }
  const { id } = await ctx.params
  const body = await req.json()
  const rating = Number(body.rating)
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'امتیاز باید بین 1 تا 5 باشد' }, { status: 400 })
  }

  const issue = await db.issue.findUnique({ where: { id } })
  if (!issue) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 })
  if (issue.status !== 'RESOLVED') {
    return NextResponse.json({ error: 'فقط خرابی رفع شده قابل امتیازدهی است' }, { status: 400 })
  }
  if (issue.reportedById !== session.id && session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط ثبت‌کننده می‌تواند امتیاز دهد' }, { status: 403 })
  }

  const updated = await db.issue.update({
    where: { id },
    data: { rating },
    include: {
      reportedBy: { select: { id: true, fullName: true, username: true } },
      assignedTo: { select: { id: true, fullName: true, username: true } },
    },
  })

  return NextResponse.json({ issue: updated })
}
