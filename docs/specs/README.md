# Specs — EmpresTI

> Toda funcionalidade precisa de uma spec aqui antes do código.
> Ver `rules/restriction.md` — sem spec, sem código (exceto esqueleto do projeto).

## Formato mínimo de cada spec (`<tela-ou-dominio>.md`)

1. Rota(s) + `data-screen-label`.
2. Regras de negócio (§4 do `AGENTS.md`) que se aplicam.
3. Procedimentos tRPC (inputs Zod + códigos de erro).
4. Critérios de aceite verificáveis (checks que provam que terminou).

## Specs v1 (a criar, uma por tela)

- [ ] `login.md` — 01 Login (`/login`).
- [x] `catalogo.md` — 02 Catálogo (`/catalogo`), demonstração local; integração real pendente.
- [ ] `catalogo-detalhe.md` — 03 Detalhe (`/catalogo/:patrimonio`).
- [ ] `meus-emprestimos.md` — 04 Meus empréstimos (`/meus-emprestimos`).
- [ ] `operacoes-emprestimos.md` — 05 Operações (`/operacoes/emprestimos`).
- [ ] `equipamento-novo.md` — 06 Cadastrar equipamento (`/operacoes/equipamentos/novo`).
