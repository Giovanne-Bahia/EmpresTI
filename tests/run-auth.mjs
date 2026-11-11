import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { PrismaClient } from '@prisma/client'
import { createHmac, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { dirname, delimiter } from 'node:path'

const suffix = process.pid.toString()
const network = `empresti-auth-test-${suffix}`
const authName = `empresti-auth-test-${suffix}`
const dbName = `empresti-db-test-${suffix}`
const jwtSecret = randomBytes(32).toString('hex')
const password = randomBytes(20).toString('hex')
// Subprocessos de teste recebem apenas o ambiente do sistema operacional.
// Credenciais do aplicativo são definidas abaixo para serviços descartáveis.
const systemVariables = [
  'SystemRoot',
  'WINDIR',
  'COMSPEC',
  'PATHEXT',
  'TEMP',
  'TMP',
  'USERPROFILE',
  'HOME',
  'APPDATA',
  'LOCALAPPDATA',
  'ProgramData',
  'ProgramFiles',
  'ProgramFiles(x86)',
]
const env = Object.fromEntries(
  Object.entries(process.env).filter(([name]) =>
    systemVariables.some(
      (allowed) => allowed.toLowerCase() === name.toLowerCase(),
    ),
  ),
)
env.PATH = dirname(process.execPath) + delimiter + (process.env.PATH ?? '')
const docker = (...args) =>
  execFileSync('docker', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
const run = (file, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], {
      env,
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${file} encerrou com ${code}`)),
    )
  })
function token(role) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')
  const unsigned =
    encode({ alg: 'HS256', typ: 'JWT' }) +
    '.' +
    encode({
      role,
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  return (
    unsigned +
    '.' +
    createHmac('sha256', jwtSecret).update(unsigned).digest('base64url')
  )
}
async function waitFor(url) {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Serviço local indisponível: ${url}`)
}
let db
let client
let app
let authPort
const gateway = createServer(async (request, response) => {
  try {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const upstream = await fetch(
      `http://127.0.0.1:${authPort}${request.url.replace(/^\/auth\/v1/, '')}`,
      {
        method: request.method,
        headers: request.headers,
        body: ['GET', 'HEAD'].includes(request.method)
          ? undefined
          : Buffer.concat(chunks),
      },
    )
    response.statusCode = upstream.status
    for (const [key, value] of upstream.headers)
      if (
        !['content-length', 'content-encoding', 'transfer-encoding'].includes(
          key,
        )
      )
        response.setHeader(key, value)
    response.end(Buffer.from(await upstream.arrayBuffer()))
  } catch {
    response.writeHead(503).end()
  }
})

try {
  docker('network', 'create', network)
  db = await new PostgreSqlContainer('postgres:latest')
    .withName(dbName)
    .withNetworkMode(network)
    .withDatabase('empresti_test')
    .withUsername('postgres')
    .withPassword('local_validation_only')
    .start()
  env.DATABASE_URL = db.getConnectionUri()
  env.DIRECT_URL = env.DATABASE_URL
  env.EMPRESTI_TEST_DATABASE_URL = env.DATABASE_URL
  env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:3188'
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'local-test-only'
  await run('node_modules/prisma/build/index.js', [
    'migrate',
    'reset',
    '--force',
  ])
  await run('node_modules/prisma/build/index.js', ['db', 'seed'])
  await run('node_modules/vitest/vitest.mjs', [
    'run',
    '--config',
    'vitest.integration.config.mts',
  ])
  client = new PrismaClient({ datasourceUrl: env.DATABASE_URL })
  await client.$executeRawUnsafe('CREATE DATABASE auth_local')
  const authDbUrl = new URL(env.DATABASE_URL)
  authDbUrl.pathname = '/auth_local'
  const authDb = new PrismaClient({ datasourceUrl: authDbUrl.toString() })
  await authDb.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS auth')
  await authDb.$disconnect()
  await new Promise((resolve) => gateway.listen(0, '127.0.0.1', resolve))
  const authUrl = `http://127.0.0.1:${gateway.address().port}/auth/v1`
  docker(
    'run',
    '--detach',
    '--name',
    authName,
    '--network',
    network,
    '--publish',
    '127.0.0.1::9999',
    '--env',
    'GOTRUE_API_HOST=0.0.0.0',
    '--env',
    'GOTRUE_API_PORT=9999',
    '--env',
    `API_EXTERNAL_URL=${authUrl}`,
    '--env',
    'GOTRUE_DB_DRIVER=postgres',
    '--env',
    `GOTRUE_DB_DATABASE_URL=postgres://${db.getUsername()}:${db.getPassword()}@${dbName}:5432/auth_local?sslmode=disable&search_path=auth`,
    '--env',
    'GOTRUE_SITE_URL=http://localhost',
    '--env',
    'GOTRUE_DISABLE_SIGNUP=true',
    '--env',
    'GOTRUE_JWT_ADMIN_ROLES=service_role',
    '--env',
    'GOTRUE_JWT_AUD=authenticated',
    '--env',
    `GOTRUE_JWT_SECRET=${jwtSecret}`,
    '--env',
    'GOTRUE_JWT_EXP=3600',
    '--env',
    'GOTRUE_EXTERNAL_EMAIL_ENABLED=true',
    '--env',
    'GOTRUE_MAILER_AUTOCONFIRM=true',
    'supabase/gotrue:v2.197.0',
  )
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      authPort = Number(docker('port', authName, '9999/tcp').split(':').at(-1))
      if (authPort) break
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  if (!authPort) {
    const logs = spawnSync('docker', ['logs', '--tail', '20', authName], {
      encoding: 'utf8',
    })
    console.error(logs.stdout, logs.stderr)
    throw new Error('O Auth local não publicou a porta.')
  }
  await waitFor(`${authUrl}/health`)
  const tenant = await client.tenant.findUniqueOrThrow({
    where: { slug: 'suporte_ti' },
  })
  for (const [email, role] of [
    ['colaborador@example.test', 'colaborador'],
    ['admin@example.test', 'admin'],
    ['sem-vinculo@example.test', null],
  ]) {
    const response = await fetch(`${authUrl}/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token('service_role')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    })
    if (!response.ok)
      throw new Error(`Falha ao criar fixture local: ${response.status}`)
    const user = await response.json()
    if (role)
      await client.membership.create({
        data: { tenantId: tenant.id, userId: user.id, role },
      })
  }
  env.NEXT_PUBLIC_SUPABASE_URL = authUrl.replace(/\/auth\/v1$/, '')
  await client.equipment.create({
    data: {
      tenantId: tenant.id,
      patrimonio: 'PAT-0233',
      name: 'Notebook de integração',
      category: 'notebook',
      searchText: 'notebook de integracao pat-0233',
      imagePath: 'test/local.jpg',
      imagePhotoId: 'local-only',
      imageSourceUrl: 'https://pixabay.com/',
      imageAuthor: 'Fixture local',
      imageAuthorUrl: 'https://pixabay.com/',
      imageLicenseUrl: 'https://pixabay.com/service/license-summary/',
      imageSha256: 'a'.repeat(64),
    },
  })
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = token('anon')
  delete env.SENTRY_DSN
  delete env.VERCEL
  env.EMPRESTI_TEST_PASSWORD = password
  env.EMPRESTI_TEST_BASE_URL = 'http://127.0.0.1:3187'
  await run('node_modules/next/dist/bin/next', ['build'])
  app = spawn(
    process.execPath,
    [
      'node_modules/next/dist/bin/next',
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      '3187',
    ],
    { env, stdio: 'inherit' },
  )
  await waitFor(env.EMPRESTI_TEST_BASE_URL)
  await run('node_modules/@playwright/test/cli.js', ['test'])
  const events = await client.auditEvent.findMany({
    where: { action: { in: ['auth.sign_in', 'auth.sign_out'] } },
  })
  if (
    !events.some((event) => event.action === 'auth.sign_in') ||
    !events.some((event) => event.action === 'auth.sign_out')
  )
    throw new Error('Auditoria de entrada e saída ausente.')
  console.log('Fluxo completo verificado com Postgres e Supabase Auth locais.')
} finally {
  if (app?.pid) {
    if (process.platform === 'win32') {
      try {
        execFileSync('taskkill', ['/PID', String(app.pid), '/T', '/F'], {
          stdio: 'ignore',
        })
      } catch {}
    } else app.kill('SIGTERM')
  }
  await client?.$disconnect()
  gateway.closeAllConnections()
  gateway.close()
  try {
    docker('stop', authName)
  } catch {}
  try {
    docker('rm', authName)
  } catch {}
  await db?.stop()
  try {
    docker('network', 'rm', network)
  } catch {}
}
