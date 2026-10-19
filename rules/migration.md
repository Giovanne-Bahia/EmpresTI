---
description: Procedimento para qualquer mudanca de schema
globs: ["prisma/migrations/**", "prisma/schema.prisma", "src/server/**"]
alwaysApply: false
---

# Mudanca de schema
> leitor: agente

## Quando
Qualquer tarefa que precise criar, alterar ou remover tabela, coluna,
indice, constraint ou politica de acesso - inclusive quando a mudanca
parecer trivial.

## Procedimento
1. Antes de gerar qualquer coisa: escreva o DDL pretendido na resposta
e PARE. Eu aprovo ou corrijo.
2. Gere a migration pelo Prisma: `npx prisma migrate dev --name <nome>`.
Uma migration por tarefa. Dono unico do schema e o Prisma Migrate -
nunca Supabase CLI no mesmo banco (os dois se sobrescrevem).
3. Toda tabela nova de dominio nasce com `tenant_id` + Row Level Security
habilitada e pelo menos uma policy explicita em SQL bruto **na mesma
migration**. Tabela sem `tenant_id`/policy nao entra no repositorio.
4. Se a tabela ja tem dado, diga o que acontece com as linhas
existentes. Coluna obrigatoria nova precisa de default ou de um
passo de preenchimento (backfill).
5. Aplique do zero localmente e rode `npm run test` (Vitest + Postgres
real - nunca Prisma mockado).

## Verificacao
Migration aplicada do zero, sem erro e sem nenhum passo manual, +
`npm run test` verde.

## Nao faca
- Nao altere schema pelo Studio, pelo painel Supabase, nem por SQL
avulso. O que nao esta em migration do Prisma nao existe.
- Nao edite migration que ja foi para o repositorio remoto. Escreva
a proxima.
- Nao toque no banco remoto. Tudo acontece no local.
- Nao rode `supabase migration new` nem `supabase db reset` neste
projeto - o dono do schema e o Prisma Migrate (ver `AGENTS.md` secao 8).