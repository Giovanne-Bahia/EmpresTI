import { describe, expect, it, vi } from 'vitest'

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect }))

import HomePage from './page'

describe('fundação do front', () => {
  it('CA-07: abre o catálogo pela rota inicial', () => {
    HomePage()
    expect(redirect).toHaveBeenCalledWith('/catalogo')
  })
})
