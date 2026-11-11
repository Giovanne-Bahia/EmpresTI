import 'server-only'
import { PrismaClient } from '@prisma/client'
import { env } from './env'

const globalDb = globalThis as unknown as { prisma?: PrismaClient }
export const prisma =
  globalDb.prisma ?? new PrismaClient({ datasourceUrl: env.DATABASE_URL })
if (process.env.NODE_ENV !== 'production') globalDb.prisma = prisma
