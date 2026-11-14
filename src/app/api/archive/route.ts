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

// حذف آرشیو - فقط مدیر می‌تواند
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })
  if (session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط مدیر می‌تواند آرشیو را حذف کند' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  // حالت ۱: حذف یک رکورد خاص
  if (id) {
    const issue = await db.issue.findUnique({ where: { id } })
    if (!issue) return NextResponse.json({ error: 'رکورد یافت نشد' }, { status: 404 })

    await db.notification.deleteMany({ where: { issueId: id } })
    await db.activityLog.deleteMany({ where: { issueId: id } })
    await db.issue.delete({ where: { id } })

    await db.activityLog.create({
      data: {
        userId: session.id,
        action: 'ARCHIVE_DELETE',
        detail: `حذف رکورد آرشیو ${issue.ticketCode}`,
        issueId: null,
      },
    })

    return NextResponse.json({ ok: true, message: 'رکورد با موفقیت حذف شد' })
  }

  // حالت ۲: حذف گروهی بر اساس فیلترها
  const status = searchParams.get('status') || ''
  const category = searchParams.get('category') || ''
  const room = searchParams.get('room') || ''
  const q = searchParams.get('q') || ''
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: any = {}
  if (status) where.status = status
  if (category) where.category = category
  if (room) where.roomNumber = { contains: room }
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

  where.status = { in: ['RESOLVED', 'CANCELLED'] }
  if (status) where.status = status

  const issuesToDelete = await db.issue.findMany({ where, select: { id: true } })
  const ids = issuesToDelete.map(i => i.id)

  if (ids.length === 0) {
    return NextResponse.json({ ok: true, message: 'هیچ رکوردی برای حذف یافت نشد', count: 0 })
  }

  await db.notification.deleteMany({ where: { issueId: { in: ids } } })
  await db.activityLog.deleteMany({ where: { issueId: { in: ids } } })
  const result = await db.issue.deleteMany({ where: { id: { in: ids } } })

  await db.activityLog.create({
    data: {
      userId: session.id,
      action: 'ARCHIVE_BULK_DELETE',
      detail: `حذف گروهی ${result.count} رکورد از آرشیو`,
      issueId: null,
    },
  })

  return NextResponse.json({
    ok: true,
    message: `${result.count} رکورد با موفقیت حذف شد`,
    count: result.count,
  })
}
