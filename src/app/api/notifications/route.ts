import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const onlyUnread = searchParams.get('unread') === '1'

  const where: any = { userId: session.id }
  if (onlyUnread) where.read = false

  const notifications = await db.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const unreadCount = await db.notification.count({
    where: { userId: session.id, read: false },
  })

  return NextResponse.json({ notifications, unreadCount })
}
