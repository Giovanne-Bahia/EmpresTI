import 'server-only'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { randomUUID } from 'node:crypto'
import { env } from '../env'
import { prisma } from '../db'
import { resolveIdentity } from '../services/auth.service'

export type CookieValue = {
  name: string
  value: string
  options?: CookieOptions
}

export async function createContext(
  cookieValues: Array<{ name: string; value: string }>,
  ip = 'local',
  secure = process.env.NODE_ENV === 'production',
) {
  const pending = new Map<string, CookieValue>()
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: { httpOnly: true, secure, sameSite: 'lax', path: '/' },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: init?.signal ?? AbortSignal.timeout(10000),
          }),
      },
      cookies: {
        getAll: () => cookieValues,
        setAll: (values) => {
          for (const cookie of values) pending.set(cookie.name, cookie)
        },
      },
    },
  )
  const hasSession = cookieValues.some((cookie) =>
    cookie.name.startsWith('sb-'),
  )
  const identity = hasSession
    ? await resolveIdentity(prisma, supabase.auth)
    : null
  return { prisma, supabase, identity, pending, ip, requestId: randomUUID() }
}
export type Context = Awaited<ReturnType<typeof createContext>>
