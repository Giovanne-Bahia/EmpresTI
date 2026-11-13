import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import sharp from 'sharp'
const defaults = [
  'laptop closed',
  'monitor isolated',
  'webcam camera',
  'compact camera isolated',
]
const latest = process.argv.includes('--latest')
const requestedQueries = process.argv
  .slice(2)
  .filter((value) => value !== '--latest')
const queries = requestedQueries.length ? requestedQueries : defaults
if (
  queries.length > 8 ||
  queries.some((query) => !/^[a-z0-9 -]{1,100}(?:@[1-3])?$/i.test(query))
)
  throw new Error(
    'Use até oito consultas curtas; @2 ou @3 seleciona uma página alternativa.',
  )
if (!process.env.PIXABAY_API_KEY)
  throw new Error('Configure PIXABAY_API_KEY localmente.')
await mkdir('.image-cache', { recursive: true })
for (const term of queries) {
  const [query, requestedPage] = term.split('@')
  const page = Number(requestedPage ?? 1)
  const slug =
    query.replaceAll(' ', '-') +
    (page > 1 ? `-page-${page}` : '') +
    (latest ? '-latest' : '')
  const file = `.image-cache/${slug}.json`
  let data
  try {
    if (Date.now() - (await stat(file)).mtimeMs < 86400000)
      data = JSON.parse(await readFile(file, 'utf8'))
  } catch {
    // Cache ausente; consultar a API sem imprimir a URL autenticada.
  }
  if (!data) {
    const url = new URL('https://pixabay.com/api/')
    url.search = new URLSearchParams({
      key: process.env.PIXABAY_API_KEY,
      q: query,
      image_type: 'photo',
      safesearch: 'true',
      per_page: '20',
      page: String(page),
      order: latest ? 'latest' : 'popular',
      min_width: '800',
      min_height: '600',
    }).toString()
    const response = await fetch(url, {
      signal: AbortSignal.timeout(20000),
    }).catch(() => {
      throw new Error('Falha de rede Pixabay; URL omitida.')
    })
    if (!response.ok) throw new Error(`Pixabay HTTP ${response.status}`)
    data = await response.json()
    await writeFile(file, JSON.stringify(data))
  }
  const hits = data.hits.slice(0, 20)
  const cells = []
  for (let i = 0; i < hits.length; i++) {
    const preview = `.image-cache/${hits[i].id}.preview`
    let bytes
    try {
      bytes = await readFile(preview)
    } catch {
      const response = await fetch(hits[i].previewURL, {
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) continue
      bytes = Buffer.from(await response.arrayBuffer())
      await writeFile(preview, bytes)
    }
    const label = Buffer.from(
      `<svg width="180" height="25"><rect width="180" height="25" fill="#080C1A"/><text x="6" y="17" fill="white" font-size="13">${i}: ${hits[i].id}</text></svg>`,
    )
    const input = await sharp(bytes)
      .resize(180, 110, { fit: 'contain', background: '#080C1A' })
      .extend({ bottom: 25, background: '#080C1A' })
      .composite([{ input: label, left: 0, top: 110 }])
      .toBuffer()
    cells.push({ input, left: (i % 4) * 180, top: Math.floor(i / 4) * 135 })
  }
  if (cells.length)
    await sharp({
      create: {
        width: 720,
        height: Math.ceil(hits.length / 4) * 135,
        channels: 3,
        background: '#080C1A',
      },
    })
      .composite(cells)
      .jpeg()
      .toFile(`.image-cache/${slug}-review.jpg`)
  console.log(
    `${query}, página ${page}: ${hits.length} alternativas para triagem.`,
  )
}
