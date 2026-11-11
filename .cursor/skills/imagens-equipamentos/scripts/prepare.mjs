import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const cache = '.image-cache'
const output = 'docs/imagens-equipamentos'
await mkdir(cache, { recursive: true })
await mkdir(output, { recursive: true })
const groups = [
  ['laptop computer', ['TI-0001', 'TI-0002', 'TI-0003', 'TI-0004']],
  ['computer monitor', ['TI-0005', 'TI-0006', 'TI-0007']],
  ['hdmi cable', ['TI-0008']],
  ['usb c cable', ['TI-0009']],
  ['ethernet cable', ['TI-0010']],
  ['webcam', ['TI-0011']],
  ['compact camera', ['TI-0012']],
]
const key = process.env.PIXABAY_API_KEY
if (!key) throw new Error('Configure PIXABAY_API_KEY localmente.')
const manifest = []
const used = new Set()
for (const [query, patrimonios] of groups) {
  const cacheFile = `${cache}/${query.replaceAll(' ', '-')}.json`
  let data
  try {
    if (Date.now() - (await stat(cacheFile)).mtimeMs < 86400000)
      data = JSON.parse(await readFile(cacheFile, 'utf8'))
  } catch {}
  if (!data) {
    const url = new URL('https://pixabay.com/api/')
    url.search = new URLSearchParams({
      key,
      q: query,
      image_type: 'photo',
      safesearch: 'true',
      min_width: '800',
      min_height: '600',
      per_page: '20',
    }).toString()
    const response = await fetch(url, {
      signal: AbortSignal.timeout(20000),
    }).catch(() => {
      throw new Error(
        'Falha de rede no Pixabay; requisição omitida por segurança.',
      )
    })
    if (!response.ok)
      throw new Error(`Pixabay respondeu HTTP ${response.status}.`)
    data = await response.json()
    await writeFile(cacheFile, JSON.stringify(data))
  }
  const candidates = data.hits.filter((hit) => !used.has(hit.id))
  for (const patrimonio of patrimonios) {
    const hit = candidates.shift()
    if (!hit) {
      console.log(`${patrimonio}: sem candidato; selecionar manualmente.`)
      continue
    }
    used.add(hit.id)
    const original = `${cache}/${hit.id}.original`
    let bytes
    try {
      bytes = await readFile(original)
    } catch {
      const response = await fetch(hit.largeImageURL, {
        signal: AbortSignal.timeout(20000),
      })
      if (!response.ok)
        throw new Error(`Download ${hit.id}: HTTP ${response.status}.`)
      bytes = Buffer.from(await response.arrayBuffer())
      await writeFile(original, bytes)
    }
    const file = `${output}/${patrimonio}.jpg`
    await sharp(bytes)
      .rotate()
      .resize(800, 600, { fit: 'cover' })
      .jpeg({ quality: 88 })
      .toFile(file)
    const metadata = await sharp(file).metadata()
    if (
      metadata.width !== 800 ||
      metadata.height !== 600 ||
      metadata.format !== 'jpeg'
    )
      throw new Error('Dimensões inválidas.')
    const sha256 = createHash('sha256')
      .update(await readFile(file))
      .digest('hex')
    manifest.push({
      patrimonio,
      provider: 'Pixabay',
      photoId: String(hit.id),
      sourceUrl: hit.pageURL,
      author: hit.user,
      authorUrl: `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/`,
      licenseUrl: 'https://pixabay.com/service/license-summary/',
      retrievedAt: new Date().toISOString(),
      file,
      sha256,
      width: 800,
      height: 600,
      decision: 'pending',
      reason: 'Aguardando triagem e aprovação humana dos hashes.',
    })
  }
}
await writeFile(
  `${output}/manifest.json`,
  JSON.stringify(manifest, null, 2) + '\n',
)
const cells = await Promise.all(
  manifest.map(async (item, index) => {
    const image = await sharp(item.file).resize(240, 180).toBuffer()
    return {
      input: image,
      left: (index % 3) * 240,
      top: Math.floor(index / 3) * 180,
    }
  }),
)
if (cells.length)
  await sharp({
    create: {
      width: 720,
      height: Math.ceil(cells.length / 3) * 180,
      channels: 3,
      background: '#080C1A',
    },
  })
    .composite(cells)
    .jpeg()
    .toFile(`${output}/contato.jpg`)
console.log(
  `${manifest.length} candidatos preparados. Ordem da folha: patrimônio crescente. Nenhuma foto aprovada automaticamente.`,
)
