import { z } from 'zod'

export const categorySchema = z.enum(['notebook', 'monitor', 'cabo', 'camera'])
const patrimonio = z.string().trim().min(1).max(40)
export const listEquipmentSchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    category: categorySchema.optional(),
    availableOnly: z.boolean().default(false),
    cursor: patrimonio.optional(),
    direction: z.enum(['forward', 'backward']).optional(),
    limit: z.number().int().min(1).max(24).default(24),
  })
  .strict()
export const equipmentDetailSchema = z.object({ patrimonio }).strict()
export const requestLoanSchema = z
  .object({ patrimonio, requestId: z.string().uuid() })
  .strict()
export const listLoansSchema = z
  .object({
    cursor: z.string().uuid().optional(),
    direction: z.enum(['forward', 'backward']).optional(),
    limit: z.number().int().min(1).max(24).default(24),
  })
  .strict()
export function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
export const businessMessages = {
  OVERDUE_LOAN:
    'Você tem um item em atraso. Regularize a devolução antes de solicitar outro.',
  LOAN_LIMIT_REACHED: 'Você atingiu o limite de 3 itens com você.',
  EQUIPMENT_UNAVAILABLE: 'Este equipamento não está disponível.',
  IDEMPOTENCY_KEY_REUSED:
    'Esta confirmação já foi usada para outro equipamento.',
  REQUEST_RATE_LIMITED:
    'Muitas tentativas. Aguarde um minuto e tente novamente.',
} as const
export type BusinessCode = keyof typeof businessMessages
export function formatDue(date: Date) {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${part('day')}/${part('month').replace('.', '')} às ${part('hour')}:${part('minute')}`
}
