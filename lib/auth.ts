import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import type { Profile } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-replace-in-production'

export interface TokenPayload {
  id: string
  email: string
  role: 'student' | 'affiliate' | 'admin'
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' } as jwt.SignOptions)
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
