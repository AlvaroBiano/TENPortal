import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const enrollments = await prisma.enrollment.findMany({
    where: { profileId: session.id },
    include: {
      product: {
        select: { id: true, title: true, slug: true, coverImageUrl: true, productType: true }
      }
    },
    orderBy: { enrolledAt: 'desc' }
  })

  return success(enrollments)
}
