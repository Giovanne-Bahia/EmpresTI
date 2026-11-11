import { z } from 'zod'

export const signInSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Informe um e-mail válido.')
      .max(254, 'O e-mail deve ter até 254 caracteres.'),
    password: z
      .string()
      .min(1, 'Informe a senha.')
      .max(1024, 'A senha deve ter até 1024 caracteres.'),
  })
  .strict()

export const emptyInput = z.object({}).strict()

export const authMessages = {
  BAD_REQUEST: 'Confira os campos informados.',
  UNAUTHORIZED: 'Não foi possível entrar com essas credenciais.',
  TOO_MANY_REQUESTS:
    'Limite de tentativas atingido. Tente novamente em 15 minutos.',
  SERVICE_UNAVAILABLE: 'Serviço indisponível. Tente novamente.',
} as const
