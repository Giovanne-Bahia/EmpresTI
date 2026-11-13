import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
const folder = 'docs/imagens-equipamentos'
const manifest = JSON.parse(await readFile(`${folder}/manifest.json`, 'utf8'))
if (manifest.some((row) => row.decision === 'approved'))
  throw new Error('Lote aprovado: seleção bloqueada até nova revisão humana.')
const replacements = [
  ['TI-0001', 'laptop-closed', 0],
  ['TI-0002', 'laptop-isolated', 5],
  ['TI-0003', 'laptop-isolated', 8],
  ['TI-0004', 'laptop-closed', 8],
  ['TI-0005', 'monitor-isolated', 1],
  ['TI-0006', 'monitor-isolated', 10],
  ['TI-0007', 'monitor-isolated', 9],
  ['TI-0011', 'webcam-camera', 0],
  ['TI-0012', 'compact-camera-isolated', 1],
]
let rejected = []
try {
  rejected = JSON.parse(await readFile(`${folder}/rejeicoes.json`, 'utf8'))
} catch {}
for (const [patrimonio, query, index] of replacements) {
  const row = manifest.find((item) => item.patrimonio === patrimonio)
  const hit = JSON.parse(await readFile(`.image-cache/${query}.json`, 'utf8'))
    .hits[index]
  if (row.photoId === String(hit.id)) continue
  rejected.push({
    ...row,
    decision: 'rejected',
    reason:
      'Triagem: pessoa, conteúdo de tela ou tipo físico inadequado; substituído para revisão final.',
  })
  const response = await fetch(hit.largeImageURL, {
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`Download HTTP ${response.status}`)
  await sharp(Buffer.from(await response.arrayBuffer()))
    .rotate()
    .resize(800, 600, { fit: 'cover' })
    .jpeg({ quality: 88 })
    .toFile(row.file)
  const metadata = await sharp(row.file).metadata()
  if (
    metadata.width !== 800 ||
    metadata.height !== 600 ||
    metadata.format !== 'jpeg'
  )
    throw new Error('JPEG inválido.')
  Object.assign(row, {
    photoId: String(hit.id),
    sourceUrl: hit.pageURL,
    author: hit.user,
    authorUrl: `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/`,
    sha256: createHash('sha256')
      .update(await readFile(row.file))
      .digest('hex'),
    retrievedAt: new Date().toISOString(),
    decision: 'pending',
    reason: 'Aguardando aprovação humana do arquivo final/hash.',
  })
}
if (
  new Set(manifest.map((row) => row.sha256)).size !== 12 ||
  new Set(manifest.map((row) => row.photoId)).size !== 12
)
  throw new Error('Fotos repetidas.')
await writeFile(
  `${folder}/manifest.json`,
  JSON.stringify(manifest, null, 2) + '\n',
)
await writeFile(
  `${folder}/rejeicoes.json`,
  JSON.stringify(rejected, null, 2) + '\n',
)
const cells = await Promise.all(
  manifest.map(async (row, index) => ({
    input: await sharp(row.file).resize(240, 180).toBuffer(),
    left: (index % 3) * 240,
    top: Math.floor(index / 3) * 180,
  })),
)
await sharp({
  create: { width: 720, height: 720, channels: 3, background: '#080C1A' },
})
  .composite(cells)
  .jpeg()
  .toFile(`${folder}/contato.jpg`)
console.log(
  '12 fotos distintas, JPEG 800×600, manifesto e reprovações registrados. Aprovação humana pendente.',
)
