import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { notifyFacility, notificationHub } from '@/lib/notification-hub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/issues?status=PENDING&scope=mine|all
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || ''
  const scope = searchParams.get('scope') || 'all'
  const role = searchParams.get('role') || ''

  const where: any = {}
  if (status) where.status = status

  if (scope === 'mine') {
    if (session.role === 'HOUSEKEEPING') where.reportedById = session.id
    else if (session.role === 'FACILITY') where.assignedToId = session.id
  }

  const issues = await db.issue.findMany({
    where,
    include: {
      reportedBy: { select: { id: true, fullName: true, username: true } },
      assignedTo: { select: { id: true, fullName: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  return NextResponse.json({ issues })
}

// POST /api/issues  - ساخت خرابی جدید توسط خانه‌داری
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })
  if (session.role !== 'HOUSEKEEPING' && session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط خانه‌داری می‌تواند خرابی ثبت کند' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { roomNumber, description, category, priority, beforePhoto } = body

    if (!roomNumber || !description || !category) {
      return NextResponse.json({ error: 'شماره اتاق، شرح و نوع خرابی الزامی است' }, { status: 400 })
    }

    // تولید کد رهگیری یکتا
    // نکته: قبلاً از count() استفاده می‌شد که وقتی خرابی‌ها حذف/آرشیو می‌شدند،
    // کد تکراری تولید می‌کرد (ارور UNIQUE constraint). حالا max کد موجود + 1 استفاده می‌شود.
    // اگه حتی با این روش به‌دلیل هم‌زمانی کد تکراری شد، تا ۵ بار کد بعدی امتحان می‌شود.
    const maxRow = await db.issue.findFirst({
      orderBy: { ticketCode: 'desc' },
      select: { ticketCode: true },
    })
    let nextNum = 1001
    if (maxRow?.ticketCode) {
      const parsed = parseInt(maxRow.ticketCode.replace('ISS-', ''), 10)
      if (!isNaN(parsed)) nextNum = parsed + 1
    }
    let issue: any = null
    let lastError: any = null
    for (let attempt = 0; attempt < 5 && !issue; attempt++) {
      const ticketCode = `ISS-${String(nextNum + attempt).padStart(4, '0')}`
      try {
        issue = await db.issue.create({
          data: {
            ticketCode,
            roomNumber: roomNumber.trim(),
            description: description.trim(),
            category,
            priority: priority || 'MEDIUM',
            beforePhoto: beforePhoto || null,
            reportedById: session.id,
            status: 'PENDING',
          },
          include: {
            reportedBy: { select: { id: true, fullName: true, username: true } },
            assignedTo: { select: { id: true, fullName: true, username: true } },
          },
        })
      } catch (e: any) {
        // اگه خطای UNIQUE constraint بود، کد بعدی را امتحان کن
        if (String(e?.message || '').includes('UNIQUE constraint failed') ||
            String(e?.code || '') === 'P2002') {
          lastError = e
          continue
        }
        throw e
      }
    }
    if (!issue) {
      throw lastError || new Error('امکان ساخت کد رهگیری یکتا نبود')
    }
    const ticketCode = issue.ticketCode

    // ساخت اعلان برای همه کاربران تاسیسات
    const facilityUsers = await db.user.findMany({
      where: { role: 'FACILITY', active: true },
      select: { id: true },
    })

    const title = `خرابی جدید: ${ticketCode}`
    const body2 = `اتاق ${issue.roomNumber} - ${issue.description.slice(0, 60)}`

    await db.notification.createMany({
      data: facilityUsers.map(u => ({
        userId: u.id,
        issueId: issue.id,
        title,
        body: body2,
        type: 'new_issue',
      })),
    })

    // ارسال بلادرنگ از طریق WebSocket
    notifyFacility({ title, body: body2, type: 'new_issue', issueId: issue.id })

    // ثبت لاگ فعالیت
    await db.activityLog.create({
      data: {
        userId: session.id,
        action: 'create_issue',
        detail: `ثبت خرابی ${ticketCode} برای اتاق ${issue.roomNumber}`,
        issueId: issue.id,
      }
    }).catch(() => {})

    return NextResponse.json({ issue }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'خطا در ثبت: ' + e.message }, { status: 500 })
  }
} 
