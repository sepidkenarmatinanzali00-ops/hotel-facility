import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/seed - seed اولیه اگه دیتابیس خالی باشه
// این endpoint فقط در صورتی اجرا می‌شه که کاربری وجود نداشته باشه
export async function GET() {
  try {
    const userCount = await db.user.count()
    if (userCount > 0) {
      return NextResponse.json({
        ok: true,
        message: 'دیتابیس قبلاً مقداردهی شده',
        userCount,
      })
    }

    // کاربران پیش‌فرض
    const pwd = await hashPassword('123456')
    const manager = await db.user.create({
      data: {
        username: 'manager',
        password: pwd,
        fullName: 'مدیر هتل',
        role: 'MANAGER',
        phone: '0912000000',
      },
    })

    const hk1 = await db.user.create({
      data: {
        username: 'housekeeping1',
        password: pwd,
        fullName: 'مریم احمدی',
        role: 'HOUSEKEEPING',
        phone: '09121111111',
      },
    })

    const hk2 = await db.user.create({
      data: {
        username: 'housekeeping2',
        password: pwd,
        fullName: 'فاطمه رضایی',
        role: 'HOUSEKEEPING',
        phone: '09122222222',
      },
    })

    const f1 = await db.user.create({
      data: {
        username: 'facility1',
        password: pwd,
        fullName: 'علی محمدی',
        role: 'FACILITY',
        phone: '09123333333',
      },
    })

    const f2 = await db.user.create({
      data: {
        username: 'facility2',
        password: pwd,
        fullName: 'حسین کریمی',
        role: 'FACILITY',
        phone: '09124444444',
      },
    })

    const f3 = await db.user.create({
      data: {
        username: 'facility3',
        password: pwd,
        fullName: 'رضا نوری',
        role: 'FACILITY',
        phone: '09125555555',
      },
    })

    // اتاق‌های نمونه
    const rooms = [
      { number: '101', floor: 1, type: 'استاندارد' },
      { number: '102', floor: 1, type: 'استاندارد' },
      { number: '103', floor: 1, type: 'دوبل' },
      { number: '201', floor: 2, type: 'سوئیت' },
      { number: '202', floor: 2, type: 'استاندارد' },
      { number: '203', floor: 2, type: 'سوئیت' },
      { number: '301', floor: 3, type: 'سوئیت جونیور' },
      { number: '302', floor: 3, type: 'استاندارد' },
      { number: '303', floor: 3, type: 'پرزیدنتال' },
      { number: '401', floor: 4, type: 'سوئیت پرزیدنتال' },
    ]
    for (const r of rooms) {
      await db.room.create({ data: r })
    }

    return NextResponse.json({
      ok: true,
      message: 'دیتابیس با موفقیت مقداردهی اولیه شد',
      users: 6,
      rooms: 10,
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'خطا در seed: ' + e.message }, { status: 500 })
  }
}
