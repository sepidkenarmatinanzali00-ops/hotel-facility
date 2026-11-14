import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })
  const rooms = await db.room.findMany({
    where: { active: true },
    orderBy: [{ floor: 'asc' }, { number: 'asc' }],
  })
  return NextResponse.json({ rooms })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })
  if (session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط مدیر' }, { status: 403 })
  }
  const body = await req.json()
  const { number, floor, type } = body
  if (!number || floor === undefined || !type) {
    return NextResponse.json({ error: 'تمام فیلدها الزامی است' }, { status: 400 })
  }
  const exists = await db.room.findUnique({ where: { number: number.trim() } })
  if (exists) return NextResponse.json({ error: 'این اتاق قبلاً ثبت شده' }, { status: 400 })

  const room = await db.room.create({
    data: { number: number.trim(), floor: Number(floor), type: type.trim() },
  })
  return NextResponse.json({ room }, { status: 201 })
}
