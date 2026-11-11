import { expect, test, type Page } from '@playwright/test'

const password = process.env.EMPRESTI_TEST_PASSWORD!
async function login(page: Page, email = 'colaborador@example.test') {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/catalogo$/)
}

test('CA-01: landing, navegação por teclado e formulário em celular', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.screenshot({
    path: 'test-results/landing-mobile.png',
    fullPage: true,
  })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('link', { name: 'Acessar o sistema' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.screenshot({
    path: 'test-results/login-mobile.png',
    fullPage: true,
  })
  await page.getByLabel('E-mail', { exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Senha', { exact: true })).toBeFocused()
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390)
})

test('CA-02: valida campos e mantém a mesma mensagem para senha incorreta e ausência de vínculo', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
  await page
    .getByLabel('E-mail', { exact: true })
    .fill('sem-vinculo@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('senha-incorreta')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    'Não foi possível entrar com essas credenciais.',
  )
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    'Não foi possível entrar com essas credenciais.',
  )
})

test('CA-03: exige sessão em todas as rotas internas', async ({ page }) => {
  for (const route of [
    '/catalogo',
    '/catalogo/PAT-0233',
    '/meus-emprestimos',
    '/operacoes/emprestimos',
    '/operacoes/equipamentos/novo',
  ]) {
    await page.goto(route)
    await expect(page).toHaveURL(/\/login$/)
  }
})

test('CA-02/04: entra, recarrega, filtra catálogo e encerra sessão', async ({
  page,
  context,
}) => {
  const violations: string[] = []
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /Content Security Policy|Refused to/.test(message.text())
    )
      violations.push(message.text())
  })
  await login(page)
  await expect(
    page.getByText('colaborador@example.test', { exact: true }),
  ).toBeVisible()
  await page.reload()
  await page.screenshot({
    path: 'test-results/catalogo-desktop.png',
    fullPage: true,
  })
  await expect(page).toHaveURL(/\/catalogo$/)
  await page
    .getByRole('textbox', { name: 'Buscar equipamento ou patrimônio' })
    .fill('PAT-0233')
  await expect(page.getByRole('article')).toHaveCount(1)
  const cookies = (await context.cookies()).filter((cookie) =>
    cookie.name.startsWith('sb-'),
  )
  expect(cookies.length).toBeGreaterThan(0)
  expect(
    cookies.every((cookie) => cookie.httpOnly && cookie.sameSite === 'Lax'),
  ).toBe(true)
  await page.goto('/login')
  await expect(page).toHaveURL(/\/catalogo$/)
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/catalogo')
  await expect(page).toHaveURL(/\/login$/)
  expect(violations).toEqual([])
})

test('CA-03: papel do vínculo controla Operações', async ({ page }) => {
  await login(page)
  await page.goto('/operacoes/emprestimos')
  await expect(page).toHaveURL(/\/catalogo$/)
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await login(page, 'admin@example.test')
  await page.goto('/operacoes/emprestimos')
  await expect(
    page.getByRole('main', { name: '05 Operações — empréstimos' }),
  ).toBeAttached()
})

test('CA-SE-02/10: catálogo → detalhe → confirmação → empréstimo persistido', async ({
  page,
}) => {
  await login(page, 'admin@example.test')
  await page.getByRole('link', { name: 'Ver item e solicitar →' }).click()
  await expect(page).toHaveURL(/\/catalogo\/PAT-0233$/)
  await page.getByRole('button', { name: 'Solicitar', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await expect(page).toHaveURL(/\/meus-emprestimos$/)
  await expect(
    page.getByRole('heading', { name: 'Notebook de integração' }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Notebook de integração' }),
  ).toBeVisible()
  await expect(
    page.getByRole('main').getByText('1 de 3 itens com você', { exact: true }),
  ).toBeVisible()
})

test('CA-04: renova a sessão no servidor e aplica CSP e cache privado', async ({
  page,
  context,
}) => {
  await login(page)
  const cookies = (await context.cookies())
    .filter((cookie) => cookie.name.startsWith('sb-'))
    .sort((a, b) => a.name.localeCompare(b.name))
  const baseName = cookies[0].name.replace(/\.\d+$/, '')
  const value = cookies.map((cookie) => cookie.value).join('')
  const session = JSON.parse(
    Buffer.from(value.replace(/^base64-/, ''), 'base64url').toString(),
  )
  const previousRefresh = session.refresh_token
  session.expires_at = Math.floor(Date.now() / 1000) - 60
  await context.clearCookies()
  await context.addCookies([
    {
      ...cookies[0],
      name: baseName,
      value:
        'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'),
    },
  ])
  const response = await page.goto('/catalogo')
  await expect(page).toHaveURL(/\/catalogo$/)
  const renewed = (await context.cookies())
    .filter((cookie) => cookie.name.startsWith('sb-'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((cookie) => cookie.value)
    .join('')
  expect(
    JSON.parse(
      Buffer.from(renewed.replace(/^base64-/, ''), 'base64url').toString(),
    ).refresh_token,
  ).not.toBe(previousRefresh)
  expect(response?.headers()['cache-control']).toContain('no-store')
  expect(response?.headers()['content-security-policy']).toContain("'nonce-")
  expect(response?.headers()['content-security-policy']).not.toContain(
    'unsafe-inline',
  )
})

test('CA-05: sexta tentativa é bloqueada e mutações rejeitam origem externa', async ({
  request,
}) => {
  const base = process.env.EMPRESTI_TEST_BASE_URL!
  const body = { json: { email: 'limite@example.test', password: 'incorrect' } }
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await request.post('/api/trpc/auth.signIn', {
      headers: { Origin: base },
      data: body,
    })
    expect(response.status()).toBe(401)
  }
  const blocked = await request.post('/api/trpc/auth.signIn', {
    headers: { Origin: base },
    data: body,
  })
  expect(blocked.status()).toBe(429)
  const crossSite = await request.post('/api/trpc/auth.signIn', {
    headers: { Origin: 'https://example.invalid' },
    data: body,
  })
  expect(crossSite.status()).toBe(403)
})
