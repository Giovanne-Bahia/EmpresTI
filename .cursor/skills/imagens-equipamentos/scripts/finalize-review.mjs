import { readFile, writeFile, copyFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
const folder = 'docs/imagens-equipamentos'
const rows = JSON.parse(await readFile(`${folder}/manifest.json`, 'utf8'))
if (rows.some((row) => row.decision === 'approved'))
  throw new Error(
    'Lote aprovado: não sobrescrever arquivos sem nova revisão e aprovação humana.',
  )
const rejected = JSON.parse(await readFile(`${folder}/rejeicoes.json`, 'utf8'))
const replacements = [
  [
    'TI-0001',
    'laptop-mockup',
    '1851043',
    'Notebook anterior com logo legível; nova cena com tela vazia.',
  ],
  [
    'TI-0003',
    'laptop',
    '1846277',
    'Notebook anterior com marca Lenovo/ThinkPad legível; nova foto sem marca visível.',
  ],
  [
    'TI-0004',
    'computer-desk-black-screen',
    '925595',
    'Substituído por cena ampla com tela vazia, sem marca visível.',
  ],
  [
    'TI-0007',
    'computer-monitor-page-2',
    '5999978',
    'Logo no candidato anterior; novo monitor visto de perfil.',
  ],
  [
    'TI-0008',
    'hdmi-plug',
    '1827',
    'Inscrição HDMI legível no candidato anterior.',
  ],
  [
    'TI-0009',
    'usb-c-connector',
    '1281041',
    'Substituído por fotografia específica do conector USB-C sem inscrições.',
  ],
  [
    'TI-0011',
    'webcam-page-2',
    '1163880',
    'Inscrições de resolução na webcam anterior; nova candidata de videoconferência.',
  ],
  [
    'TI-0012',
    'compact-digital-camera-page-3',
    '7703231',
    'Inscrições legíveis no candidato anterior; nova câmera compacta em tripé.',
  ],
]
for (const [patrimonio, cache, id, reason] of replacements) {
  const row = rows.find((item) => item.patrimonio === patrimonio)
  const hit = JSON.parse(
    await readFile(`.image-cache/${cache}.json`, 'utf8'),
  ).hits.find((item) => String(item.id) === id)
  if (!hit || hit.type !== 'photo')
    throw new Error('Origem da fotografia não confirmada.')
  const candidate = `.image-cache/candidate-${id}.jpg`
  const bytes = await readFile(candidate)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (row.sha256 !== sha256)
    rejected.push({
      ...row,
      decision: 'rejected',
      reason,
      rejectedAt: new Date().toISOString(),
    })
  await copyFile(candidate, row.file)
  Object.assign(row, {
    photoId: id,
    sourceUrl: hit.pageURL,
    author: hit.user,
    authorUrl: `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/`,
    sha256,
    retrievedAt: (
      await stat(`.image-cache/${id}.original`)
    ).mtime.toISOString(),
    processedAt: new Date().toISOString(),
    decision: 'pending',
    reason:
      'Candidato após triagem do agente; aprovação humana do hash ainda pendente.',
  })
  delete row.approvedSha256
  if (id === '5999978')
    row.crop = {
      left: 120,
      top: 0,
      width: 1040,
      height: 780,
      reason:
        'Recorte superior 4:3; objeto com inscrição em primeiro plano ficou fora do enquadramento. Sem desfoque ou geração.',
    }
}
const blocked = {}
for (const row of rows) {
  const bytes = await readFile(row.file)
  const meta = await sharp(bytes).metadata()
  if (
    meta.width !== 800 ||
    meta.height !== 600 ||
    meta.format !== 'jpeg' ||
    createHash('sha256').update(bytes).digest('hex') !== row.sha256
  )
    throw new Error(`Arquivo divergente: ${row.patrimonio}`)
  if (blocked[row.patrimonio]) {
    if (row.decision !== 'rejected')
      rejected.push({
        ...row,
        decision: 'rejected',
        reason: blocked[row.patrimonio],
        rejectedAt: new Date().toISOString(),
      })
    row.decision = 'rejected'
    row.reason = blocked[row.patrimonio]
    delete row.approvedSha256
  }
}
if (
  new Set(rows.map((row) => row.photoId)).size !== 12 ||
  new Set(rows.map((row) => row.sha256)).size !== 12
)
  throw new Error('Imagem duplicada.')
await writeFile(`${folder}/manifest.json`, JSON.stringify(rows, null, 2) + '\n')
await writeFile(
  `${folder}/rejeicoes.json`,
  JSON.stringify(rejected, null, 2) + '\n',
)
const eligible = rows.filter((row) => !blocked[row.patrimonio])
const cells = await Promise.all(
  eligible.map(async (row, index) => {
    const label = Buffer.from(
      `<svg width="240" height="28"><rect width="240" height="28" fill="#080C1A"/><text x="8" y="19" fill="white" font-size="15">${row.patrimonio} - candidato</text></svg>`,
    )
    return {
      input: await sharp(row.file)
        .resize(240, 180)
        .extend({ bottom: 28, background: '#080C1A' })
        .composite([{ input: label, left: 0, top: 180 }])
        .jpeg()
        .toBuffer(),
      left: (index % 3) * 240,
      top: Math.floor(index / 3) * 208,
    }
  }),
)
await sharp({
  create: {
    width: 720,
    height: Math.ceil(cells.length / 3) * 208,
    channels: 3,
    background: '#080C1A',
  },
})
  .composite(cells)
  .jpeg()
  .toFile(`${folder}/candidatos-revisao.jpg`)
console.log(
  JSON.stringify({
    candidates: eligible.length,
    rejected: Object.keys(blocked).length,
    approved: 0,
    filesValidated: 12,
    inventoryLoaded: false,
  }),
)
