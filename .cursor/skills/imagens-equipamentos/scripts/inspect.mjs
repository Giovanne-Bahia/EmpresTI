import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
const [slug, photoId] = process.argv.slice(2)
if (!/^[a-z0-9-]+$/.test(slug ?? '') || !/^\d+$/.test(photoId ?? ''))
  throw new Error('Informe cache e ID numérico da foto.')
const data = JSON.parse(await readFile(`.image-cache/${slug}.json`, 'utf8'))
const hit = data.hits.find((item) => String(item.id) === photoId)
if (!hit || hit.type !== 'photo')
  throw new Error('Fotografia não encontrada no resultado inspecionado.')
const original = `.image-cache/${photoId}.original`
let bytes
try {
  bytes = await readFile(original)
} catch {
  const url = new URL(hit.largeImageURL)
  if (
    url.protocol !== 'https:' ||
    !['pixabay.com', 'cdn.pixabay.com'].includes(url.hostname)
  )
    throw new Error('Origem inesperada.')
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new Error(`Download HTTP ${response.status}`)
  bytes = Buffer.from(await response.arrayBuffer())
  await writeFile(original, bytes)
}
const file = `.image-cache/candidate-${photoId}.jpg`
const crop = process.argv.slice(4).map(Number)
if (
  crop.length &&
  (crop.length !== 4 ||
    crop.some((value) => !Number.isInteger(value) || value < 0) ||
    crop[2] === 0 ||
    crop[3] === 0 ||
    crop[2] * 3 !== crop[3] * 4)
)
  throw new Error('Recorte deve ter quatro inteiros e proporção 4:3.')
let image = sharp(bytes).rotate()
if (crop.length)
  image = image.extract({
    left: crop[0],
    top: crop[1],
    width: crop[2],
    height: crop[3],
  })
await image
  .resize(800, 600, { fit: 'cover' })
  .jpeg({ quality: 88 })
  .toFile(file)
const metadata = await sharp(file).metadata()
console.log(
  JSON.stringify({
    photoId,
    file,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    tags: hit.tags,
  }),
)
