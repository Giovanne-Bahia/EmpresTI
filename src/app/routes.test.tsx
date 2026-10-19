import { render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { describe, expect, it } from 'vitest'

import CatalogPage from './catalogo/page'
import EquipmentDetailsPage from './catalogo/[patrimonio]/page'
import LoginPage from './login/page'
import MyLoansPage from './meus-emprestimos/page'
import NewEquipmentPage from './operacoes/equipamentos/novo/page'
import OperationsLoansPage from './operacoes/emprestimos/page'

const routes: Array<[string, string, ComponentType]> = [
  ['/login', '01 Login', LoginPage],
  ['/catalogo', '02 Catálogo', CatalogPage],
  ['/catalogo/:patrimonio', '03 Detalhe do item', EquipmentDetailsPage],
  ['/meus-emprestimos', '04 Meus empréstimos', MyLoansPage],
  ['/operacoes/emprestimos', '05 Operações — empréstimos', OperationsLoansPage],
  [
    '/operacoes/equipamentos/novo',
    '06 Cadastrar equipamento',
    NewEquipmentPage,
  ],
]

describe('rotas v1', () => {
  it.each(routes)('%s expõe o rótulo %s', (_route, label, Page) => {
    render(<Page />)

    expect(screen.getByRole('main', { name: label })).toHaveAttribute(
      'data-screen-label',
      label,
    )
  })
})
