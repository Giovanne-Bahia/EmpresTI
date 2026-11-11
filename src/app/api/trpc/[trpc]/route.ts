import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { NextRequest, NextResponse } from 'next/server'
import { TRPCError } from '@trpc/server'
import * as Sentry from '@sentry/nextjs'
import { createContext } from '@/server/api/context'
import { appRouter } from '@/server/api/root'
import { env } from '@/server/env'
import { randomUUID } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handler(request: NextRequest) {
  const requestId = randomUUID()
  const headers = { 'Cache-Control': 'private, no-store', Pragma: 'no-cache' }
  const origin = request.headers.get('origin')
  let sameOrigin = false
  try {
    const source = new URL(origin ?? '')
    const protocol = process.env.VERCEL
      ? `${request.headers.get('x-forwarded-proto') ?? 'https'}:`
      : request.nextUrl.protocol
    sameOrigin =
      source.host === request.headers.get('host') &&
      source.protocol === protocol
  } catch {}
  if (request.method === 'POST' && !sameOrigin) {
    return NextResponse.json(
      { error: 'Origem inválida.' },
      { status: 403, headers },
    )
  }
  if (Number(request.headers.get('content-length')) > 8192)
    return new NextResponse(null, { status: 413, headers })
  let context: Awaited<ReturnType<typeof createContext>> | undefined
  let failed = false
  const response = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    allowBatching: false,
    createContext: async () => {
      try {
        const ip = process.env.VERCEL
          ? (request.headers
              .get('x-vercel-forwarded-for')
              ?.split(',')[0]
              .trim() ?? 'unknown')
          : 'localhost'
        context = await createContext(
          request.cookies.getAll(),
          ip,
          request.nextUrl.protocol === 'https:',
        )
        return context
      } catch {
        throw new TRPCError({ code: 'SERVICE_UNAVAILABLE' })
      }
    },
    onError({ error, ctx }) {
      failed = true
      console.error(
        JSON.stringify({
          request_id: ctx?.requestId ?? requestId,
          tenant_id: ctx?.identity?.tenantId ?? null,
          code: error.code,
        }),
      )
      if (
        env.SENTRY_DSN &&
        ['INTERNAL_SERVER_ERROR', 'SERVICE_UNAVAILABLE'].includes(error.code)
      ) {
        Sentry.init({ dsn: env.SENTRY_DSN })
        Sentry.captureException(new Error('Falha interna de autenticação'), {
          tags: { request_id: ctx?.requestId },
        })
      }
    },
  })
  const result = new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  })
  for (const [name, value] of Object.entries(headers))
    result.headers.set(name, value)
  if (context)
    for (const cookie of context.pending.values())
      if (!failed || cookie.value === '')
        result.cookies.set(cookie.name, cookie.value, cookie.options)
  return result
}
export { handler as GET, handler as POST }
