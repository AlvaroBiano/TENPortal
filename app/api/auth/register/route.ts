import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { error, success } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  try {
    const { email, fullName, cpf, productId, referralCode } = await req.json()

    if (!email || !fullName || !cpf) {
      return error('Email, nome completo e CPF são obrigatórios')
    }

    const existing = await prisma.waitingList.findFirst({
      where: { OR: [{ email }, { cpf }] }
    })

    if (existing) {
      return error('Este email ou CPF já possui um cadastro pendente')
    }

    const cpfHash = await bcrypt.hash(cpf, 10)

    let affiliateId: string | null = null
    if (referralCode) {
      const affiliate = await prisma.affiliate.findUnique({ where: { referralCode } })
      affiliateId = affiliate?.id || null
    }

    await prisma.waitingList.create({
      data: {
        email,
        fullName,
        cpf,
        cpfHash,
        productId: productId || null,
        affiliateId,
        referralCode: referralCode || null
      }
    })

    return success({ message: 'Cadastro realizado! Aguarde a aprovação.' })
  } catch (e) {
    console.error('[REGISTER ERROR]', e)
    return error('Erro ao processar cadastro')
  }
}
