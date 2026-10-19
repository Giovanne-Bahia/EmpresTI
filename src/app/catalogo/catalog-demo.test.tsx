import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CatalogDemo } from './catalog-demo'

afterEach(cleanup)

describe('catálogo demonstrativo', () => {
  it('CA-02: busca patrimônio e ignora acentos e caixa', () => {
    render(<CatalogDemo />)
    const input = screen.getByRole('textbox', {
      name: 'Buscar equipamento ou patrimônio',
    })
    fireEvent.change(input, { target: { value: 'pat-0233' } })
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(
      screen.getByRole('heading', { name: 'Sony A7 III' }),
    ).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'PROJETOR' } })
    expect(
      screen.getByRole('heading', { name: 'Projetor Epson X49' }),
    ).toBeInTheDocument()
  })

  it('CA-03: combina filtros, apresenta vazio e limpa o estado', () => {
    render(<CatalogDemo />)
    fireEvent.click(screen.getByRole('button', { name: /^Câmeras$/ }))
    expect(screen.getAllByRole('article')).toHaveLength(1)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Só disponíveis' }))
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Nenhum equipamento encontrado' }),
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Limpar filtros' })[0],
    )
    expect(screen.getAllByRole('article')).toHaveLength(9)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Só disponíveis' }))
    expect(screen.getAllByRole('article')).toHaveLength(6)
    expect(
      screen.queryByText('Manutenção', { exact: true }),
    ).not.toBeInTheDocument()
  })

  it('CA-04: identifica dados fictícios e não oferece gravações', () => {
    render(<CatalogDemo />)
    expect(
      screen.getByText(
        'Demonstração com dados fictícios. Empréstimos não são registrados.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /solicitar/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Cadastrar equipamento' }),
    ).toBeDisabled()
  })
})
