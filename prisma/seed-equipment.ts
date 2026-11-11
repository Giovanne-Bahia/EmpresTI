import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { z } from 'zod'
import type { Prisma, PrismaClient } from '@prisma/client'
import { initialEquipment } from './initial-equipment.ts'
import { normalizeSearch } from '../src/shared/loans.ts'

const pixabayUrl = z
  .string()
  .url()
  .refine((value) => new URL(value).hostname === 'pixabay.com')
const schema = z
  .array(
    z.object({
      patrimonio: z.string(),
      provider: z.literal('Pixabay'),
      photoId: z.string().min(1),
      sourceUrl: pixabayUrl,
      author: z.string().min(1),
      authorUrl: pixabayUrl,
      licenseUrl: pixabayUrl,
      retrievedAt: z.string().datetime(),
      file: z.string(),
      sha256: z.string().regex(/^[0-9a-f]{64}$/),
      width: z.literal(800),
      height: z.literal(600),
      decision: z.literal('approved'),
      approvedSha256: z.string().regex(/^[0-9a-f]{64}$/),
      reason: z.string().min(1),
    }),
  )
  .length(12)
export async function seedEquipment(db: PrismaClient, tenantId: string) {
  const rows = schema.parse(
    JSON.parse(
      await readFile('docs/imagens-equipamentos/manifest.json', 'utf8'),
    ),
  )
  if (
    new Set(rows.map((row) => row.photoId)).size !== 12 ||
    new Set(rows.map((row) => row.sha256)).size !== 12 ||
    new Set(rows.map((row) => row.patrimonio)).size !== 12
  )
    throw new Error('Fotos ou patrimônios duplicados.')
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!origin) throw new Error('URL pública do Storage ausente.')
  const data: Prisma.EquipmentCreateManyInput[] = []
  for (const [patrimonio, name, category, condition] of initialEquipment) {
    const row = rows.find((item) => item.patrimonio === patrimonio)
    if (
      !row ||
      row.approvedSha256 !== row.sha256 ||
      resolve(row.file) !==
        resolve(`docs/imagens-equipamentos/${patrimonio}.jpg`)
    )
      throw new Error(`Aprovação inválida: ${patrimonio}.`)
    const bytes = await readFile(row.file)
    const localHash = createHash('sha256').update(bytes).digest('hex')
    const metadata = await sharp(bytes).metadata()
    if (
      localHash !== row.sha256 ||
      metadata.format !== 'jpeg' ||
      metadata.width !== 800 ||
      metadata.height !== 600
    )
      throw new Error(`Arquivo divergente: ${patrimonio}.`)
    const imagePath = `suporte_ti/${patrimonio}.jpg`
    const response = await fetch(
      `${origin}/storage/v1/object/public/equipamentos/${imagePath}`,
      { signal: AbortSignal.timeout(15000) },
    )
    if (!response.ok) throw new Error(`Foto pública ausente: ${patrimonio}.`)
    const publicHash = createHash('sha256')
      .update(Buffer.from(await response.arrayBuffer()))
      .digest('hex')
    if (publicHash !== row.sha256)
      throw new Error(`Storage divergente: ${patrimonio}.`)
    data.push({
      tenantId,
      patrimonio,
      name,
      category,
      condition,
      searchText: normalizeSearch(`${name} ${patrimonio}`),
      imagePath,
      imageProvider: row.provider,
      imagePhotoId: row.photoId,
      imageSourceUrl: row.sourceUrl,
      imageAuthor: row.author,
      imageAuthorUrl: row.authorUrl,
      imageLicenseUrl: row.licenseUrl,
      imageSha256: row.sha256,
      imageWidth: 800,
      imageHeight: 600,
    })
  }
  await db.$transaction(async (tx) => {
    for (const item of data) {
      const existing = await tx.equipment.findUnique({
        where: { patrimonio: item.patrimonio },
      })
      if (existing && existing.tenantId !== tenantId)
        throw new Error(`Conflito de tenant: ${item.patrimonio}.`)
      if (!existing) await tx.equipment.create({ data: item })
      else if (
        Object.entries(item).some(
          ([key, value]) => existing[key as keyof typeof existing] !== value,
        )
      )
        console.log(
          `${item.patrimonio}: divergência preservada; revisão humana necessária.`,
        )
    }
  })
  console.log(
    'Inventário conferido sem alterar registros existentes nem empréstimos.',
  )
}
