import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// SQL برای ساخت جدول‌ها در Turso/SQLite
const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'HOUSEKEEPING',
  "phone" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Room" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "number" TEXT NOT NULL UNIQUE,
  "floor" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Issue" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "ticketCode" TEXT NOT NULL UNIQUE,
  "roomNumber" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "beforePhoto" TEXT,
  "afterPhoto" TEXT,
  "reportedById" TEXT NOT NULL,
  "reportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedToId" TEXT,
  "assignedAt" DATETIME,
  "resolvedAt" DATETIME,
  "resolutionMinutes" INTEGER,
  "resolutionNote" TEXT,
  "rating" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("reportedById") REFERENCES "User"("id"),
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "issueId" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("issueId") REFERENCES "Issue"("id")
);

CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "detail" TEXT,
  "issueId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id")
);

CREATE INDEX IF NOT EXISTS "Issue_status_idx" ON "Issue"("status");
CREATE INDEX IF NOT EXISTS "Issue_assignedToId_idx" ON "Issue"("assignedToId");
CREATE INDEX IF NOT EXISTS "Issue_reportedById_idx" ON "Issue"("reportedById");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
`

export async function GET() {
  try {
    // ساخت جدول‌ها با raw SQL
    const statements = CREATE_TABLES_SQL.split(';').map(s => s.trim()).filter(s => s.length > 0)
    for (const stmt of statements) {
      try {
        await db.$executeRawUnsafe(stmt + ';')
      } catch (e: any) {
        if (!e.message?.includes('already exists')) {
          console.log('SQL warning:', e.message)
        }
      }
    }

    // بررسی کاربران موجود
    let userCount = 0
    try {
      userCount = await db.user.count()
    } catch {}

    if (userCount > 0) {
      return NextResponse.json({ ok: true, message: 'دیتابیس قبلاً مقداردهی شده', userCount })
    }

    // کاربران پیش‌فرض
    const pwd = await hashPassword('123456')
    await db.user.create({ data: { username: 'manager', password: pwd, fullName: 'مدیر هتل', role: 'MANAGER', phone: '0912000000' } })
    await db.user.create({ data: { username: 'housekeeping1', password: pwd, fullName: 'مریم احمدی', role: 'HOUSEKEEPING', phone: '09121111111' } })
    await db.user.create({ data: { username: 'housekeeping2', password: pwd, fullName: 'فاطمه رضایی', role: 'HOUSEKEEPING', phone: '09122222222' } })
    await db.user.create({ data: { username: 'facility1', password: pwd, fullName: 'علی محمدی', role: 'FACILITY', phone: '09123333333' } })
    await db.user.create({ data: { username: 'facility2', password: pwd, fullName: 'حسین کریمی', role: 'FACILITY', phone: '09124444444' } })
    await db.user.create({ data: { username: 'facility3', password: pwd, fullName: 'رضا نوری', role: 'FACILITY', phone: '09125555555' } })

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
      try { await db.room.create({ data: r }) } catch {}
    }

    return NextResponse.json({ ok: true, message: 'دیتابیس با موفقیت ساخته و مقداردهی اولیه شد', users: 6, rooms: 10 })
  } catch (e: any) {
    return NextResponse.json({ error: 'خطا در seed: ' + e.message }, { status: 500 })
  }
}
