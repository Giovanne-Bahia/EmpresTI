import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
const queries = [
  'laptop closed',
  'monitor isolated',
  'webcam camera',
  'compact camera isolated',
]
await mkdir('.image-cache', { recursive: true })
for (const query of queries) {
  const slug = query.replaceAll(' ', '-')
  const file = `.image-cache/${slug}.json`
  let data
  try {
    data = JSON.parse(await readFile(file, 'utf8'))
  } catch {
    const url = new URL('https://pixabay.com/api/')
    url.search = new URLSearchParams({
      key: process.env.PIXABAY_API_KEY,
      q: query,
      image_type: 'photo',
      safesearch: 'true',
      per_page: '20',
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
    const response = await fetch(hits[i].previewURL)
    if (!response.ok) continue
    const input = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(180, 135, { fit: 'contain', background: '#080C1A' })
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
  console.log(`${query}: ${hits.length} alternativas para triagem.`)
}
