import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound } from '@/lib/api-response'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()

  const { slug } = await params

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { sortOrder: 'asc' },
        include: {
          lessons: { orderBy: { sortOrder: 'asc' } }
        }
      }
    }
  })

  if (!product) return notFound('Produto não encontrado')

  // Verifica se o aluno tem acesso
  const enrollment = await prisma.enrollment.findUnique({
    where: { profileId_productId: { profileId: session.id, productId: product.id } }
  })

  if (!enrollment) return unauthorized('Você não tem acesso a este produto')

  // Pega progresso
  const progress = await prisma.progress.findMany({
    where: { enrollmentId: enrollment.id }
  })

  const completedLessonIds = new Set(progress.filter((p: { completed: boolean }) => p.completed).map((p: { lessonId: string }) => p.lessonId))

  return success({
    product,
    progressPercent: enrollment.progressPercent,
    lastLessonId: enrollment.lastLessonId,
    completedLessonIds: Array.from(completedLessonIds)
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()

  const { slug } = await params
  const body = await req.json()
  const { lessonId, completed } = body

  const product = await prisma.product.findUnique({ where: { slug } })
  if (!product) return notFound()

  const enrollment = await prisma.enrollment.findUnique({
    where: { profileId_productId: { profileId: session.id, productId: product.id } }
  })
  if (!enrollment) return unauthorized()

  if (lessonId) {
    await prisma.progress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      create: { enrollmentId: enrollment.id, lessonId, completed: completed || false },
      update: { completed: completed || false, completedAt: completed ? new Date() : null }
    })

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        lastLessonId: lessonId,
        progressPercent: enrollment.progressPercent // recalculated by trigger
      }
    })
  }

  return success({ ok: true })
}
