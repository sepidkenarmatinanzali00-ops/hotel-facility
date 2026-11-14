import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, hashPassword } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })
  if (session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط مدیر' }, { status: 403 })
  }
  const { id } = await ctx.params
  const body = await req.json()
  const { fullName, role, phone, active, password } = body

  const data: any = {}
  if (fullName !== undefined) data.fullName = fullName
  if (role !== undefined) data.role = role
  if (phone !== undefined) data.phone = phone || null
  if (active !== undefined) data.active = !!active
  if (password) data.password = await hashPassword(password)

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, username: true, fullName: true, role: true, phone: true, active: true, createdAt: true },
  })
  return NextResponse.json({ user })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 })
  if (session.role !== 'MANAGER') {
    return NextResponse.json({ error: 'فقط مدیر' }, { status: 403 })
  }
  const { id } = await ctx.params
  if (id === session.id) {
    return NextResponse.json({ error: 'نمی‌توانید خودتان را حذف کنید' }, { status: 400 })
  }
  // غیرفعال کردن به جای حذف واقعی (آرشیو)
  const user = await db.user.update({
    where: { id },
    data: { active: false },
    select: { id: true, fullName: true, active: true },
  })
  return NextResponse.json({ user })
}
