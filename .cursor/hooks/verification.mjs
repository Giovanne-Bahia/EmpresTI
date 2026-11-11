import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  auditReviewEvents,
  completionSpecs,
  fingerprint,
  registry,
  safeFile,
  validateReport,
} from './verification-core.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
const state = join(root, '.verification')
const command = process.argv[2]
const spec = process.argv[3]
const save = (file, data) => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
}
const load = (file) => JSON.parse(readFileSync(file, 'utf8'))
const slug = (file) => basename(file, '.md')
const requiredDocs = [
  'AGENTS.md',
  'rules/restriction.md',
  'rules/operation.md',
  'rules/check.md',
  'rules/migration.md',
  'docs/specs/README.md',
  'docs/adr/001-stack.md',
  'docs/decisoes-pratica.md',
  'docs/ddl-pratica.md',
]

function systemEnvironment() {
  const names = [
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
    'PATH',
  ]
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      names.some((name) => name.toLowerCase() === key.toLowerCase()),
    ),
  )
}

function node24() {
  if (Number(process.versions.node.split('.')[0]) === 24)
    return process.execPath
  const bases = [join(tmpdir(), 'empresti-node24')]
  if (process.env.LOCALAPPDATA)
    bases.push(join(process.env.LOCALAPPDATA, 'Temp', 'empresti-node24'))
  for (const base of bases) {
    if (!existsSync(base)) continue
    for (const name of readdirSync(base)
      .filter((name) => /^node-v24\..*-win-x64$/.test(name))
      .sort()
      .reverse()) {
      const binary = join(base, name, 'node.exe')
      if (existsSync(binary)) return binary
    }
  }
  throw new Error('Use Node 24 no PATH para executar os checks.')
}

function runChecks() {
  const node = node24()
  const before = fingerprint(root).fingerprint
  const env = {
    ...systemEnvironment(),
    PATH:
      dirname(node) +
      (process.platform === 'win32' ? ';' : ':') +
      (process.env.PATH ?? ''),
    DATABASE_URL: 'postgresql://local:local@127.0.0.1:5432/empresti_test',
    DIRECT_URL: 'postgresql://local:local@127.0.0.1:5432/empresti_test',
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9999',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-validation-only',
    SENTRY_DSN: 'http://local@127.0.0.1/1',
    NEXT_TELEMETRY_DISABLED: '1',
  }
  const jobs = [
    ['lint', ['node_modules/eslint/bin/eslint.js', '.', '--max-warnings=0']],
    ['typecheck', ['node_modules/typescript/bin/tsc', '--noEmit']],
    ['test', ['node_modules/vitest/vitest.mjs', 'run']],
    ['test:verifier', ['--test', 'tests/verifier.test.mjs']],
    ['build', ['node_modules/next/dist/bin/next', 'build']],
    ['test:auth', ['tests/run-auth.mjs']],
  ]
  const commands = []
  const startedAt = new Date().toISOString()
  for (const [name, args] of jobs) {
    process.stdout.write(`Verificando ${name}...\n`)
    const result = spawnSync(node, args, {
      cwd: root,
      env,
      encoding: 'utf8',
      timeout: 600000,
      maxBuffer: 16 * 1024 * 1024,
    })
    const output =
      (result.stdout ?? '') +
      (result.stderr ?? '') +
      (result.error ? '\n' + result.error.message : '')
    const log = `checks/${name.replaceAll(':', '-')}.log`
    mkdirSync(join(state, 'checks'), { recursive: true })
    writeFileSync(join(state, log), output)
    commands.push({
      name,
      exitCode: result.status ?? 1,
      log,
      sha256: createHash('sha256').update(output).digest('hex'),
    })
    process.stdout.write(
      `${name}: ${result.status === 0 ? 'passou' : 'falhou'}\n`,
    )
    if (result.status !== 0) process.stdout.write(output.slice(-6000) + '\n')
  }
  if (fingerprint(root).fingerprint !== before)
    throw new Error(
      'Fonte mudou durante os checks; execute novamente após estabilizar.',
    )
  save(join(state, 'checks.json'), {
    fingerprint: before,
    startedAt,
    completedAt: new Date().toISOString(),
    node: spawnSync(node, ['--version'], { encoding: 'utf8' }).stdout.trim(),
    commands,
  })
}

function review(specPath) {
  if (!Object.hasOwn(registry, specPath))
    throw new Error('Informe uma das duas specs principais registradas.')
  const source = fingerprint(root)
  const checks = load(join(state, 'checks.json'))
  if (checks.fingerprint !== source.fingerprint)
    throw new Error(
      'Execute npm run verify:checks para a versão atual antes da revisão.',
    )
  const snapshot = mkdtempSync(join(tmpdir(), 'empresti-review-'))
  for (const name of source.files) {
    if (name.startsWith('.codex/') || name.startsWith('.cursor/')) continue
    const dest = join(snapshot, name)
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(safeFile(root, name), dest)
  }
  // Configurações do harness original não são carregadas pela cópia isolada.
  // O launcher usa --ignore-user-config e desativa ferramentas externas abaixo.
  const manifestFiles = source.files.filter(
    (name) => !name.startsWith('.codex/') && !name.startsWith('.cursor/'),
  )
  save(join(snapshot, 'checks.json'), checks)
  for (const item of checks.commands) {
    const dest = join(snapshot, item.log)
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(safeFile(state, item.log), dest)
    manifestFiles.push(item.log)
  }
  manifestFiles.push('checks.json')
  save(join(snapshot, 'manifest.json'), {
    fingerprint: source.fingerprint,
    spec: specPath,
    files: manifestFiles,
  })
  const node = node24()
  const output = join(state, 'reports', slug(specPath) + '.json')
  mkdirSync(dirname(output), { recursive: true })
  const disabled = [
    'apps',
    'plugins',
    'shell_tool',
    'unified_exec',
    'computer_use',
    'browser_use',
    'browser_use_external',
    'in_app_browser',
    'image_generation',
    'multi_agent',
    'workspace_dependencies',
    'view_image',
    'hooks',
  ]
  const args = [
    '--no-daemon',
    'exec',
    '--ignore-user-config',
    '--ephemeral',
    '--skip-git-repo-check',
    '--sandbox',
    'read-only',
    '--cd',
    snapshot,
    '--json',
    '--output-schema',
    join(here, 'review-schema.json'),
    '--output-last-message',
    output,
  ]
  for (const feature of disabled) args.push('--disable', feature)
  for (const setting of [
    'approval_policy="never"',
    'web_search="disabled"',
    'shell_environment_policy.inherit="none"',
    'mcp_servers.evidence.enabled_tools=["list_files","read_file"]',
    'mcp_servers.evidence.tools.list_files.approval_mode="auto"',
    'mcp_servers.evidence.tools.read_file.approval_mode="auto"',
    `mcp_servers.evidence.command=${JSON.stringify(node)}`,
    `mcp_servers.evidence.args=${JSON.stringify([join(here, 'evidence-server.mjs'), snapshot])}`,
  ])
    args.push('-c', setting)
  const contract = readFileSync(join(root, 'docs/verificador-spec.md'), 'utf8')
  const prompt = `${contract}\n\nSpec: ${specPath}\nFingerprint: ${source.fingerprint}\nEscopo: tudo que implementa esta spec neste monólito.\nUse somente evidence.list_files e evidence.read_file. Leia integralmente: ${[...requiredDocs, specPath, 'docs/layout.md', 'checks.json'].join(', ')}. Os logs estão em checks/. Não tente executar comandos nem corrigir arquivos. Há somente este servidor MCP de leitura. Entregue JSON no schema solicitado.\n`
  args.push('-')
  const result = spawnSync('codex', args, {
    cwd: snapshot,
    input: prompt,
    env: systemEnvironment(),
    encoding: 'utf8',
    timeout: 900000,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  })
  mkdirSync(join(state, 'sessions'), { recursive: true })
  writeFileSync(
    join(state, 'sessions', slug(specPath) + '.jsonl'),
    result.stdout ?? '',
  )
  const history = join(
    state,
    'history',
    slug(specPath),
    new Date().toISOString().replaceAll(':', '-'),
  )
  mkdirSync(history, { recursive: true })
  writeFileSync(join(history, 'session.jsonl'), result.stdout ?? '')
  if (existsSync(output)) copyFileSync(output, join(history, 'report.json'))
  if (result.status !== 0)
    throw new Error(
      'Revisor não concluiu: ' +
        (result.stderr ?? result.error?.message ?? '').slice(-2000),
    )
  const docsToRead = [
    ...requiredDocs,
    specPath,
    'docs/layout.md',
    'checks.json',
  ]
  const toolAudit = auditReviewEvents(
    result.stdout ?? '',
    docsToRead,
    Object.fromEntries(
      docsToRead.map((path) => [
        path,
        readFileSync(safeFile(snapshot, path), 'utf8').split('\n').length,
      ]),
    ),
  )
  if (fingerprint(root).fingerprint !== source.fingerprint)
    throw new Error('Fonte mudou durante a revisão; relatório invalidado.')
  const report = load(output)
  if (
    !Array.isArray(report.documentsRead) ||
    docsToRead.some((path) => !report.documentsRead.includes(path)) ||
    report.documentsRead.some((path) => !toolAudit.filesRead.includes(path))
  )
    throw new Error('Declaração de leitura não corresponde aos eventos MCP.')
  const verdict = validateReport(root, specPath, report, checks)
  const cell = (value) =>
    String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')
  const table = [
    '| CA | Evidência | Status | Observação |',
    '| --- | --- | --- | --- |',
    ...report.criteria.map(
      (item) =>
        `| ${item.ca} | ${cell(item.evidence.map((e) => e.path + ':' + e.line).join('; ') || '—')} | ${item.status} | ${cell(item.notes)} |`,
    ),
    '',
    'Veredito: ' + verdict,
    '',
    ...checks.commands.map(
      (item) => `${item.name}: ${item.exitCode === 0 ? 'passou' : 'falhou'}`,
    ),
    '',
    'Fingerprint: ' + source.fingerprint,
    '',
  ].join('\n')
  writeFileSync(join(history, 'report.md'), table)
  writeFileSync(join(state, 'reports', slug(specPath) + '.md'), table)
  save(join(state, 'receipts', slug(specPath) + '.json'), {
    fingerprint: source.fingerprint,
    spec: specPath,
    verdict,
    completedAt: new Date().toISOString(),
    snapshot,
    toolAudit,
    reportHash: createHash('sha256').update(readFileSync(output)).digest('hex'),
  })
  process.stdout.write(
    JSON.stringify({ spec: specPath, verdict, report: output }) + '\n',
  )
}

export function checkGate(specPath, local = false) {
  const reportFile = join(state, 'reports', slug(specPath) + '.json')
  const receipt = load(join(state, 'receipts', slug(specPath) + '.json'))
  if (
    receipt.reportHash !==
    createHash('sha256').update(readFileSync(reportFile)).digest('hex')
  )
    throw new Error('Relatório foi alterado após a revisão.')
  const verdict = validateReport(
    root,
    specPath,
    load(reportFile),
    load(join(state, 'checks.json')),
  )
  if (verdict !== 'PRONTA' && !(local && verdict === 'VALIDADA_LOCALMENTE'))
    throw new Error('Spec não aprovada pelo verificador: ' + verdict)
  return verdict
}

async function hook(platform, event) {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  const payload = JSON.parse(input || '{}')
  mkdirSync(state, { recursive: true })
  appendFileSync(
    join(state, 'hook-events.jsonl'),
    JSON.stringify({ platform, event, at: new Date().toISOString() }) + '\n',
  )
  const session = String(
    payload.conversation_id ?? payload.session_id ?? 'default',
  )
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 100)
  const claimFile = join(state, 'claims', session + '.json')
  if (event === 'response') {
    save(claimFile, {
      specs: completionSpecs(payload.text ?? ''),
      local: /validada localmente/i.test(payload.text ?? ''),
    })
    return {}
  }
  const message = payload.last_assistant_message ?? ''
  const claims =
    platform === 'cursor' && existsSync(claimFile)
      ? load(claimFile)
      : {
          specs: completionSpecs(message),
          local: /validada localmente/i.test(message),
        }
  const failures = []
  for (const path of claims.specs) {
    try {
      checkGate(path, claims.local)
    } catch (error) {
      failures.push(path + ': ' + error.message)
    }
  }
  if (!failures.length) return {}
  const reason =
    'Conclusão bloqueada. Execute npm run verify:checks e npm run verify:spec -- <spec>, corrija o que o verificador reprovar. Não declare pronta: ' +
    failures.join('; ')
  if (platform === 'cursor') return { followup_message: reason }
  return payload.stop_hook_active
    ? { continue: false, stopReason: reason, systemMessage: reason }
    : { decision: 'block', reason }
}

try {
  if (command === 'checks') runChecks()
  else if (command === 'review') review(spec)
  else if (command === 'finish') {
    const verdict = checkGate(spec, process.argv.includes('--local'))
    save(join(state, 'completed', slug(spec) + '.json'), {
      fingerprint: fingerprint(root).fingerprint,
      spec,
      verdict,
    })
    process.stdout.write(verdict + '\n')
  } else if (command === 'hook')
    process.stdout.write(
      JSON.stringify(await hook(process.argv[3], process.argv[4])) + '\n',
    )
  else
    throw new Error(
      'Use checks, review <spec>, finish <spec> ou hook <plataforma> <evento>.',
    )
} catch (error) {
  if (command === 'hook') {
    process.stdout.write(
      JSON.stringify(
        process.argv[3] === 'cursor'
          ? {
              followup_message:
                'Falha no gate: ' +
                error.message +
                '. Não declare spec concluída.',
            }
          : { decision: 'block', reason: 'Falha no gate: ' + error.message },
      ) + '\n',
    )
  } else process.stderr.write(error.message + '\n')
  if (command === 'hook')
    process.stderr.write('Gate indisponível; conclusão de spec bloqueada.\n')
  process.exitCode = command === 'hook' ? 2 : 1
}
