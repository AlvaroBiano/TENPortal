import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || ''

export interface TokenPayload {
  id: string
  email: string
  role: 'student' | 'affiliate' | 'admin'
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('tenportal_token')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireAuth(requiredRole?: 'student' | 'affiliate' | 'admin') {
  const session = await getSession()
  if (!session) {
    throw new Error('UNAUTHORIZED')
  }
  if (requiredRole && session.role !== requiredRole && session.role !== 'admin') {
    throw new Error('FORBIDDEN')
  }
  return session
}

export function generateDeviceHash(userAgent: string, ip: string): string {
  // Fallback simples — em produção usar FingerprintJS no cliente
  const data = `${userAgent}:${ip}`
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}
