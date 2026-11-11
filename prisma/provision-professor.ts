import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

// Rotina exclusiva do operador humano. O agente não a executa em produção.
const email = 'marcelo.grilo@institutojef.org.br'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !secret)
  throw new Error('Configure credenciais de servidor no ambiente do operador.')
const auth = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const db = new PrismaClient()
try {
  let userId: string | undefined
  for (let page = 1; ; page++) {
    const { data, error } = await auth.auth.admin.listUsers({
      page,
      perPage: 100,
    })
    if (error) throw new Error('Não foi possível consultar Auth.')
    userId = data.users.find((user) => user.email?.toLowerCase() === email)?.id
    if (userId || data.users.length < 100) break
  }
  const tenant = await db.tenant.findUniqueOrThrow({
    where: { slug: 'suporte_ti' },
  })
  if (!userId) {
    const password = process.env.EMPRESTI_PROFESSOR_PASSWORD
    if (!password || password.length < 8)
      throw new Error(
        'Informe senha temporariamente em EMPRESTI_PROFESSOR_PASSWORD; não grave em arquivo.',
      )
    const { data, error } = await auth.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error || !data.user)
      throw new Error(
        'Não foi possível criar a conta. Repita para retomar sem redefinir senhas.',
      )
    userId = data.user.id
  }
  const existing = await db.membership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId } },
  })
  if (existing && existing.role !== 'colaborador')
    throw new Error('Vínculo divergente preservado; requer decisão humana.')
  if (!existing)
    await db.membership.create({
      data: { tenantId: tenant.id, userId, role: 'colaborador' },
    })
  const count = await db.loan.count({ where: { tenantId: tenant.id, userId } })
  console.log(
    `Conta e vínculo conferidos sem redefinir senha. Empréstimos existentes: ${count}.`,
  )
} catch {
  console.error(
    'Provisionamento não concluído. Confira configuração e vínculos; nenhuma senha existente foi redefinida.',
  )
  process.exitCode = 1
} finally {
  await db.$disconnect()
}
