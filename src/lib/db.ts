import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// پشتیبانی از SQLite محلی و Turso برای production
// در محیط تولید: DATABASE_URL=libsql://... و TURSO_TOKEN=...
// در محیط محلی: DATABASE_URL=file:./prisma/dev.db

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || ''

  // اگر Turso استفاده می‌شه (فرمت libsql://)
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('libsql:')) {
    const authToken = process.env.TURSO_TOKEN || process.env.DATABASE_AUTH_TOKEN
    const adapter = new PrismaLibSql({
      url: databaseUrl,
      authToken,
    })
    return new PrismaClient({ adapter })
  }

  // حالت SQLite محلی
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
