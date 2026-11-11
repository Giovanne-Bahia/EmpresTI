# EmpresTI

Sistema interno de empréstimo de equipamentos. A landing pública fica em `/`,
o login em `/login` e o catálogo autenticado em `/catalogo`.

Use Node 24 e configure as conexões e a chave pública do Supabase seguindo
`.env.example`. O projeto usa Supabase Auth com e-mail e senha e cadastro fechado.
O administrador provisiona a conta e seu vínculo em `memberships` com o tenant
`suporte_ti`. O catálogo desta etapa apresenta equipamentos demonstrativos.

```bash
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

As verificações usuais são `npm run lint`, `npm run typecheck`, `npm run test` e
`npm run build`. Para validar o fluxo completo com Postgres e Supabase Auth locais,
tenha o Docker Desktop ativo e execute:

```bash
npx playwright install chromium
npm run test:auth
```

Esse comando prepara serviços descartáveis, aplica as migrations do zero, verifica
o seed, executa quatro testes de integração e sete cenários de navegador e encerra
os serviços ao terminar. As capturas ficam em `test-results/`.
