import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Somente operador humano; não executar automaticamente na entrega.
const input = z
  .object({
    email: z.email(),
    userId: z.uuid(),
    loanIds: z.array(z.uuid()).min(1),
  })
  .parse({
    email: process.env.EMPRESTI_TEST_EMAIL,
    userId: process.env.EMPRESTI_TEST_USER_ID,
    loanIds: process.argv.slice(2),
  })
if (input.email.toLowerCase() === 'marcelo.grilo@institutojef.org.br')
  throw new Error('Professor não é conta de testes.')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Credenciais administrativas ausentes.')
const auth = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const { data, error } = await auth.auth.admin.getUserById(input.userId)
if (error || data.user?.email?.toLowerCase() !== input.email.toLowerCase())
  throw new Error('Conta de teste não confirmada.')
const db = new PrismaClient()
try {
  const tenant = await db.tenant.findUniqueOrThrow({
    where: { slug: 'suporte_ti' },
  })
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT user_id FROM memberships WHERE tenant_id=${tenant.id}::uuid AND user_id=${input.userId}::uuid FOR UPDATE`
    const loans = await tx.loan.findMany({
      where: {
        tenantId: tenant.id,
        userId: input.userId,
        id: { in: input.loanIds },
      },
    })
    if (loans.length !== new Set(input.loanIds).size)
      throw new Error('UUID fora da conta/tenant autorizados; nada alterado.')
    for (const loan of loans) {
      const updated = await tx.loan.updateMany({
        where: {
          id: loan.id,
          tenantId: tenant.id,
          userId: input.userId,
          returnedAt: null,
        },
        data: { returnedAt: new Date() },
      })
      if (updated.count)
        await tx.auditEvent.create({
          data: {
            tenantId: tenant.id,
            actorId: input.userId,
            action: 'loan.test_cleanup',
            resourceType: 'loan',
            resourceId: loan.id,
          },
        })
    }
  })
  console.log(
    'Somente empréstimos autorizados da conta de teste foram encerrados; manutenção preservada.',
  )
} finally {
  await db.$disconnect()
}
