import { randomUUID } from 'node:crypto'
import { PrismaClient, type Equipment } from '@prisma/client'
import { afterAll, describe, expect, it } from 'vitest'
import { tenantRepository } from '@/server/services/tenant.repository'
import {
  requestLoan,
  loanSummary,
  myLoans,
} from '@/server/services/loan.service'

const url = process.env.EMPRESTI_TEST_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Somente Postgres local isolado.')
const db = new PrismaClient({ datasourceUrl: url })
afterAll(() => db.$disconnect())
async function fixture() {
  const tenant = await db.tenant.create({ data: { slug: randomUUID() } })
  const users = [randomUUID(), randomUUID()]
  await db.membership.createMany({
    data: users.map((userId) => ({
      tenantId: tenant.id,
      userId,
      role: 'colaborador' as const,
    })),
  })
  const items: Equipment[] = []
  for (let i = 0; i < 5; i++) {
    // Metadados sintéticos exclusivos de testes locais; não integram o seed real.
    items.push(
      await db.equipment.create({
        data: {
          tenantId: tenant.id,
          patrimonio: randomUUID(),
          name: 'Notebook de teste',
          category: 'notebook',
          condition: i === 4 ? 'manutencao' : 'disponivel',
          searchText: 'notebook teste',
          imagePath: `test/${i}.jpg`,
          imagePhotoId: String(i),
          imageSourceUrl: 'https://pixabay.com/',
          imageAuthor: 'fixture',
          imageAuthorUrl: 'https://pixabay.com/',
          imageLicenseUrl: 'https://pixabay.com/service/license-summary/',
          imageSha256: String(i).padStart(64, '0'),
        },
      }),
    )
  }
  const repo = tenantRepository(db, tenant.id)
  const borrow = (index: number, user = users[0], requestId = randomUUID()) =>
    requestLoan(repo, user, '127.0.0.1', {
      patrimonio: items[index].patrimonio,
      requestId,
    })
  return { tenant, users, items, repo, borrow }
}
describe('empréstimos em Postgres real', () => {
  it('CA-SE-03/08: prazo de 336h, idempotência e auditoria atômica', async () => {
    const f = await fixture()
    const requestId = randomUUID()
    const first = await f.borrow(0, f.users[0], requestId)
    const replay = await f.borrow(0, f.users[0], requestId)
    expect(replay.id).toBe(first.id)
    expect(first.dueAt.getTime() - first.borrowedAt.getTime()).toBe(
      336 * 3600000,
    )
    expect(
      await db.auditEvent.count({
        where: { tenantId: f.tenant.id, action: 'loan.request' },
      }),
    ).toBe(1)
    await expect(f.borrow(1, f.users[0], requestId)).rejects.toMatchObject({
      businessCode: 'IDEMPOTENCY_KEY_REUSED',
    })
  })
  it('CA-SE-04/07: concorrência da mesma pessoa preserva máximo de três', async () => {
    const f = await fixture()
    const results = await Promise.allSettled(
      [0, 1, 2, 3].map((i) => f.borrow(i)),
    )
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(3)
    expect(await loanSummary(f.repo, f.users[0])).toMatchObject({
      openCount: 3,
      blockedReason: 'LOAN_LIMIT_REACHED',
    })
  })
  it('CA-SE-07: disputa de item concede somente um empréstimo', async () => {
    const f = await fixture()
    const results = await Promise.allSettled(
      f.users.map((user) => f.borrow(0, user)),
    )
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    expect(await db.loan.count({ where: { tenantId: f.tenant.id } })).toBe(1)
  })
  it('CA-SE-05/06/09/10: manutenção e atraso bloqueiam; outro tenant não lê nem solicita', async () => {
    const f = await fixture()
    await expect(f.borrow(4)).rejects.toMatchObject({
      businessCode: 'EQUIPMENT_UNAVAILABLE',
    })
    const loan = await f.borrow(0)
    const borrowedAt = new Date(Date.now() - 337 * 3600000)
    await db.loan.update({
      where: { id: loan.id },
      data: {
        borrowedAt,
        dueAt: new Date(borrowedAt.getTime() + 336 * 3600000),
      },
    })
    await expect(f.borrow(1)).rejects.toMatchObject({
      businessCode: 'OVERDUE_LOAN',
    })
    expect(
      (await myLoans(f.repo, f.users[1], { limit: 24 })).items,
    ).toHaveLength(0)
    const other = await fixture()
    expect(await other.repo.equipment(f.items[0].patrimonio)).toBeNull()
    await expect(
      requestLoan(other.repo, other.users[0], '127.0.0.1', {
        patrimonio: f.items[1].patrimonio,
        requestId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
