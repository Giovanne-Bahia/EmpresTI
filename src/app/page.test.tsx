import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import HomePage from './page'

describe('fundação do front', () => {
  it('CA-01: apresenta a landing e o acesso ao login', () => {
    render(<HomePage />)
    expect(screen.getByRole('main', { name: 'Landing' })).toHaveAttribute(
      'data-screen-label',
      'Landing',
    )
    expect(
      screen.getByRole('link', { name: 'Acessar o sistema' }),
    ).toHaveAttribute('href', '/login')
  })
})
