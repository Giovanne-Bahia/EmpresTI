# AGENTS.md — EmpresTI

> Instrucoes operacionais para agentes de IA (e humanos) neste repositorio.
> Fontes: produto `docs/prd.md`, stack `docs/adr/001-stack.md`, visual `docs/layout.md`.
> Travas de autoridade/escopo/ritmo: `rules/restriction.md` (leitura obrigatoria antes de codar).

### Regras operacionais obrigatorias

- `rules/restriction.md` — autoridade, escopo, ritmo e precedencia; leia sempre.
- `rules/operation.md` — autorizacao para Git, arquivos, dependencias e migrations; leia sempre.
- `rules/check.md` — verificacao obrigatoria antes de declarar uma tarefa pronta.
- `rules/migration.md` — procedimento adicional ao tocar em schema ou acesso a dados.

`AGENTS.md` governa a operacao geral. ADRs registram decisoes tecnicas e specs
registram comportamento. Uma rule procedural nao pode contrariar nenhum deles.
Se ADR e spec discordarem, pare e avise; nao escolha precedencia por conta propria.

## 0. Autonomia da IA — commits e push

- A IA **NAO commita, NAO da push, NAO abre PR e NAO faz merge** por conta propria. Regra padrao: implementar, testar e parar.
- So pode commitar/push se o humano pedir **explicitamente** na mensagem (ex.: "pode commitar", "faz o commit", "da push"). Sugestao da propria IA nao conta como autorizacao.
- Mesmo quando autorizada: um commit por pedido, mensagem clara em pt-BR descrevendo o que mudou, sem `--amend`, sem `push --force`, sem `reset --hard`, sem commitar `.env.local` ou segredo.
- Sem autorizacao, finalize a resposta com resumo das alteracoes + comandos sugeridos p/ o humano rodar (ex.: `git status`, `git diff`, `git add ...`, `git commit -m "..."`).

## 1. O que e este projeto

Sistema interno de emprestimo de equipamentos (notebooks, monitores, cabos, cameras).
Substitui planilha compartilhada. Sucesso = Operacoes abandona a planilha apos 2 semanas.

**Papeis:**

- `Colaborador`: ve catalogo, pede emprestado, devolve o que esta com ele.
- `Operacoes/Admin`: cadastra equipamento, ve todos os emprestimos em aberto, registra devolucao no balcao.

**Rotas v1 (sem excecao):**

| Rota                           | Tela                       |
| ------------------------------ | -------------------------- |
| `/login`                       | 01 Login                   |
| `/catalogo`                    | 02 Catalogo                |
| `/catalogo/:patrimonio`        | 03 Detalhe do item         |
| `/meus-emprestimos`            | 04 Meus emprestimos        |
| `/operacoes/emprestimos`       | 05 Operacoes — emprestimos |
| `/operacoes/equipamentos/novo` | 06 Cadastrar equipamento   |

**Fora de escopo v1 — NAO implementar, NAO desenhar:**

- Reserva com data futura.
- Notificacao por e-mail.
- Importacao da planilha atual.

## 2. Como rodar

### 2.1 Pre-requisitos

- Node 24 LTS (runtime suportado pelo deploy Vercel).
- Gerenciador: `npm` (assuncao — se migrar p/ `pnpm`, atualizar esta secao e o CI).
- Projeto Supabase em `sa-east-1` + projeto Vercel (deploy; dev local precisa so das envs).

### 2.2 Setup inicial

```bash
cp .env.example .env.local
# preencher .env.local — nunca commitar valores reais
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

> Estado atual do esqueleto: enquanto `prisma/schema.prisma` ainda não existir,
> os comandos Prisma acima não são executáveis. Nesse estágio, valide com
> `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`.

Envs espelham `ADR-001 §5, §7, §9, §10` (ver `.env.example`):

- `DATABASE_URL` → runtime via Supavisor `:6543?pgbouncer=true&connection_limit=1`. Obrigatorio em serverless/Vercel.
- `DIRECT_URL` → migration via conexao direta `:5432`. Usada pelo `prisma migrate deploy` no CI.
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY (sb_publishable_...)` → PUBLICAS, vao para o bundle.
- `SUPABASE_SERVICE_ROLE_KEY (sb_secret_...)` → SOMENTE SERVIDOR, ignora RLS.
- `SENTRY_DSN` → rastreamento de erro.

### 2.3 Comandos canonicos

| Acao                          | Comando                                                                   |
| ----------------------------- | ------------------------------------------------------------------------- |
| Dev                           | `npm run dev`                                                             |
| Build                         | `npm run build`                                                           |
| Start                         | `npm run start`                                                           |
| Lint                          | `npm run lint`                                                            |
| Typecheck                     | `npm run typecheck` (`tsc --noEmit`, `strict: true`)                      |
| Testes                        | `npm run test` (Vitest; componente em jsdom, integração em Postgres real) |
| Migration criar               | `npx prisma migrate dev --name <nome>`                                    |
| Migration aplicar (CI/deploy) | `npx prisma migrate deploy`                                               |
| Seed                          | `npx prisma db seed` (idempotente, cria tenant `suporte_ti`)              |

> Se um script nao existir ainda no `package.json`, crie-o com esse nome exato em vez de inventar outro.

### 2.4 CI / Deploy — estado alvo

- CI ainda não foi criado no esqueleto atual. Quando Prisma e deploy existirem,
  use GitHub Actions na ordem: lint → typecheck → test →
  `prisma migrate deploy` → deploy Vercel.
- Migration roda em **job do CI antes do deploy, nunca no boot** (serverless sobe N instancias em paralelo e migraria N vezes).
- Vercel: **um projeto so**. Plano Hobby (vale so em contexto academico — se virar uso real, migrar para Pro antes).
- Functions Hobby = EUA; banco em Sao Paulo = cada query paga travessia transatlantica. Aceitavel p/ demo, primeiro item a mudar em uso real.
- Limite 60s por request: operacao longa deve ser desenhada em lotes.

## 3. Arquitetura — onde mexer

Monolito Next.js App Router. Front + servidor no mesmo projeto, mesmo deploy, mesmo TypeScript. Repositorio unico.
O mapa abaixo é a estrutura alvo; arquivos de domínio só nascem com plano e spec aprovados.

```text
src/
  app/
    login/page.tsx
    catalogo/page.tsx
    catalogo/[patrimonio]/page.tsx
    meus-emprestimos/page.tsx
    operacoes/emprestimos/page.tsx
    operacoes/equipamentos/novo/page.tsx
    api/trpc/[trpc]/route.ts        # unico endpoint tRPC
  server/
    api/
      trpc.ts                        # init, middlewares, errorFormatter, superjson
      context.ts                     # createContext: sessao + tenant_id + role + prisma
      routers/
        <dominio>.ts                 # um router por dominio (ex.: equipment.ts, loan.ts)
    services/
      <dominio>.service.ts           # regra de negocio testavel sem contexto tRPC
    db.ts                            # singleton Prisma (obrigatorio p/ hot reload)
    env.ts                           # validacao Zod das envs no boot
prisma/
  schema.prisma
  seed.ts                            # idempotente, tenant suporte_ti
  migrations/
    ...                              # inclui RLS/policies/triggers em SQL bruto
proxy.ts                             # renovacao de sessao @supabase/ssr em toda rota (Next 16+)
next.config.js                       # headers de seguranca + CSP
```

**Camadas (obrigatorio):** `Router (procedimento) -> Service -> Prisma`. Sem pular camada.

- **Router/procedimento:** entrada (`.input()` Zod), contexto, permissao. Sem regra de negocio aqui.
- **Service:** regra de negocio pura. E o que se testa.
- **Prisma:** acesso a dado. Sem regra fora do service.

**Proibido:**

- Server Actions p/ mutacao (segundo caminho = segunda validacao + segunda permissao).
- Server Component buscando dado direto no Prisma (segundo caminho de leitura = tenant checado em dois lugares).
- Acesso a dado pelo cliente Supabase no browser no lugar do Prisma via tRPC (espalha acesso, perde tipo Prisma, joga autorizacao p/ o RLS).
- Novo endpoint REST/GraphQL — fonte da verdade e o `AppRouter` tRPC. Consumidor externo fora de escopo.

## 4. Regras de negocio — NAO quebrar

De `docs/prd.md § Regras` + `docs/layout.md §9`:

1. **Maximo 3 itens por pessoa** — contador no header ("2 de 3 itens com voce"), segmentos de limite no detalhe e em Meus emprestimos, aviso no dialogo quando leva ao terceiro item.
2. **Prazo padrao 14 dias** — data calculada no card ("Devolver ate 14/set", formato `dd/mmm`), barra de progresso por item, coluna "Prazo" em Operacoes.
3. **Atraso bloqueia novo emprestimo** — linha tingida em vermelho suave, card "Em atraso" com borda vermelha, botao "Solicitar" desabilitado (`opacity:.45`) + nota explicativa.
4. **Manutencao nao aparece como disponivel** — pill ambar, card sem acao, nota no "Situacao inicial" do cadastro.

Validacao existe no **service + Zod no `.input()`**, nunca so no front. Front desabilita por UX; servidor barra por seguranca.

## 5. Contrato tRPC + tipos

- Fonte da verdade: `AppRouter`. Cliente so via `RouterInputs` / `RouterOutputs` inferidos. **Nunca declarar interface de resposta a mao.**
- Todo procedimento tem `.input()` Zod. Sem ele a entrada e `unknown`.
- Serializacao: `superjson` (sem ele `Date`/`Decimal` chegam como string).
- Erros: `TRPCError` com codigo + `errorFormatter` unico. Tela trata por codigo, nunca por substring de mensagem.
- Listas: paginacao por **cursor** via `useInfiniteQuery`. Sem offset (lento + duplica sob escrita concorrente).
- Sem versionamento (cliente + servidor sobem juntos no deploy atomico).
- Sem tempo real/WebSocket (serverless nao mantem conexao). Atualizacao = polling TanStack Query.
- Sem fila/agendamento (BullMQ, pg-boss fora — worker de vida longa nao roda na Vercel). Tudo dentro do request.

## 6. Multi-tenancy + Auth (critico)

- Modelo: banco unico, coluna `tenant_id` em **toda tabela de dominio**. Tabela sem ela e vazamento.
- Vinculo: `memberships (user_id, tenant_id, role)`. Papel e por (usuario, tenant), nunca no usuario.
- Origem do tenant: resolvido no `createContext` a partir da **sessao, nunca do input**.
- Filtro aplicado via middlewares `protectedProcedure` → `tenantProcedure` → `adminProcedure` que injetam `tenant_id` no service. Nunca depender de cada service lembrar `where: { tenantId }`.
- Primeiro tenant: `suporte_ti` via seed.
- Auth: Supabase Auth e-mail+senha via `@supabase/ssr`. Cadastro **fechado, so por convite de admin**.
- Sessao: cookie `httpOnly` + `proxy.ts` renovando em toda rota. Nunca `localStorage` (legivel por XSS).
- RLS: habilitado em todas as tabelas, deny by default, **como defesa em profundidade, nao autorizacao primaria**. Prisma com role dona bypassa RLS por padrao; fazer valer exigiria `SET LOCAL` por request.
- Auditoria: tabela append-only `(ator, tenant, acao, recurso)` desde o inicio.

## 7. Fronteira servidor/cliente + segredos

Regra de ouro: **nada com `NEXT_PUBLIC_` e segredo; tudo sem esse prefixo e somente-servidor.**

- `SUPABASE_SERVICE_ROLE_KEY` **nunca** em Client Component nem em arquivo importado pelo cliente (transitivo conta). Ela ignora RLS = banco aberto se vazar no bundle.
- TypeScript `strict: true` obrigatorio — sem ele os nulos do tRPC nao sao pegos e quebram em producao.
- `Client Components` como padrao p/ telas com dados. Nao misturar dois caminhos de dado.
- Estado servidor: TanStack Query via `@trpc/react-query`. Estado cliente: `useState`/Context. Sem Zustand/Redux.
- Formularios: React Hook Form + `zodResolver` reaproveitando o **mesmo schema Zod** do `.input()`. Regra escrita uma vez.
- Env validada com Zod no boot (`src/server/env.ts`): falhar na subida > `undefined` silencioso em producao. Separar vars servidor vs. `NEXT_PUBLIC_`.
- HTTP: headers + CSP restritiva **sem `unsafe-inline`** em `next.config.js`. Cookie e `httpOnly` mas XSS ainda faz request autenticado — CSP e o que impede.
- Rate limit: por IP + por usuario com **contador no Postgres**. Contador em memoria nao funciona (cada instancia serverless tem o seu).
- Log JSON com `request_id` + `tenant_id`. Erro vai p/ Sentry (`SENTRY_DSN`).

## 8. Banco / Prisma

- Banco: Postgres gerenciado Supabase. ORM: Prisma. Dono unico do schema: **Prisma Migrate**. Nunca Supabase CLI no mesmo banco.
- RLS, policies, triggers: **SQL bruto dentro das migrations do Prisma**, na mesma linha do tempo versionada. Nunca script solto no painel.
- Singleton global do Prisma em `src/server/db.ts` (sem ele o hot reload abre um cliente por recarga ate esgotar conexao).
- Conexoes: runtime `DATABASE_URL` Supavisor `:6543?pgbouncer=true&connection_limit=1`; migration `DIRECT_URL` `:5432`. `connection_limit=1` e obrigatorio.
- Seed `prisma/seed.ts` idempotente (roda N vezes sem quebrar).
- Testes de componente usam Vitest + Testing Library em jsdom. Testes de
  integração, procedures e isolamento usam Postgres real quando a camada de
  dados existir. **Prisma mockado proibido** — testa o mock, nao
  constraint/transacao/policy.

## 9. Front / Layout (checklist de `docs/layout.md`)

Especificacao completa em `docs/layout.md` — checklist minimo:

- **Somente dark.** Sem modo claro, sem alternador.
- Tokens (nao inventar hex): fundo app `#080C1A`, sidebar `#060A16`, surface `#0E1530`, sunken `#0B1128`, texto `#E6EAF6` / `#8A93B2` / `#7C86A2`, bordas `#222C4A`/`#1F2949`/`#1A2340`/`#161D33`. Acao `#5B7FE0`; primaria `#001449` **so como fundo profundo** (logo, hero login, avatar, chip ativo), nunca texto/botao.
- Estados: Disponivel `#5FD3AA`, Emprestado `#9AA3BC`, Manutencao `#E8B961`, Atraso `#F0A0A5`/`#E08A90` (fundo/borda em `layout.md §2.4`).
- Botoes primarios **contornados** (`1px solid #5B7FE0`, fundo transparente, texto `#B4C6F6`), nunca solidos. Foco: `outline:2px solid #5B7FE0; outline-offset:2px`. Desabilitado `opacity:.45`.
- Tipo: so Open Sans `400/600` (nunca 700 em titulo). Escala e cores em `layout.md §3`.
- Espacamento: `flex/grid + gap`, **nunca margem individual nem whitespace**. Medidas em `layout.md §4`.
- Shell: sidebar `236px` + header `64px` + conteudo `26–32px 28px`. Grids internos em `§4.6` (catalogo `repeat(3,1fr) gap:16px`, etc.).
- Estilos especificos ficam no template do componente via classes Tailwind.
  CSS global pode conter diretivas do Tailwind, fonte, tokens em `:root`,
  `@keyframes`, resets e garantias globais de acessibilidade (foco e redução de movimento).
- Fontes: Open Sans Google Fonts. Icones: Phosphor Icons `regular` + `fill` via unpkg (URLs em `layout.md §10`).
- Cada tela recebe `data-screen-label` ("01 Login" … "06 Cadastrar equipamento").
- Copy: seca e operacional, pt-BR, sem exclamacao/emoji. Datas `dd/mmm` (`14/set`).
- Animacoes <=240ms, funcionais, respeitar `prefers-reduced-motion` (`layout.md §8`).
- Tailwind p/ reproduzir o Figma + `shadcn/ui` **copiado p/ dentro do repo**. Nada de MUI/Mantine.

## 10. Qualidade

- ESLint + Prettier (config unica — repo unico).
- Pre-commit alvo: `husky + lint-staged`, so lint/formatacao. Sem `commitlint`.
  Ainda não configurado no esqueleto atual; instalar em tarefa própria antes da
  primeira feature.
- PR: uma feature inteira cabe num PR so (tela + router + service + migration). Retorno de procedimento que quebra a tela no build e comportamento esperado — nao silenciar com `any`.

## 11. O que NAO fazer (ADR ja descartou)

| Nao fazer                          | Por que                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Separar front/API em projetos      | 2 deploys, CORS, fronteira HTTP sem equipe separada                     |
| REST/OpenAPI ou GraphQL aqui       | Geracao/versionamento sem volume que pague; tRPC resolve no monolito TS |
| CASL / lib de policy               | 3 middlewares resolvem; camada extra e conceito a mais                  |
| Store global                       | Sobra filtro/modal — `useState` basta                                   |
| Schema/banco por tenant            | Multiplica cada migration por tenant sem exigencia                      |
| Importar `service_role` no cliente | Vazamento = banco aberto                                                |
| Ler `tenant_id` do input           | Vazamento entre tenants                                                 |
| Prisma mockado                     | Nao exercita constraint/transacao/policy                                |

## 12. Mapa de docs

- `docs/prd.md` — problema, quem usa, MVP, regras, fora de escopo, criterio de sucesso.
- `docs/layout.md` — tokens, tipo, espacamento, componentes, telas, animacoes, copy. **Ler antes de qualquer front.**
- `docs/adr/001-stack.md` — decisoes travadas + consequencias + o que o ADR nao decide (dominio, matriz de permissao, provisionamento de tenant, e-mail, backup, branches, flags, observabilidade alem de log/erro, LGPD, SLO).
- `.env.example` — espelho das envs exigidas.
- `rules/` — procedimentos operacionais obrigatorios listados no inicio deste arquivo.
- `aulas/` — material didatico e historico; nunca prevalece sobre `AGENTS.md`, ADRs, specs ou rules.

## 13. Checklist antes de commitar

- [ ] Regras §4 respeitadas no service **e** na UI?
- [ ] `.input()` Zod em todo procedimento novo? Tipo inferido, sem interface a mao?
- [ ] `tenant_id` veio do contexto, nunca do input? Middleware correto?
- [ ] Nenhum segredo vazou p/ `NEXT_PUBLIC_` ou Client Component?
- [ ] Migration Prisma + RLS/policy em SQL na mesma migration? Seed segue idempotente?
- [ ] `npm run lint` + `typecheck` + `test` verdes?
- [ ] Visual confere com `docs/layout.md` (tokens, botao contornado, gap, dark-only, copy seca)?
