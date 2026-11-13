import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  auditReviewEvents,
  completionSpecs,
  fingerprint,
  reviewToolAllowed,
  safeFile,
  validateReport,
} from '../.cursor/hooks/verification-core.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const spec = 'docs/specs/dados-iniciais.md'
const fixture = (t) => {
  const root = mkdtempSync(join(tmpdir(), 'empresti-verifier-test-'))
  t.after(() => {
    if (
      dirname(root) !== resolve(tmpdir()) ||
      !basename(root).startsWith('empresti-verifier-test-')
    )
      throw new Error('Alvo de limpeza inválido.')
    rmSync(root, { recursive: true, force: true })
  })
  const put = (name, text) => {
    mkdirSync(dirname(join(root, name)), { recursive: true })
    writeFileSync(join(root, name), text)
  }
  put(spec, '# Fixture sintética\n- **CA-DI-01:** regra de teste\n')
  put(
    'src/item.test.ts',
    "it('CA-DI-01 e CA-DI-10', () => expect(true).toBe(true))\n",
  )
  put('.env', 'DO_NOT_COPY=this-is-a-fixture-not-a-secret\n')
  const logs = [
    'lint',
    'typecheck',
    'test',
    'test:verifier',
    'build',
    'test:auth',
  ].map((name) => {
    const log = `checks/${name.replaceAll(':', '-')}.log`
    put('.verification/' + log, 'fixture sintética: execução não real\n')
    return {
      name,
      log,
      exitCode: 0,
      sha256: createHash('sha256')
        .update('fixture sintética: execução não real\n')
        .digest('hex'),
    }
  })
  const checks = { fingerprint: fingerprint(root).fingerprint, commands: logs }
  const report = {
    spec,
    fingerprint: checks.fingerprint,
    criteria: [
      {
        ca: 'CA-DI-01',
        status: 'ATENDIDO',
        evidence: [{ path: 'src/item.test.ts', line: 1, kind: 'test' }],
        notes: 'fixture sintética',
      },
    ],
    outOfScope: [],
    verdict: 'PRONTA',
  }
  return {
    root,
    put,
    checks,
    report,
    refresh() {
      checks.fingerprint = report.fingerprint = fingerprint(root).fingerprint
    },
  }
}

test('gate aceita fixture íntegra e invalida fonte alterada', (t) => {
  const f = fixture(t)
  assert.equal(validateReport(f.root, spec, f.report, f.checks), 'PRONTA')
  f.put('src/item.test.ts', '// fonte mudou\n')
  assert.throws(
    () => validateReport(f.root, spec, f.report, f.checks),
    /desatualizada/,
  )
})

test('fingerprint exclui env e inclui configuração do harness', (t) => {
  const f = fixture(t)
  const original = fingerprint(f.root).fingerprint
  f.put('.env', 'outro valor sintético\n')
  assert.equal(fingerprint(f.root).fingerprint, original)
  f.put('.cursor/hooks.json', '{}')
  assert.notEqual(fingerprint(f.root).fingerprint, original)
  const withHook = fingerprint(f.root).fingerprint
  f.put('.agents/skills/example/SKILL.md', '# Skill sintética')
  assert.notEqual(fingerprint(f.root).fingerprint, withHook)
})

test('alteração de workflow YAML invalida recibo e fingerprint', (t) => {
  const f = fixture(t)
  for (const extension of ['yml', 'yaml']) {
    const path = `.github/workflows/checks.${extension}`
    f.put(path, 'name: checks\njobs: {}\n')
    f.refresh()
    const before = fingerprint(f.root)
    assert.ok(before.files.includes(path))
    f.put(path, 'name: checks alterados\njobs: {}\n')
    assert.notEqual(fingerprint(f.root).fingerprint, before.fingerprint)
    assert.throws(
      () => validateReport(f.root, spec, f.report, f.checks),
      /desatualizada/,
    )
  }
})

test('gate rejeita log adulterado e veredito sem prova', (t) => {
  const f = fixture(t)
  f.report.criteria[0].evidence = []
  assert.throws(
    () => validateReport(f.root, spec, f.report, f.checks),
    /sem teste/,
  )
  f.put('.verification/checks/lint.log', 'log alterado')
  assert.throws(() => validateReport(f.root, spec, f.report, f.checks), /Log/)
})

test('relatório pode citar log autenticado sem confundi-lo com prova humana', (t) => {
  const f = fixture(t)
  f.report.criteria[0] = {
    ca: 'CA-DI-01',
    status: 'SEM_TESTE',
    evidence: [{ path: 'checks/test-auth.log', line: 1, kind: 'log' }],
  }
  f.report.verdict = 'NAO_PRONTA'
  assert.equal(validateReport(f.root, spec, f.report, f.checks), 'NAO_PRONTA')
})

test('gate rejeita omissão, duplicação e status indevido de CA', (t) => {
  const f = fixture(t)
  f.report.criteria = []
  assert.throws(
    () => validateReport(f.root, spec, f.report, f.checks),
    /omitiu/,
  )
  f.report.criteria = [
    { ca: 'CA-DI-01', status: 'PENDENTE_PRODUCAO', evidence: [] },
  ]
  assert.throws(
    () => validateReport(f.root, spec, f.report, f.checks),
    /critério local/,
  )
})

test('falha de check e excesso de escopo exigem reprovação', (t) => {
  const f = fixture(t)
  f.checks.commands[0].exitCode = 1
  assert.throws(
    () => validateReport(f.root, spec, f.report, f.checks),
    /Veredito/,
  )
  f.report.verdict = 'NAO_PRONTA'
  assert.equal(validateReport(f.root, spec, f.report, f.checks), 'NAO_PRONTA')
  f.checks.commands[0].exitCode = 0
  f.report.outOfScope = ['src/item.test.ts:1 comportamento excedente sintético']
  assert.equal(validateReport(f.root, spec, f.report, f.checks), 'NAO_PRONTA')
})

test('produção pendente permite só validação local; aprovação exige evidência humana', (t) => {
  const f = fixture(t)
  f.put(spec, '# Fixture\n- **CA-DI-01:** local\n- **CA-DI-10:** produção\n')
  f.refresh()
  f.report.criteria.push({
    ca: 'CA-DI-10',
    status: 'PENDENTE_PRODUCAO',
    evidence: [],
  })
  f.report.verdict = 'VALIDADA_LOCALMENTE'
  assert.equal(
    validateReport(f.root, spec, f.report, f.checks),
    'VALIDADA_LOCALMENTE',
  )
  f.report.criteria[1] = {
    ca: 'CA-DI-10',
    status: 'ATENDIDO',
    evidence: [{ path: 'src/item.test.ts', line: 1, kind: 'test' }],
  }
  f.report.verdict = 'PRONTA'
  assert.throws(
    () => validateReport(f.root, spec, f.report, f.checks),
    /humana/,
  )
})

test('leitor rejeita traversal, env e junction externa', (t) => {
  const f = fixture(t)
  assert.throws(() => safeFile(f.root, '../outside.txt'))
  assert.throws(() => safeFile(f.root, '.env'))
  assert.throws(() => safeFile(f.root, '/outside.txt'))
  const outside = mkdtempSync(join(tmpdir(), 'empresti-verifier-test-'))
  t.after(() => {
    if (
      dirname(outside) === resolve(tmpdir()) &&
      basename(outside).startsWith('empresti-verifier-test-')
    )
      rmSync(outside, { recursive: true, force: true })
  })
  writeFileSync(join(outside, 'outside.txt'), 'fora')
  symlinkSync(
    outside,
    join(f.root, 'external'),
    process.platform === 'win32' ? 'junction' : 'dir',
  )
  assert.throws(() => safeFile(f.root, 'external/outside.txt'), /Links/)
})

test('detecção de conclusão não depende de comando manual e respeita negativa', () => {
  assert.deepEqual(
    completionSpecs('A spec docs/specs/dados-iniciais.md está pronta.'),
    [spec],
  )
  assert.deepEqual(completionSpecs('Dados iniciais implementados.'), [spec])
  assert.deepEqual(
    completionSpecs('A spec dados-iniciais está pronta para aprovação.'),
    [],
  )
  assert.deepEqual(
    completionSpecs('A solicitação de empréstimo está concluída.'),
    ['docs/specs/solicitar-emprestimo.md'],
  )
  assert.deepEqual(completionSpecs('A spec dados iniciais está concluída.'), [
    spec,
  ])
  assert.deepEqual(
    completionSpecs('A spec dados-iniciais não está pronta.'),
    [],
  )
  assert.deepEqual(
    completionSpecs('Etapa 3 concluída; specs aguardando implementação.'),
    [],
  )
})

test('auditoria aceita só leitura MCP real e rejeita execução ou conectores externos', () => {
  assert.equal(reviewToolAllowed('mcp__evidence__read_file'), true)
  for (const name of [
    'exec_command',
    'apply_patch',
    'mcp__supabase__execute_sql',
    'mcp__vercel__deploy',
    'mcp__evidence__write_file',
  ])
    assert.equal(reviewToolAllowed(name), false)
  const event = {
    type: 'item.completed',
    item: {
      type: 'mcp_tool_call',
      server: 'evidence',
      tool: 'read_file',
      arguments: { path: 'AGENTS.md' },
      error: null,
    },
  }
  assert.deepEqual(
    auditReviewEvents(JSON.stringify(event), ['AGENTS.md']).filesRead,
    ['AGENTS.md'],
  )
  assert.throws(
    () => auditReviewEvents(JSON.stringify(event), ['rules/check.md']),
    /não leu/,
  )
  assert.throws(
    () =>
      auditReviewEvents(
        JSON.stringify({ item: { type: 'command_execution' } }),
        [],
      ),
    /fora/,
  )
  event.item.server = 'supabase'
  assert.throws(() => auditReviewEvents(JSON.stringify(event), []), /externa/)
})

test('MCP expõe só listar/ler e recusa escrita e arquivos fora do manifesto', (t) => {
  const f = fixture(t)
  f.put('manifest.json', JSON.stringify({ files: ['src/item.test.ts'] }))
  const requests = [
    { id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } },
    { id: 2, method: 'tools/list' },
    {
      id: 3,
      method: 'tools/call',
      params: { name: 'read_file', arguments: { path: 'src/item.test.ts' } },
    },
    {
      id: 4,
      method: 'tools/call',
      params: { name: 'read_file', arguments: { path: '.env' } },
    },
    {
      id: 5,
      method: 'tools/call',
      params: {
        name: 'write_file',
        arguments: { path: 'src/item.test.ts', text: 'alterado' },
      },
    },
  ]
  const result = spawnSync(
    process.execPath,
    [join(repo, '.cursor/hooks/evidence-server.mjs'), f.root],
    {
      input:
        requests
          .map((value) => JSON.stringify({ jsonrpc: '2.0', ...value }))
          .join('\n') + '\n',
      encoding: 'utf8',
    },
  )
  assert.equal(result.status, 0, result.stderr)
  const output = result.stdout
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
  assert.deepEqual(
    output[1].result.tools.map((tool) => tool.name),
    ['list_files', 'read_file'],
  )
  assert.match(output[2].result.content[0].text, /1: it/)
  assert.ok(
    output[1].result.tools.every(
      (tool) =>
        tool.annotations.readOnlyHint === true &&
        tool.annotations.destructiveHint === false &&
        tool.annotations.openWorldHint === false,
    ),
  )
  assert.ok(output[3].error)
  assert.ok(output[4].error)
  assert.match(readFileSync(join(f.root, 'src/item.test.ts'), 'utf8'), /^it/)
})

test('hooks Codex e Cursor bloqueiam conclusão sem relatório e permitem relato parcial', (t) => {
  const f = fixture(t)
  for (const name of ['verification.mjs', 'verification-core.mjs']) {
    const dest = join(f.root, '.cursor/hooks', name)
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(join(repo, '.cursor/hooks', name), dest)
  }
  const run = (platform, event, input) => {
    const result = spawnSync(
      process.execPath,
      [join(f.root, '.cursor/hooks/verification.mjs'), 'hook', platform, event],
      { input: JSON.stringify(input), encoding: 'utf8' },
    )
    assert.equal(result.status, 0, result.stderr)
    return JSON.parse(result.stdout)
  }
  const claim = 'A spec docs/specs/dados-iniciais.md está pronta.'
  assert.equal(
    run('codex', 'stop', { last_assistant_message: claim }).decision,
    'block',
  )
  assert.deepEqual(
    run('codex', 'stop', {
      last_assistant_message: 'A spec dados-iniciais não está pronta.',
    }),
    {},
  )
  run('cursor', 'response', { text: claim, conversation_id: 'fixture' })
  assert.match(
    run('cursor', 'stop', { conversation_id: 'fixture' }).followup_message,
    /bloqueada/,
  )
  const malformed = spawnSync(
    process.execPath,
    [join(f.root, '.cursor/hooks/verification.mjs'), 'hook', 'codex', 'stop'],
    { input: '{invalid', encoding: 'utf8' },
  )
  assert.equal(malformed.status, 2)
  assert.match(malformed.stderr, /bloqueada/)
})
