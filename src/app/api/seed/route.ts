import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import type { Role } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'HOUSEKEEPING',
  "phone" TEXT,
  "active" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Room" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "number" TEXT NOT NULL UNIQUE,
  "floor" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "active" INTEGER NOT NULL DEFAULT 1,
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
  "resolutionFeedback" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  "read" INTEGER NOT NULL DEFAULT 0,
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
  const logs: string[] = []
  try {
    const url = process.env.DATABASE_URL || ''
    const authToken = process.env.TURSO_TOKEN || process.env.DATABASE_AUTH_TOKEN

    logs.push(`DB URL starts with: ${url.substring(0, 15)}...`)

    if (url.startsWith('libsql://') || url.startsWith('libsql:')) {
      logs.push('Using libsql client to create tables...')
      const client = createClient({ url, authToken })

      const statements = CREATE_TABLES_SQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const stmt of statements) {
        try {
          await client.execute(stmt)
        } catch (e: any) {
          if (!e.message?.includes('already exists')) {
            logs.push(`SQL warn: ${e.message?.substring(0, 100)}`)
          }
        }
      }
      logs.push(`Tables created: ${statements.length}`)
      client.close()
    } else {
      logs.push('Using local SQLite - Prisma manages schema')
    }

    await new Promise(r => setTimeout(r, 500))

    let userCount = 0
    try {
      userCount = await db.user.count()
      logs.push(`User count: ${userCount}`)
    } catch (e: any) {
      logs.push(`Count error: ${e.message?.substring(0, 100)}`)
    }

    if (userCount > 0) {
      return NextResponse.json({
        ok: true,
        message: 'دیتابیس قبلاً مقداردهی شده',
        userCount,
        logs,
      })
    }

    const pwd = await hashPassword('123456')

    const users: { username: string; fullName: string; role: Role; phone: string }[] = [
      { username: 'manager', fullName: 'مدیر هتل', role: 'MANAGER', phone: '0912000000' },
      { username: 'housekeeping1', fullName: 'مریم احمدی', role: 'HOUSEKEEPING', phone: '09121111111' },
      { username: 'housekeeping2', fullName: 'فاطمه رضایی', role: 'HOUSEKEEPING', phone: '09122222222' },
      { username: 'facility1', fullName: 'علی محمدی', role: 'FACILITY', phone: '09123333333' },
      { username: 'facility2', fullName: 'حسین کریمی', role: 'FACILITY', phone: '09124444444' },
      { username: 'facility3', fullName: 'رضا نوری', role: 'FACILITY', phone: '09125555555' },
    ]

    for (const u of users) {
      try {
        await db.user.create({ data: { ...u, password: pwd } })
      } catch (e: any) {
        logs.push(`User ${u.username} create error: ${e.message?.substring(0, 80)}`)
      }
    }

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
      try {
        await db.room.create({ data: r })
      } catch (e: any) {
        logs.push(`Room ${r.number} create error: ${e.message?.substring(0, 80)}`)
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'دیتابیس با موفقیت ساخته و مقداردهی اولیه شد',
      users: users.length,
      rooms: rooms.length,
      logs,
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'خطا در seed: ' + e.message, logs },
      { status: 500 }
    )
  }
}
