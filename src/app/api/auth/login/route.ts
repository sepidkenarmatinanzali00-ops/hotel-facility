import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, hashPassword, verifyPassword } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'نام کاربری و رمز عبور الزامی است' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { username: username.trim() } })
    if (!user || !user.active) {
      return NextResponse.json({ error: 'نام کاربری یا رمز عبور نادرست است' }, { status: 401 })
    }

    const ok = await verifyPassword(password, user.password)
    if (!ok) {
      return NextResponse.json({ error: 'نام کاربری یا رمز عبور نادرست است' }, { status: 401 })
    }

    await createSession({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as any,
    })

    // ثبت لاگ ورود
    await db.activityLog.create({
      data: { userId: user.id, action: 'login', detail: 'ورود به سیستم' }
    }).catch(() => {})

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'خطای سرور: ' + e.message }, { status: 500 })
  }
}
