import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, hashPassword } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })
  if (session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط مدیر' }, { status: 403 })
  }
  const users = await db.user.findMany({
    select: { id: true, username: true, fullName: true, role: true, phone: true, active: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })
  if (session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط مدیر' }, { status: 403 })
  }

  const body = await req.json()
  const { username, password, fullName, role, phone } = body
  if (!username || !password || !fullName || !role) {
    return NextResponse.json({ error: 'تمام فیلدها الزامی است' }, { status: 400 })
  }
  if (!['MANAGER', 'HOUSEKEEPING', 'FACILITY'].includes(role)) {
    return NextResponse.json({ error: 'نقش نامعتبر' }, { status: 400 })
  }

  const exists = await db.user.findUnique({ where: { username: username.trim() } })
  if (exists) return NextResponse.json({ error: 'این نام کاربری قبلاً ثبت شده' }, { status: 400 })

  const hashed = await hashPassword(password)
  const user = await db.user.create({
    data: {
      username: username.trim(),
      password: hashed,
      fullName: fullName.trim(),
      role,
      phone: phone?.trim() || null,
    },
    select: { id: true, username: true, fullName: true, role: true, phone: true, active: true, createdAt: true },
  })
  return NextResponse.json({ user }, { status: 201 })
}
