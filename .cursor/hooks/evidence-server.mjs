import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { resolve } from 'node:path'
import { safeFile } from './verification-core.mjs'

const root = resolve(process.argv[2] ?? '.')
const manifest = JSON.parse(
  readFileSync(safeFile(root, 'manifest.json'), 'utf8'),
)
const allowed = new Set(manifest.files)
const tools = [
  {
    name: 'list_files',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    description: 'Lista os arquivos selados da revisão, sem alterar nada.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'read_file',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    description:
      'Lê arquivo permitido com números de linha; não acessa arquivos fora da cópia.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        startLine: { type: 'integer', minimum: 1 },
        maxLines: { type: 'integer', minimum: 1, maximum: 300 },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
]
export function readEvidence(path, startLine = 1, maxLines = 200) {
  if (
    !allowed.has(path) ||
    !Number.isInteger(startLine) ||
    startLine < 1 ||
    !Number.isInteger(maxLines) ||
    maxLines < 1 ||
    maxLines > 300
  )
    throw new Error('Leitura fora do manifesto ou intervalo inválido.')
  const file = safeFile(root, path)
  if (/\.(png|jpe?g)$/i.test(path))
    return {
      content: [
        {
          type: 'image',
          mimeType: path.endsWith('.png') ? 'image/png' : 'image/jpeg',
          data: readFileSync(file).toString('base64'),
        },
      ],
    }
  const lines = readFileSync(file, 'utf8').split('\n')
  return {
    content: [
      {
        type: 'text',
        text:
          `Arquivo: ${path}; total de linhas: ${lines.length}; intervalo ${startLine} a ${Math.min(lines.length, startLine + maxLines - 1)}. Leia os intervalos restantes até o final.\n` +
          lines
            .slice(startLine - 1, startLine - 1 + maxLines)
            .map((line, index) => `${startLine + index}: ${line}`)
            .join('\n'),
      },
    ],
  }
}
const input = createInterface({ input: process.stdin })
for await (const line of input) {
  let request
  try {
    request = JSON.parse(line)
    if (request.id === undefined) continue
    let result
    if (request.method === 'initialize')
      result = {
        protocolVersion: request.params?.protocolVersion ?? '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'empresti-evidence', version: '1.0.0' },
      }
    else if (request.method === 'ping') result = {}
    else if (request.method === 'tools/list') result = { tools }
    else if (request.method === 'tools/call') {
      if (request.params.name === 'list_files')
        result = { content: [{ type: 'text', text: JSON.stringify(manifest) }] }
      else if (request.params.name === 'read_file') {
        const args = request.params.arguments ?? {}
        result = readEvidence(args.path, args.startLine, args.maxLines)
      } else throw new Error('Ferramenta não permitida.')
    } else throw new Error('Método não permitido.')
    process.stdout.write(
      JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) + '\n',
    )
  } catch {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: request?.id ?? null,
        error: {
          code: -32602,
          message: 'Operação inválida ou fora do manifesto.',
        },
      }) + '\n',
    )
  }
}
