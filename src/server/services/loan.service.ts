import type { z } from 'zod'
import type { listLoansSchema, requestLoanSchema } from '@/shared/loans'
import { DomainError } from './domain-error'
import { publicEquipment } from './equipment.service'
import type { TenantRepository } from './tenant.repository'

export const loanLimit = 3
const term = 14 * 24 * 60 * 60 * 1000
export async function loanSummary(repo: TenantRepository, userId: string) {
  const now = new Date()
  const [openCount, overdueCount] = await Promise.all([
    repo.openCount(userId),
    repo.overdueCount(userId, now),
  ])
  const blockedReason = overdueCount
    ? ('OVERDUE_LOAN' as const)
    : openCount >= loanLimit
      ? ('LOAN_LIMIT_REACHED' as const)
      : null
  return {
    openCount,
    overdueCount,
    limit: loanLimit,
    canBorrow: !blockedReason,
    blockedReason,
    now,
  }
}
export async function requestLoan(
  repo: TenantRepository,
  userId: string,
  ip: string,
  input: z.infer<typeof requestLoanSchema>,
) {
  const prior = await repo.priorRequest(userId, input.requestId)
  if (prior) {
    if (prior.equipment.patrimonio !== input.patrimonio)
      throw new DomainError('CONFLICT', 'IDEMPOTENCY_KEY_REUSED')
    return {
      id: prior.id,
      borrowedAt: prior.borrowedAt,
      dueAt: prior.dueAt,
      equipment: publicEquipment(prior.equipment),
    }
  }
  const byUser = await repo.consume('user', userId, 10)
  const byIp = await repo.consume('ip', ip, 60)
  if (!byUser || !byIp)
    throw new DomainError('TOO_MANY_REQUESTS', 'REQUEST_RATE_LIMITED')
  return repo.transaction(async (tx) => {
    if (!(await tx.lockUser(userId)).length) throw new DomainError('NOT_FOUND')
    const replay = await tx.priorRequest(userId, input.requestId)
    if (replay) {
      if (replay.equipment.patrimonio !== input.patrimonio)
        throw new DomainError('CONFLICT', 'IDEMPOTENCY_KEY_REUSED')
      return {
        id: replay.id,
        borrowedAt: replay.borrowedAt,
        dueAt: replay.dueAt,
        equipment: publicEquipment(replay.equipment),
      }
    }
    if (!(await tx.lockEquipment(input.patrimonio)).length)
      throw new DomainError('NOT_FOUND')
    const now = new Date()
    if (await tx.overdueCount(userId, now))
      throw new DomainError('PRECONDITION_FAILED', 'OVERDUE_LOAN')
    if ((await tx.openCount(userId)) >= loanLimit)
      throw new DomainError('PRECONDITION_FAILED', 'LOAN_LIMIT_REACHED')
    const equipment = await tx.equipment(input.patrimonio)
    if (
      !equipment ||
      equipment.condition !== 'disponivel' ||
      equipment.loans.length
    )
      throw new DomainError('CONFLICT', 'EQUIPMENT_UNAVAILABLE')
    const loan = await tx.createLoan({
      userId,
      equipmentId: equipment.id,
      requestId: input.requestId,
      borrowedAt: now,
      dueAt: new Date(now.getTime() + term),
    })
    await tx.audit(userId, loan.id)
    return {
      id: loan.id,
      borrowedAt: loan.borrowedAt,
      dueAt: loan.dueAt,
      equipment: publicEquipment(loan.equipment),
    }
  })
}
export async function myLoans(
  repo: TenantRepository,
  userId: string,
  input: z.infer<typeof listLoansSchema>,
) {
  if (input.cursor && !(await repo.loanCursor(userId, input.cursor)))
    throw new DomainError('BAD_REQUEST')
  const items = await repo.mine(userId, input.limit + 1, input.cursor)
  const more = items.length > input.limit
  if (more) items.pop()
  return {
    items: items.map((item) => ({
      id: item.id,
      borrowedAt: item.borrowedAt,
      dueAt: item.dueAt,
      equipment: publicEquipment(item.equipment),
    })),
    nextCursor: more ? items.at(-1)?.id : undefined,
  }
}
