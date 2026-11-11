import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { createContext } from './server/api/context'
import { appRouter } from './server/api/root'
import { env } from './server/env'

export async function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString('base64')
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}' https://unpkg.com`,
    "font-src 'self' https://unpkg.com data:",
    `img-src 'self' data: blob: ${new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin}`,
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  const pathname = request.nextUrl.pathname
  const origin = `${request.nextUrl.protocol}//${request.headers.get('host') ?? request.nextUrl.host}`
  const protectedRoute = /^\/(catalogo|meus-emprestimos|operacoes)(\/|$)/.test(
    pathname,
  )
  try {
    const ctx = await createContext(
      request.cookies.getAll(),
      'local',
      request.nextUrl.protocol === 'https:',
    )
    let identity = null
    if (ctx.identity) identity = await appRouter.createCaller(ctx).auth.me({})
    for (const cookie of ctx.pending.values())
      request.cookies.set(cookie.name, cookie.value)
    requestHeaders.set('cookie', request.cookies.toString())
    let response = NextResponse.next({ request: { headers: requestHeaders } })
    if (protectedRoute && !identity)
      response = NextResponse.redirect(new URL('/login', origin))
    else if (pathname.startsWith('/operacoes') && identity?.role !== 'admin')
      response = NextResponse.redirect(new URL('/catalogo', origin))
    else if (pathname === '/login' && identity)
      response = NextResponse.redirect(new URL('/catalogo', origin))
    for (const cookie of ctx.pending.values())
      response.cookies.set(cookie.name, cookie.value, cookie.options)
    response.headers.set('Content-Security-Policy', csp)
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  } catch {
    return new NextResponse('Serviço indisponível. Tente novamente.', {
      status: 503,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Security-Policy': csp,
      },
    })
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.svg).*)'],
}
