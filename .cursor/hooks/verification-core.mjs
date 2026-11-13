import { createHash } from 'node:crypto'
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
} from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'

export const registry = {
  'docs/specs/dados-iniciais.md': ['CA-DI-10'],
  'docs/specs/solicitar-emprestimo.md': ['CA-SE-14'],
}
const roots = [
  'src',
  'tests',
  'docs',
  'rules',
  'prisma',
  'assets',
  '.cursor/hooks',
  '.cursor/agents',
  '.codex/agents',
  '.agents/skills',
  '.cursor/skills',
  '.github/workflows',
]
const rootFiles = [
  'AGENTS.md',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'next.config.js',
  'prisma.config.ts',
  'vitest.config.mts',
  'vitest.integration.config.mts',
  'vitest.setup.ts',
  'playwright.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'eslint.config.mjs',
  '.cursor/hooks.json',
  '.codex/hooks.json',
]
const extensions =
  /\.(?:md|ts|tsx|mts|mjs|js|json|toml|ya?ml|prisma|sql|png|jpe?g)$/i

export function safeFile(root, name) {
  if (
    typeof name !== 'string' ||
    !name ||
    isAbsolute(name) ||
    name.includes('\\') ||
    name
      .split('/')
      .some((part) => !part || part === '..' || part.startsWith('.env'))
  )
    throw new Error('Caminho de evidência inválido.')
  const base = realpathSync(root)
  const target = resolve(base, name)
  if (!target.startsWith(base + sep))
    throw new Error('Caminho fora da cópia de evidências.')
  let cursor = base
  for (const part of name.split('/')) {
    cursor = join(cursor, part)
    if (lstatSync(cursor).isSymbolicLink())
      throw new Error('Links não são evidência permitida.')
  }
  if (
    !realpathSync(target).startsWith(base + sep) ||
    !lstatSync(target).isFile()
  )
    throw new Error('Evidência não é arquivo regular.')
  return target
}

export function sourceFiles(root) {
  const found = []
  function walk(name) {
    const target = join(root, name)
    if (!existsSync(target)) return
    const stat = lstatSync(target)
    if (stat.isSymbolicLink())
      throw new Error('Fonte com link simbólico: ' + name)
    if (stat.isDirectory()) {
      for (const child of readdirSync(target).sort()) {
        if (
          child.startsWith('.') ||
          ['node_modules', 'coverage'].includes(child)
        )
          continue
        if ((name + '/' + child).startsWith('docs/evidencias/verificador-'))
          continue
        walk(name + '/' + child)
      }
    } else if (
      extensions.test(name) &&
      !name.split('/').some((part) => part.startsWith('.env')) &&
      !name.endsWith('mcp.json')
    ) {
      found.push(name)
    }
  }
  for (const name of [...rootFiles, ...roots]) walk(name)
  return [...new Set(found)].sort()
}

export function fingerprint(root) {
  const files = sourceFiles(root)
  const hash = createHash('sha256')
  for (const name of files) {
    hash.update(name + '\0')
    hash.update(readFileSync(safeFile(root, name)))
    hash.update('\0')
  }
  return { fingerprint: hash.digest('hex'), files }
}

export function criteria(text) {
  return [...text.matchAll(/^\s*-\s+\*\*(CA-[A-Z0-9-]+)[.:]/gm)].map(
    (match) => match[1],
  )
}

export function validateReport(root, spec, report, checks) {
  if (!Object.hasOwn(registry, spec))
    throw new Error('Spec fora do registro da prática.')
  const source = fingerprint(root)
  const current = source.fingerprint
  if (report.fingerprint !== current || checks.fingerprint !== current)
    throw new Error('Evidência desatualizada: fonte foi alterada.')
  if (report.spec !== spec || !Array.isArray(report.criteria))
    throw new Error('Relatório não corresponde à spec.')
  const ids = criteria(readFileSync(safeFile(root, spec), 'utf8'))
  if (!ids.length || new Set(ids).size !== ids.length)
    throw new Error('Spec sem critérios únicos.')
  const actual = report.criteria.map((item) => item.ca)
  if (
    actual.length !== ids.length ||
    new Set(actual).size !== ids.length ||
    ids.some((id) => !actual.includes(id))
  )
    throw new Error('Relatório omitiu ou duplicou critério.')
  const required = [
    'lint',
    'typecheck',
    'test',
    'test:verifier',
    'build',
    'test:auth',
  ]
  if (
    !Array.isArray(checks.commands) ||
    required.some(
      (name) => !checks.commands.some((command) => command.name === name),
    )
  )
    throw new Error('Checks obrigatórios ausentes.')
  const checksPassed = checks.commands.every(
    (command) => command.exitCode === 0,
  )
  for (const command of checks.commands) {
    const content = readFileSync(
      safeFile(join(root, '.verification'), command.log),
    )
    if (createHash('sha256').update(content).digest('hex') !== command.sha256)
      throw new Error('Log de check alterado.')
  }
  const statuses = [
    'ATENDIDO',
    'REPROVADO',
    'SEM_TESTE',
    'AMBIGUO',
    'PENDENTE_PRODUCAO',
  ]
  for (const item of report.criteria) {
    if (!statuses.includes(item.status) || !Array.isArray(item.evidence))
      throw new Error('Critério em formato inválido.')
    if (
      item.status === 'PENDENTE_PRODUCAO' &&
      !registry[spec].includes(item.ca)
    )
      throw new Error('Pendência de produção em critério local.')
    for (const evidence of item.evidence) {
      const isLog = checks.commands.some(
        (command) => command.log === evidence.path,
      )
      if (!source.files.includes(evidence.path) && !isLog)
        throw new Error('Evidência fora da fonte selada.')
      const file = safeFile(
        isLog ? join(root, '.verification') : root,
        evidence.path,
      )
      if (
        !Number.isInteger(evidence.line) ||
        evidence.line < 1 ||
        evidence.line > readFileSync(file, 'utf8').split('\n').length
      )
        throw new Error('Linha de evidência inválida.')
    }
    if (item.status === 'ATENDIDO') {
      const tests = item.evidence.filter((evidence) => evidence.kind === 'test')
      if (
        !tests.some(
          (evidence) =>
            /\.(test|spec)\./.test(evidence.path) &&
            readFileSync(safeFile(root, evidence.path), 'utf8').includes(
              item.ca,
            ),
        )
      )
        throw new Error('CA atendido sem teste que cite o ID.')
      if (
        registry[spec].includes(item.ca) &&
        !item.evidence.some(
          (evidence) =>
            evidence.kind === 'manual' &&
            evidence.path.startsWith('docs/evidencias/producao-') &&
            source.files.includes(evidence.path),
        )
      )
        throw new Error('CA de produção sem evidência humana.')
    }
  }
  const all = report.criteria.every((item) => item.status === 'ATENDIDO')
  const local = report.criteria.every(
    (item) =>
      item.status === 'ATENDIDO' ||
      (registry[spec].includes(item.ca) && item.status === 'PENDENTE_PRODUCAO'),
  )
  if (!Array.isArray(report.outOfScope))
    throw new Error('Lista de escopo ausente.')
  const expected =
    !checksPassed || report.outOfScope.length
      ? 'NAO_PRONTA'
      : all
        ? 'PRONTA'
        : local
          ? 'VALIDADA_LOCALMENTE'
          : 'NAO_PRONTA'
  if (report.verdict !== expected)
    throw new Error('Veredito incompatível com os critérios.')
  if (
    !Array.isArray(report.outOfScope) ||
    (report.outOfScope.length && expected !== 'NAO_PRONTA')
  )
    throw new Error('Excesso de escopo impede aprovação.')
  return expected
}

export function completionSpecs(message) {
  if (typeof message !== 'string') return []
  const sentences = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/\n|[!?]|\.(?=\s|$)/)
  return Object.keys(registry).filter((spec) =>
    sentences.some((sentence) => {
      if (
        /\b(nao|pendente|aguardando|sera|ficara|devera)\b/.test(sentence) ||
        /para (aprovacao|revisao|implementacao|implementar)/.test(sentence)
      )
        return false
      const slug = spec.split('/').at(-1).replace('.md', '')
      const mentioned =
        sentence.includes(spec) ||
        sentence.includes(slug) ||
        sentence.includes(slug.replaceAll('-', ' ')) ||
        (slug === 'solicitar-emprestimo' &&
          sentence.includes('solicitacao de emprestimo'))
      return (
        mentioned &&
        /\b(pront[ao]s?|concluid[ao]s?|implementad[ao]s?|finalizad[ao]s?|validad[ao]s?)\b/.test(
          sentence,
        )
      )
    }),
  )
}

export function reviewToolAllowed(name) {
  return (
    typeof name === 'string' &&
    /^mcp__evidence__(list_files|read_file)$/.test(name)
  )
}

export function auditReviewEvents(text, required, lengths = {}) {
  const reads = new Set()
  const ranges = new Map()
  let calls = 0
  for (const line of text.split('\n').filter(Boolean)) {
    const event = JSON.parse(line)
    const item = event.item
    if (!item) continue
    if (
      [
        'command_execution',
        'file_change',
        'web_search',
        'collab_tool_call',
      ].includes(item.type)
    )
      throw new Error(
        'Revisor utilizou ferramenta fora do leitor de evidências.',
      )
    if (event.type !== 'item.completed' || item.type !== 'mcp_tool_call')
      continue
    if (
      item.server !== 'evidence' ||
      !['read_file', 'list_files'].includes(item.tool)
    )
      throw new Error('Servidor ou ferramenta externa na revisão.')
    calls++
    if (
      item.tool === 'read_file' &&
      !item.error &&
      !item.result?.isError &&
      item.status !== 'failed'
    ) {
      const args =
        typeof item.arguments === 'string'
          ? JSON.parse(item.arguments)
          : item.arguments
      if (args?.path) {
        reads.add(args.path)
        const start = args.startLine ?? 1
        ranges.set(args.path, [
          ...(ranges.get(args.path) ?? []),
          [start, start + (args.maxLines ?? 200) - 1],
        ])
      }
    }
  }
  if (required.some((path) => !reads.has(path)))
    throw new Error('O revisor não leu todas as fontes obrigatórias pelo MCP.')
  for (const path of required) {
    if (!lengths[path]) continue
    let covered = 0
    for (const [start, end] of ranges.get(path).sort((a, b) => a[0] - b[0])) {
      if (start > covered + 1) break
      covered = Math.max(covered, end)
    }
    if (covered < lengths[path])
      throw new Error('Leitura incompleta de documento obrigatório: ' + path)
  }
  return { calls, filesRead: [...reads].sort() }
}

export function relativeName(root, file) {
  return relative(root, file).split(sep).join('/')
}
