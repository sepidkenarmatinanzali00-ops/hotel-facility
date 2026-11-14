import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// جدول امتیازات نیروهای تاسیسات بر اساس سرعت و کیفیت رفع
// فرمول امتیاز: 100 - (resolutionMinutes / maxResolutionMinutes) * 50 + (avgRating - 3) * 10
// یعنی: سریع‌تر = امتیاز بالاتر، امتیاز خانه‌داری بالاتر = امتیاز بیشتر
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = Number(searchParams.get('days') || '30')
  const since = new Date(Date.now() - days * 24 * 3600 * 1000)

  const facilityUsers = await db.user.findMany({
    where: { role: 'FACILITY', active: true },
    select: { id: true, fullName: true, username: true, phone: true },
  })

  const issues = await db.issue.findMany({
    where: {
      status: 'RESOLVED',
      resolvedAt: { gte: since },
      assignedToId: { not: null },
      resolutionMinutes: { not: null },
    },
    select: {
      assignedToId: true,
      resolutionMinutes: true,
      rating: true,
      priority: true,
      ticketCode: true,
    },
  })

  // پیدا کردن بیشترین زمان رفع برای نرمال‌سازی
  const maxMinutes = Math.max(1, ...issues.map(i => i.resolutionMinutes ?? 0))

  // گروه‌بندی بر اساس کاربر
  type Row = {
    userId: string
    fullName: string
    username: string
    phone: string | null
    resolvedCount: number
    avgMinutes: number
    minMinutes: number
    maxMinutesUsed: number
    avgRating: number
    score: number
    issues: { ticketCode: string; minutes: number; rating: number | null; priority: string }[]
  }

  const map = new Map<string, Row>()
  for (const u of facilityUsers) {
    map.set(u.id, {
      userId: u.id,
      fullName: u.fullName,
      username: u.username,
      phone: u.phone,
      resolvedCount: 0,
      avgMinutes: 0,
      minMinutes: 0,
      maxMinutesUsed: 0,
      avgRating: 0,
      score: 0,
      issues: [],
    })
  }

  for (const i of issues) {
    if (!i.assignedToId) continue
    const row = map.get(i.assignedToId)
    if (!row) continue
    row.resolvedCount++
    row.issues.push({
      ticketCode: i.ticketCode,
      minutes: i.resolutionMinutes ?? 0,
      rating: i.rating,
      priority: i.priority,
    })
  }

  for (const row of map.values()) {
    if (row.resolvedCount === 0) continue
    const minutes = row.issues.map(i => i.minutes)
    row.avgMinutes = Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length)
    row.minMinutes = Math.min(...minutes)
    row.maxMinutesUsed = Math.max(...minutes)
    const rated = row.issues.filter(i => i.rating)
    if (rated.length) {
      row.avgRating = Number((rated.reduce((s, i) => s + (i.rating ?? 0), 0) / rated.length).toFixed(2))
    }

    // محاسبه امتیاز ترکیبی (0-100)
    // بخش سرعت: 60 امتیاز - هرچه سریع‌تر، بیشتر
    const avgSpeedRatio = 1 - (row.avgMinutes / maxMinutes) // 0 تا 1
    const speedScore = avgSpeedRatio * 60

    // بخش کیفیت: 25 امتیاز - میانگین امتیاز / 5 * 25
    const qualityScore = (row.avgRating / 5) * 25

    // بخش حجم کار: 15 امتیاز - تعداد رفع شده نرمال‌سازی
    const maxCount = Math.max(...Array.from(map.values()).map(r => r.resolvedCount), 1)
    const volumeScore = (row.resolvedCount / maxCount) * 15

    row.score = Number((speedScore + qualityScore + volumeScore).toFixed(1))
  }

  const leaderboard = Array.from(map.values())
    .filter(r => r.resolvedCount > 0)
    .sort((a, b) => b.score - a.score)

  return NextResponse.json({
    days,
    since: since.toISOString(),
    maxResolutionMinutes: maxMinutes,
    leaderboard,
  })
}
