import { render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { describe, expect, it } from 'vitest'

import { CatalogDemo } from './catalogo/catalog-demo'
import { Providers } from './_components/providers'
import EquipmentDetailsPage from './catalogo/[patrimonio]/page'
import LoginPage from './login/page'
import MyLoansPage from './meus-emprestimos/page'
import NewEquipmentPage from './operacoes/equipamentos/novo/page'
import OperationsLoansPage from './operacoes/emprestimos/page'

const routes: Array<[string, string, ComponentType]> = [
  ['/login', '01 Login', LoginPage],
  [
    '/catalogo',
    '02 Catálogo',
    () => (
      <CatalogDemo
        viewer={{
          userId: 'test',
          tenantId: 'test',
          email: 'user@example.test',
          role: 'colaborador',
        }}
      />
    ),
  ],
  ['/meus-emprestimos', '04 Meus empréstimos', MyLoansPage],
  ['/operacoes/emprestimos', '05 Operações — empréstimos', OperationsLoansPage],
  [
    '/operacoes/equipamentos/novo',
    '06 Cadastrar equipamento',
    NewEquipmentPage,
  ],
]

describe('rotas v1', () => {
  it('resolve o parâmetro da página de detalhe', async () => {
    const page = await EquipmentDetailsPage({
      params: Promise.resolve({ patrimonio: 'TI-0001' }),
    })
    render(<Providers>{page}</Providers>)
    expect(
      screen.getByRole('main', { name: '03 Detalhe do item' }),
    ).toHaveAttribute('data-screen-label', '03 Detalhe do item')
  })
  it.each(routes)('%s expõe o rótulo %s', (_route, label, Page) => {
    render(
      <Providers>
        <Page />
      </Providers>,
    )

    expect(screen.getByRole('main', { name: label })).toHaveAttribute(
      'data-screen-label',
      label,
    )
  })
})
