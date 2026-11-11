import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { authMessages } from '@/shared/auth'
import type { Context } from './context'
import { DomainError } from '../services/domain-error'
import { tenantRepository } from '../services/tenant.repository'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, ctx, error }) {
    const domainError = error.cause instanceof DomainError ? error.cause : null
    const message =
      authMessages[shape.data.code as keyof typeof authMessages] ??
      'Não foi possível concluir a operação.'
    return {
      ...shape,
      message: domainError?.message ?? message,
      data: {
        ...shape.data,
        stack: undefined,
        requestId: ctx?.requestId,
        businessCode: domainError?.businessCode ?? null,
      },
    }
  },
})
export const router = t.router
export const publicProcedure = t.procedure.use(async ({ next }) => {
  const result = await next()
  if (!result.ok && result.error.code === 'INTERNAL_SERVER_ERROR')
    throw new TRPCError({ code: 'SERVICE_UNAVAILABLE' })
  return result
})
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.identity) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, identity: ctx.identity } })
})
export const tenantProcedure = protectedProcedure.use(({ ctx, next }) =>
  next({
    ctx: {
      ...ctx,
      tenantId: ctx.identity.tenantId,
      domain: tenantRepository(ctx.prisma, ctx.identity.tenantId),
    },
  }),
)
export const adminProcedure = tenantProcedure.use(({ ctx, next }) => {
  if (ctx.identity.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' })
  return next({ ctx })
})
