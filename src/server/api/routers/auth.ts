import { emptyInput, signInSchema } from '@/shared/auth'
import { signIn, signOut } from '@/server/services/auth.service'
import { publicProcedure, router, tenantProcedure } from '../trpc'

export const authRouter = router({
  signIn: publicProcedure
    .input(signInSchema)
    .mutation(({ ctx, input }) =>
      signIn(ctx.prisma, ctx.supabase.auth, input, ctx.ip),
    ),
  signOut: tenantProcedure
    .input(emptyInput)
    .mutation(({ ctx }) =>
      signOut(ctx.prisma, ctx.supabase.auth, ctx.identity),
    ),
  me: tenantProcedure.input(emptyInput).query(({ ctx }) => ctx.identity),
})
