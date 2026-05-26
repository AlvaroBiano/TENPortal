import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken, generateDeviceHash } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  try {
    const { email, password, deviceHash } = await req.json()

    if (!email || !password) {
      return error('Email e senha são obrigatórios')
    }

    const profile = await prisma.profile.findUnique({ where: { email } })
    if (!profile) {
      return unauthorized('Email ou senha incorretos')
    }

    const valid = await bcrypt.compare(password, profile.passwordHash)
    if (!valid) {
      return unauthorized('Email ou senha incorretos')
    }

    // Verifica dispositivo (se fornecido)
    if (deviceHash) {
      const existingDevice = await prisma.device.findUnique({
        where: { profileId: profile.id, hash: deviceHash }
      })

      if (!existingDevice) {
        const deviceCount = await prisma.device.count({ where: { profileId: profile.id, isActive: true } })
        if (deviceCount >= 2) {
          return unauthorized('Limite de dispositivos atingido. Contacte o administrador.')
        }
        await prisma.device.create({
          data: {
            profileId: profile.id,
            hash: deviceHash,
            name: req.headers.get('user-agent') || 'Unknown'
          }
        })
      } else {
        await prisma.device.update({
          where: { id: existingDevice.id },
          data: { lastUsedAt: new Date() }
        })
      }
    }

    const token = await signToken({
      id: profile.id,
      email: profile.email,
      role: profile.role as 'student' | 'affiliate' | 'admin'
    })

    const res = success({
      user: { id: profile.id, email: profile.email, fullName: profile.fullName, role: profile.role }
    })

    res.cookies.set('tenportal_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })

    return res
  } catch (e) {
    console.error('[LOGIN ERROR]', e)
    return error('Erro ao fazer login')
  }
}
