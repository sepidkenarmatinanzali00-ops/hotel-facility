import { db } from './db'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export type Role = 'MANAGER' | 'HOUSEKEEPING' | 'FACILITY'

export interface SessionUser {
  id: string
  username: string
  fullName: string
  role: Role
}

const SESSION_COOKIE = 'hotel_session'
const SECRET = process.env.SESSION_SECRET || 'hotel-facility-management-secret-key-change-in-production-2024'

// امضای HMAC با SHA-256
function sign(payload: string): string {
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${hmac}`
}

function verifyToken(token: string): SessionUser | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const [payloadB64, sig] = parts
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('hex')
    // مقایسه زمان‌ثابت برای جلوگیری از حمله timing
    if (sig.length !== expectedSig.length) return null
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'))
    if (!payload.id || !payload.username || !payload.role) return null
    return payload as SessionUser
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(user: SessionUser): Promise<string> {
  const payload = JSON.stringify({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  })
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64')
  const token = sign(payloadB64)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return token
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
