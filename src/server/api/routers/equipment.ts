import { TRPCError } from '@trpc/server'
import { equipmentDetailSchema, listEquipmentSchema } from '@/shared/loans'
import {
  equipmentDetail,
  listEquipment,
} from '@/server/services/equipment.service'
import { DomainError } from '@/server/services/domain-error'
import { router, tenantProcedure } from '../trpc'

export async function domainCall<T>(work: () => Promise<T>) {
  try {
    return await work()
  } catch (error) {
    if (error instanceof DomainError)
      throw new TRPCError({
        code: error.code,
        cause: error,
        message: error.message,
      })
    throw error
  }
}
export const equipmentRouter = router({
  list: tenantProcedure
    .input(listEquipmentSchema)
    .query(({ ctx, input }) =>
      domainCall(() => listEquipment(ctx.domain, input)),
    ),
  byPatrimonio: tenantProcedure
    .input(equipmentDetailSchema)
    .query(({ ctx, input }) =>
      domainCall(() => equipmentDetail(ctx.domain, input.patrimonio)),
    ),
})
