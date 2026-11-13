import 'server-only'
import { createHash } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'

const equipmentView = {
  loans: { where: { returnedAt: null }, select: { dueAt: true }, take: 1 },
} satisfies Prisma.EquipmentInclude
function bind(db: Prisma.TransactionClient, tenantId: string) {
  return {
    equipment: (patrimonio: string) =>
      db.equipment.findFirst({
        where: { tenantId, patrimonio },
        include: equipmentView,
      }),
    equipmentList: (
      where: Prisma.EquipmentWhereInput,
      take: number,
      cursor?: string,
    ) =>
      db.equipment.findMany({
        where: { AND: [{ tenantId }, where] },
        include: equipmentView,
        orderBy: { patrimonio: 'asc' },
        take,
        ...(cursor ? { cursor: { patrimonio: cursor }, skip: 1 } : {}),
      }),
    equipmentCount: (available = false) =>
      db.equipment.count({
        where: {
          tenantId,
          ...(available
            ? { condition: 'disponivel', loans: { none: { returnedAt: null } } }
            : {}),
        },
      }),
    openCount: (userId: string) =>
      db.loan.count({ where: { tenantId, userId, returnedAt: null } }),
    overdueCount: (userId: string, now: Date) =>
      db.loan.count({
        where: { tenantId, userId, returnedAt: null, dueAt: { lte: now } },
      }),
    priorRequest: (userId: string, requestId: string) =>
      db.loan.findFirst({
        where: { tenantId, userId, requestId },
        include: { equipment: { include: equipmentView } },
      }),
    loanCursor: (userId: string, id: string) =>
      db.loan.findFirst({
        where: { tenantId, userId, id, returnedAt: null },
        select: { id: true },
      }),
    mine: (userId: string, take: number, cursor?: string) =>
      db.loan.findMany({
        where: { tenantId, userId, returnedAt: null },
        include: { equipment: { include: equipmentView } },
        orderBy: { id: 'asc' },
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
    lockUser: (userId: string) =>
      db.$queryRaw<
        Array<{ user_id: string }>
      >`SELECT user_id FROM memberships WHERE tenant_id=${tenantId}::uuid AND user_id=${userId}::uuid FOR UPDATE`,
    lockEquipment: (patrimonio: string) =>
      db.$queryRaw<
        Array<{ id: string }>
      >`SELECT id FROM equipment WHERE tenant_id=${tenantId}::uuid AND patrimonio=${patrimonio} FOR UPDATE`,
    createLoan: (data: {
      userId: string
      equipmentId: string
      requestId: string
      borrowedAt: Date
      dueAt: Date
    }) =>
      db.loan.create({
        data: { ...data, tenantId },
        include: { equipment: { include: equipmentView } },
      }),
    audit: (actorId: string, resourceId: string) =>
      db.auditEvent.create({
        data: {
          tenantId,
          actorId,
          action: 'loan.request',
          resourceType: 'loan',
          resourceId,
        },
      }),
    consume: async (dimension: 'user' | 'ip', value: string, limit: number) => {
      const hash = createHash('sha256').update(value).digest()
      const [row] = await db.$queryRaw<Array<{ attempts: number }>>`
        INSERT INTO loan_rate_limits (tenant_id,dimension,key_hash,window_started_at,attempts)
        VALUES (${tenantId}::uuid,${dimension},${hash},now(),1)
        ON CONFLICT (tenant_id,dimension,key_hash) DO UPDATE SET
        attempts=CASE WHEN loan_rate_limits.window_started_at <= now()-interval '60 seconds' THEN 1 ELSE LEAST(loan_rate_limits.attempts+1,${limit + 1}) END,
        window_started_at=CASE WHEN loan_rate_limits.window_started_at <= now()-interval '60 seconds' THEN now() ELSE loan_rate_limits.window_started_at END
        RETURNING attempts`
      return row.attempts <= limit
    },
  }
}
export function tenantRepository(db: PrismaClient, tenantId: string) {
  return {
    ...bind(db, tenantId),
    transaction: <T>(work: (tx: ReturnType<typeof bind>) => Promise<T>) =>
      db.$transaction((tx) => work(bind(tx, tenantId)), {
        maxWait: 10000,
        timeout: 15000,
      }),
  }
}
export type TenantRepository = ReturnType<typeof tenantRepository>
