import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth('admin')
    if (session instanceof Response) return session
  } catch {
    return unauthorized()
  }

  const { waitingListId, productsIds } = await req.json()
  if (!waitingListId) return error('ID do cadastro é obrigatório')

  const entry = await prisma.waitingList.findUnique({
    where: { id: waitingListId },
    include: { affiliate: true }
  })
  if (!entry) return error('Cadastro não encontrado')

  // Cria profile do aluno (senha = CPF hasheado)
  const passwordHash = await bcrypt.hash(entry.cpf, 10)
  const profile = await prisma.profile.create({
    data: {
      email: entry.email,
      fullName: entry.fullName,
      cpf: entry.cpf,
      passwordHash,
      role: 'student'
    }
  })

  // Primeiro bind de dispositivo (via admin)
  await prisma.device.create({
    data: {
      profileId: profile.id,
      hash: `admin-${Date.now()}`,
      name: 'Aprovado pelo admin',
      bindCount: 1
    }
  })

  // Determin the IDs de produto a inscribir
  const workshop = await prisma.product.findFirst()
  const idsToEnroll = productsIds?.length > 0 ? productsIds : workshop ? [workshop.id] : []

  for (const productId of idsToEnroll) {
    const enrollment = await prisma.enrollment.create({
      data: { profileId: profile.id, productId }
    })

    // Se veio de afiliado, cria comissão
    if (entry.affiliateId) {
      const product = await prisma.product.findUnique({ where: { id: productId } })
      if (product && product.price > 0) {
        const rate = entry.affiliate.commissionPercent || 30
        await prisma.commission.create({
          data: {
            affiliateId: entry.affiliateId,
            enrollmentId: enrollment.id,
            productId,
            amount: (product.price * rate) / 100,
            ratePercent: rate,
            status: 'approved'
          }
        })
      }
    }
  }

  // Remove da waiting list
  await prisma.waitingList.delete({ where: { id: waitingListId } })

  return success({ profileId: profile.id })
} catch (e) {
  console.error('[APPROVE ERROR]', e)
  return error('Erro ao aprovar aluno')
}
