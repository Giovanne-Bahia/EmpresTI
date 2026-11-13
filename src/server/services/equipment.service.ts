import type { Equipment, Prisma } from '@prisma/client'
import type { z } from 'zod'
import { listEquipmentSchema, normalizeSearch } from '@/shared/loans'
import { env } from '../env'
import type { TenantRepository } from './tenant.repository'
import { DomainError } from './domain-error'

export function publicEquipment(
  item: Equipment & { loans: Array<{ dueAt: Date }> },
) {
  const status =
    item.condition === 'manutencao'
      ? ('manutencao' as const)
      : item.loans.length
        ? ('emprestado' as const)
        : ('disponivel' as const)
  return {
    id: item.id,
    patrimonio: item.patrimonio,
    name: item.name,
    category: item.category,
    status,
    imageUrl: `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/equipamentos/${item.imagePath.split('/').map(encodeURIComponent).join('/')}`,
    imageAuthor: item.imageAuthor,
    imageSourceUrl: item.imageSourceUrl,
    dueAt: item.loans[0]?.dueAt ?? null,
  }
}
export async function listEquipment(
  repo: TenantRepository,
  input: z.infer<typeof listEquipmentSchema>,
) {
  if (input.cursor && !(await repo.equipment(input.cursor)))
    throw new DomainError('BAD_REQUEST')
  const where: Prisma.EquipmentWhereInput = {
    ...(input.search
      ? { searchText: { contains: normalizeSearch(input.search) } }
      : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(input.availableOnly
      ? { condition: 'disponivel', loans: { none: { returnedAt: null } } }
      : {}),
  }
  const [items, total, availableCount] = await Promise.all([
    repo.equipmentList(where, input.limit + 1, input.cursor),
    repo.equipmentCount(),
    repo.equipmentCount(true),
  ])
  const more = items.length > input.limit
  if (more) items.pop()
  return {
    items: items.map(publicEquipment),
    nextCursor: more ? items.at(-1)?.patrimonio : undefined,
    total,
    availableCount,
  }
}
export async function equipmentDetail(
  repo: TenantRepository,
  patrimonio: string,
) {
  const item = await repo.equipment(patrimonio)
  if (!item) throw new DomainError('NOT_FOUND')
  return publicEquipment(item)
}
