import 'server-only'
import { createHash } from 'node:crypto'
import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PrismaClient } from '@prisma/client'
import type { z } from 'zod'
import { signInSchema } from '@/shared/auth'

export async function resolveIdentity(
  db: PrismaClient,
  auth: Pick<SupabaseClient['auth'], 'getUser'>,
) {
  const { data, error } = await auth.getUser()
  if (error) {
    if (!error.status || error.status >= 500)
      throw new TRPCError({ code: 'SERVICE_UNAVAILABLE' })
    return null
  }
  if (!data.user) return null
  const membership = await db.membership.findFirst({
    where: { userId: data.user.id, tenant: { slug: 'suporte_ti' } },
    select: { tenantId: true, role: true },
  })
  if (!membership) return null
  return {
    ...membership,
    userId: data.user.id,
    email: data.user.email ?? 'Usuário',
  }
}

export async function consumeLoginAttempts(
  db: PrismaClient,
  tenantId: string,
  email: string,
  ip: string,
) {
  const allowed = await db.$transaction(async (tx) => {
    let permitted = true
    for (const [dimension, value, limit] of [
      ['email', email, 5],
      ['ip', ip, 30],
    ] as const) {
      const hash = createHash('sha256').update(value).digest()
      const [bucket] = await tx.$queryRaw<Array<{ attempts: number }>>`
        INSERT INTO public.login_rate_limits (tenant_id, dimension, key_hash, window_started_at, attempts)
        VALUES (${tenantId}::uuid, ${dimension}, ${hash}, now(), 1)
        ON CONFLICT (tenant_id, dimension, key_hash) DO UPDATE SET
          attempts = CASE WHEN login_rate_limits.window_started_at <= now() - interval '15 minutes'
            THEN 1 ELSE LEAST(login_rate_limits.attempts + 1, ${limit + 1}) END,
          window_started_at = CASE WHEN login_rate_limits.window_started_at <= now() - interval '15 minutes'
            THEN now() ELSE login_rate_limits.window_started_at END
        RETURNING attempts
      `
      if (bucket.attempts > limit) permitted = false
    }
    return permitted
  })
  if (!allowed) throw new TRPCError({ code: 'TOO_MANY_REQUESTS' })
}

export async function signIn(
  db: PrismaClient,
  auth: SupabaseClient['auth'],
  input: z.infer<typeof signInSchema>,
  ip: string,
) {
  const tenant = await db.tenant.findUnique({ where: { slug: 'suporte_ti' } })
  if (!tenant) throw new TRPCError({ code: 'SERVICE_UNAVAILABLE' })
  await consumeLoginAttempts(db, tenant.id, input.email, ip)
  const { data, error } = await auth.signInWithPassword(input)
  if (error || !data.user) {
    throw new TRPCError({
      code:
        error?.status === 429
          ? 'TOO_MANY_REQUESTS'
          : !error?.status || error.status >= 500
            ? 'SERVICE_UNAVAILABLE'
            : 'UNAUTHORIZED',
    })
  }
  const membership = await db.membership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: data.user.id } },
  })
  if (!membership) {
    await auth.signOut({ scope: 'local' })
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  await db.auditEvent.create({
    data: {
      tenantId: tenant.id,
      actorId: data.user.id,
      action: 'auth.sign_in',
      resourceType: 'user_session',
      resourceId: data.user.id,
    },
  })
  return { ok: true as const }
}

export async function signOut(
  db: PrismaClient,
  auth: SupabaseClient['auth'],
  identity: NonNullable<Awaited<ReturnType<typeof resolveIdentity>>>,
) {
  const { error } = await auth.signOut({ scope: 'local' })
  if (error) throw new TRPCError({ code: 'SERVICE_UNAVAILABLE' })
  await db.auditEvent.create({
    data: {
      tenantId: identity.tenantId,
      actorId: identity.userId,
      action: 'auth.sign_out',
      resourceType: 'user_session',
      resourceId: identity.userId,
    },
  })
  return { ok: true as const }
}
