import { businessMessages, type BusinessCode } from '@/shared/loans'
export class DomainError extends Error {
  constructor(
    public readonly code:
      | 'BAD_REQUEST'
      | 'NOT_FOUND'
      | 'CONFLICT'
      | 'PRECONDITION_FAILED'
      | 'TOO_MANY_REQUESTS',
    public readonly businessCode?: BusinessCode,
  ) {
    super(
      businessCode
        ? businessMessages[businessCode]
        : 'Equipamento ou cursor não encontrado.',
    )
  }
}
