import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// آرشیو کامل با فیلتر - فقط مدیر و خانه‌داری (خانه‌داری فقط گزارش‌های خودش)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || ''
  const category = searchParams.get('category') || ''
  const room = searchParams.get('room') || ''
  const assignedTo = searchParams.get('assignedTo') || ''
  const q = searchParams.get('q') || ''
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: any = {}
  if (status) where.status = status
  if (category) where.category = category
  if (room) where.roomNumber = { contains: room }
  if (assignedTo) where.assignedToId = assignedTo
  if (q) {
    where.OR = [
      { description: { contains: q } },
      { ticketCode: { contains: q } },
      { resolutionNote: { contains: q } },
    ]
  }
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }

  if (session.role === 'HOUSEKEEPING') where.reportedById = session.id
  if (session.role === 'FACILITY') where.assignedToId = session.id

  const issues = await db.issue.findMany({
    where,
    include: {
      reportedBy: { select: { id: true, fullName: true, username: true } },
      assignedTo: { select: { id: true, fullName: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  })

  return NextResponse.json({ issues, count: issues.length })
}
