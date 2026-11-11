const slug = 'suporte_ti'

async function main() {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()

  try {
    const tenant = await prisma.tenant.upsert({
      where: { slug },
      create: { slug },
      update: {},
    })
    if (process.env.EMPRESTI_SEED_EQUIPMENT === '1') {
      const { seedEquipment } = await import('./seed-equipment.ts')
      await seedEquipment(prisma, tenant.id)
    } else
      console.log(
        'Tenant conferido. Inventário requer fotos aprovadas e EMPRESTI_SEED_EQUIPMENT=1.',
      )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(() => {
  console.error('Falha ao provisionar o tenant suporte_ti.')
  process.exitCode = 1
})
