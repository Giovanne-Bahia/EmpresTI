import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, describe, expect, it } from 'vitest'
import { consumeLoginAttempts } from '@/server/services/auth.service'

const url = process.env.EMPRESTI_TEST_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Integração exige Postgres local isolado.')
const db = new PrismaClient({ datasourceUrl: url })
afterAll(() => db.$disconnect())

describe('autenticação com Postgres real', () => {
  it('CA-05: consome atomicamente cinco tentativas por e-mail sob concorrência', async () => {
    const tenant = await db.tenant.create({ data: { slug: randomUUID() } })
    const outcomes = await Promise.allSettled(
      Array.from({ length: 12 }, () =>
        consumeLoginAttempts(db, tenant.id, 'user@test.local', '127.0.0.1'),
      ),
    )
    expect(
      outcomes.filter((outcome) => outcome.status === 'fulfilled'),
    ).toHaveLength(5)
    expect(
      outcomes.filter((outcome) => outcome.status === 'rejected'),
    ).toHaveLength(7)
    await db.loginRateLimit.updateMany({
      where: { tenantId: tenant.id },
      data: { windowStartedAt: new Date(Date.now() - 16 * 60 * 1000) },
    })
    await expect(
      consumeLoginAttempts(db, tenant.id, 'user@test.local', '127.0.0.1'),
    ).resolves.toBeUndefined()
  })
  it('CA-05: aplica limite de trinta tentativas por IP entre e-mails diferentes', async () => {
    const tenant = await db.tenant.create({ data: { slug: randomUUID() } })
    for (let i = 0; i < 30; i++)
      await consumeLoginAttempts(db, tenant.id, `${i}@test.local`, '127.0.0.2')
    await expect(
      consumeLoginAttempts(db, tenant.id, 'last@test.local', '127.0.0.2'),
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' })
  })
  it('CA-06: mantém a auditoria append-only', async () => {
    const tenant = await db.tenant.findUniqueOrThrow({
      where: { slug: 'suporte_ti' },
    })
    const event = await db.auditEvent.create({
      data: {
        tenantId: tenant.id,
        actorId: randomUUID(),
        action: 'test',
        resourceType: 'test',
        resourceId: randomUUID(),
      },
    })
    await expect(
      db.auditEvent.update({
        where: { id: event.id },
        data: { action: 'changed' },
      }),
    ).rejects.toThrow('append-only')
    await expect(
      db.auditEvent.delete({ where: { id: event.id } }),
    ).rejects.toThrow('append-only')
    await expect(
      db.$executeRawUnsafe('TRUNCATE public.audit_events'),
    ).rejects.toThrow('append-only')
  })
  it('CA-06: protege todas as tabelas por RLS e deixa o histórico técnico protegido', async () => {
    const rows = await db.$queryRaw<
      Array<{ relname: string; relrowsecurity: boolean }>
    >`SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r'`
    expect(rows).toHaveLength(8)
    expect(rows.every((row) => row.relrowsecurity)).toBe(true)
  })
})
