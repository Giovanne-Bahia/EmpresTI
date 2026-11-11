import { router } from './trpc'
import { authRouter } from './routers/auth'
import { equipmentRouter } from './routers/equipment'
import { loanRouter } from './routers/loan'
export const appRouter = router({
  auth: authRouter,
  equipment: equipmentRouter,
  loan: loanRouter,
})
export type AppRouter = typeof appRouter
