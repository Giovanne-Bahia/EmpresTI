import 'server-only'
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SENTRY_DSN: z.string().url().optional(),
})

const result = schema.safeParse(process.env)
if (!result.success) {
  throw new Error(
    `Configuração ausente ou inválida: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
  )
}
export const env = result.data
