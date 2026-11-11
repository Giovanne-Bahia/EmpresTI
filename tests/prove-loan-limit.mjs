import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
} from 'node:fs'
import { resolve, join, dirname, delimiter } from 'node:path'

// A mutação deliberada ocorre apenas numa cópia ignorada, nunca no app principal.
const source = process.cwd()
const proof = join(source, '.verification', `limit-proof-${Date.now()}`)
mkdirSync(proof, { recursive: true })
for (const entry of [
  'src',
  'prisma',
  'prisma.config.ts',
  'vitest.integration.config.mts',
])
  cpSync(join(source, entry), join(proof, entry), { recursive: true })
mkdirSync(join(proof, 'tests'), { recursive: true })
cpSync(join(source, 'tests/integration'), join(proof, 'tests/integration'), {
  recursive: true,
})
cpSync(
  join(source, 'tests/server-only.ts'),
  join(proof, 'tests/server-only.ts'),
)
symlinkSync(
  join(source, 'node_modules'),
  join(proof, 'node_modules'),
  'junction',
)
const hash = (value) => createHash('sha256').update(value).digest('hex')
const servicePath = join(proof, 'src/server/services/loan.service.ts')
const originalService = readFileSync(servicePath, 'utf8')
const testPath = 'tests/integration/loans.test.ts'
const testHash = hash(readFileSync(join(proof, testPath)))
const allowed = [
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
    allowed.some((key) => key.toLowerCase() === name.toLowerCase()),
  ),
)
env.PATH = dirname(process.execPath) + delimiter + (process.env.PATH ?? '')
env.NO_COLOR = '1'
let db
function run(args, name) {
  const result = spawnSync(process.execPath, args, {
    cwd: proof,
    env,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
  })
  const output = (result.stdout ?? '') + (result.stderr ?? '')
  writeFileSync(join(proof, `${name}.log`), output)
  console.log(`${name}: exit=${result.status}`)
  if (result.error) throw new Error(`${name}: execução interrompida.`)
  return { status: result.status, output }
}
try {
  db = await new PostgreSqlContainer('postgres:17')
    .withDatabase('empresti_proof')
    .start()
  env.DATABASE_URL = db.getConnectionUri()
  env.DIRECT_URL = env.DATABASE_URL
  env.EMPRESTI_TEST_DATABASE_URL = env.DATABASE_URL
  env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:3188'
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'local-proof-only'
  if (
    run(
      [
        'node_modules/prisma/build/index.js',
        'migrate',
        'reset',
        '--force',
        '--skip-generate',
        '--skip-seed',
      ],
      'reset',
    ).status !== 0
  )
    throw new Error('Reset local falhou.')
  if (run(['prisma/seed.ts'], 'seed').status !== 0)
    throw new Error('Seed local falhou.')
  if (!originalService.includes('export const loanLimit = 3'))
    throw new Error('Ponto de mutação inesperado.')
  writeFileSync(
    servicePath,
    originalService.replace(
      'export const loanLimit = 3',
      'export const loanLimit = 4',
    ),
  )
  const args = [
    'node_modules/vitest/vitest.mjs',
    'run',
    '--config',
    'vitest.integration.config.mts',
    testPath,
  ]
  const red = run(args, 'limite-quatro-reprovado')
  if (
    red.status === 0 ||
    !red.output.includes('CA-SE-04/07') ||
    !red.output.includes('AssertionError')
  )
    throw new Error('A mutação não teve a reprovação esperada; examinar logs.')
  writeFileSync(servicePath, originalService)
  const green = run(args, 'limite-tres-aprovado')
  if (green.status !== 0) throw new Error('Correção não passou nos testes.')
  if (
    hash(readFileSync(join(proof, testPath))) !== testHash ||
    hash(readFileSync(join(source, testPath))) !== testHash
  )
    throw new Error('Teste foi alterado durante a prova.')
  if (
    hash(readFileSync(join(source, 'src/server/services/loan.service.ts'))) !==
    hash(originalService)
  )
    throw new Error('Service principal divergiu durante a prova.')
  writeFileSync(
    join(proof, 'receipt.json'),
    JSON.stringify(
      {
        performedAt: new Date().toISOString(),
        mutation: 'loanLimit: 3 -> 4',
        redExit: red.status,
        greenExit: green.status,
        testSha256: testHash,
        restoredServiceSha256: hash(originalService),
        originalWorkspaceUnchanged: true,
        humanCommitsCreated: false,
      },
      null,
      2,
    ),
  )
  console.log(`Prova local concluída; logs e recibo: ${resolve(proof)}`)
} finally {
  writeFileSync(servicePath, originalService)
  await db?.stop()
}
