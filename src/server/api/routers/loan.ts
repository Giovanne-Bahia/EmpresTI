import { emptyInput } from '@/shared/auth'
import { listLoansSchema, requestLoanSchema } from '@/shared/loans'
import {
  loanSummary,
  myLoans,
  requestLoan,
} from '@/server/services/loan.service'
import { router, tenantProcedure } from '../trpc'
import { domainCall } from './equipment'
export const loanRouter = router({
  summary: tenantProcedure
    .input(emptyInput)
    .query(({ ctx }) =>
      domainCall(() => loanSummary(ctx.domain, ctx.identity.userId)),
    ),
  request: tenantProcedure
    .input(requestLoanSchema)
    .mutation(({ ctx, input }) =>
      domainCall(() =>
        requestLoan(ctx.domain, ctx.identity.userId, ctx.ip, input),
      ),
    ),
  mine: tenantProcedure
    .input(listLoansSchema)
    .query(({ ctx, input }) =>
      domainCall(() => myLoans(ctx.domain, ctx.identity.userId, input)),
    ),
})
