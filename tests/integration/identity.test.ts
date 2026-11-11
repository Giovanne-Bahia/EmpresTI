import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, describe, expect, it } from 'vitest'
import { resolveIdentity } from '@/server/services/auth.service'

const url = process.env.EMPRESTI_TEST_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Integração exige Postgres local isolado.')
const db = new PrismaClient({ datasourceUrl: url })
afterAll(() => db.$disconnect())

function authenticatedUser(id: string) {
  return {
    getUser: async () => ({
      data: {
        user: {
          id,
          email: 'identity@example.test',
          aud: 'authenticated',
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    }),
  }
}

describe('identidade com memberships em Postgres real', () => {
  it('CA-03: vínculo somente em outro tenant não concede acesso ao suporte_ti', async () => {
    const userId = randomUUID()
    const other = await db.tenant.create({ data: { slug: randomUUID() } })
    await db.membership.create({
      data: { tenantId: other.id, userId, role: 'admin' },
    })
    await expect(
      resolveIdentity(db, authenticatedUser(userId)),
    ).resolves.toBeNull()
  })

  it('CA-03: papel de admin em outro tenant não eleva colaborador do suporte_ti', async () => {
    const userId = randomUUID()
    const current = await db.tenant.findUniqueOrThrow({
      where: { slug: 'suporte_ti' },
    })
    const other = await db.tenant.create({ data: { slug: randomUUID() } })
    await db.membership.createMany({
      data: [
        { tenantId: current.id, userId, role: 'colaborador' },
        { tenantId: other.id, userId, role: 'admin' },
      ],
    })
    await expect(
      resolveIdentity(db, authenticatedUser(userId)),
    ).resolves.toMatchObject({
      tenantId: current.id,
      userId,
      role: 'colaborador',
    })
  })
})
