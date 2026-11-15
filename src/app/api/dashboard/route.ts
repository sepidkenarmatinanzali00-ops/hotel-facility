import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// داشبورد مدیریتی - KPI و آمار
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })
  if (session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط مدیر' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')

  const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const to = toStr ? new Date(toStr) : new Date()

  const dateFilter = { createdAt: { gte: from, lte: to } }

  const [total, pending, inProgress, resolved, cancelled] = await Promise.all([
    db.issue.count({ where: dateFilter }),
    db.issue.count({ where: { ...dateFilter, status: 'PENDING' } }),
    db.issue.count({ where: { ...dateFilter, status: 'IN_PROGRESS' } }),
    db.issue.count({ where: { ...dateFilter, status: 'RESOLVED' } }),
    db.issue.count({ where: { ...dateFilter, status: 'CANCELLED' } }),
  ])

  // توزیع بر اساس دسته‌بندی
  const byCategoryRaw = await db.issue.groupBy({
    by: ['category'],
    where: dateFilter,
    _count: true,
  })

  // توزیع بر اساس اولویت
  const byPriorityRaw = await db.issue.groupBy({
    by: ['priority'],
    where: dateFilter,
    _count: true,
  })

  // تعداد کاربران فعال هر نقش
  const [managers, housekeeping, facility] = await Promise.all([
    db.user.count({ where: { role: 'MANAGER', active: true } }),
    db.user.count({ where: { role: 'HOUSEKEEPING', active: true } }),
    db.user.count({ where: { role: 'FACILITY', active: true } }),
  ])

 // میانگین زمان رفع
const resolvedIssues = await db.issue.findMany({
  where: { ...dateFilter, status: 'RESOLVED', resolutionMinutes: { not: null } },
  select: { resolutionMinutes: true, assignedToId: true, rating: true, resolutionFeedback: true },
})
const avgResolution = resolvedIssues.length
  ? Math.round(resolvedIssues.reduce((s, i) => s + (i.resolutionMinutes ?? 0), 0) / resolvedIssues.length)
  : 0
// میانگین امتیاز بر اساس تأیید خانه‌داری
const ratedByRating = resolvedIssues.filter(i => i.rating != null)
const ratedByFeedback = resolvedIssues.filter(i => i.rating == null && i.resolutionFeedback)
let avgRating = 0
let ratedCount = 0
if (ratedByRating.length) {
  avgRating = Number((ratedByRating.reduce((s, i) => s + (i.rating ?? 0), 0) / ratedByRating.length).toFixed(2))
  ratedCount = ratedByRating.length
}
if (ratedByFeedback.length) {
  const fbScores: number[] = ratedByFeedback.map(i => {
    if (i.resolutionFeedback === 'FIXED') return 5
    if (i.resolutionFeedback === 'PARTIALLY_FIXED') return 3
    if (i.resolutionFeedback === 'STILL_EXISTS') return 1
    return 0
  })
  const sum: number = avgRating * ratedCount + fbScores.reduce((a, b) => a + b, 0)
  ratedCount += ratedByFeedback.length
  avgRating = ratedCount > 0 ? Number((sum / ratedCount).toFixed(2)) : 0
}

  // نمودار روزانه (14 روز اخیر)
  const days: { date: string; total: number; resolved: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d0 = new Date()
    d0.setHours(0, 0, 0, 0)
    d0.setDate(d0.getDate() - i)
    const d1 = new Date(d0)
    d1.setDate(d1.getDate() + 1)
    const [t, r] = await Promise.all([
      db.issue.count({ where: { createdAt: { gte: d0, lt: d1 } } }),
      db.issue.count({ where: { resolvedAt: { gte: d0, lt: d1 } } }),
    ])
    days.push({ date: d0.toISOString().slice(5, 10), total: t, resolved: r })
  }

  // توزیع بر اساس اتاق (10 اتاق پر خرابی)
  const byRoomRaw = await db.issue.groupBy({
    by: ['roomNumber'],
    where: dateFilter,
    _count: true,
    orderBy: { _count: { roomNumber: 'desc' } },
    take: 10,
  })

  return NextResponse.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    summary: {
      total, pending, inProgress, resolved, cancelled,
      avgResolutionMinutes: avgResolution,
      avgRating,
      users: { managers, housekeeping, facility },
    },
    charts: {
      byCategory: byCategoryRaw.map(c => ({ label: c.category, value: c._count })),
      byPriority: byPriorityRaw.map(c => ({ label: c.priority, value: c._count })),
      byRoom: byRoomRaw.map(c => ({ label: c.roomNumber, value: c._count })),
      daily: days,
    },
  })
}
