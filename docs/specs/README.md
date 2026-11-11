# Specs — EmpresTI

> Toda funcionalidade precisa de uma spec aqui antes do código.
> Ver `rules/restriction.md` — sem spec, sem código (exceto esqueleto do projeto).

## Formato mínimo de cada spec (`<tela-ou-dominio>.md`)

1. Rota(s) + `data-screen-label`.
2. Regras de negócio (§4 do `AGENTS.md`) que se aplicam.
3. Procedimentos tRPC (inputs Zod + códigos de erro).
4. Critérios de aceite verificáveis (checks que provam que terminou).

## Aprovação e evidência

Existência de arquivo não significa aprovação nem implementação. As specs e o DDL da
etapa 2 foram aprovados pelo humano em 11/nov/2026. O fluxo principal foi validado
localmente; inventário real, fotos e outros critérios continuam pendentes.
Nenhuma spec nova será declarada concluída antes
do verificador independente. CAs das duas specs da prática usam prefixos CA-DI e
CA-SE para evitar colisão; referências por tela reutilizam esses IDs.

## Specs da prática (aprovadas na etapa 2)

- `dados-iniciais.md` — conjunto inicial, imagens, seed e provisionamento.
- `solicitar-emprestimo.md` — fonte funcional das telas 02, 03 e 04.
- `../decisoes-pratica.md` — decisões humanas, exceções e padrões propostos.
- `../ddl-pratica.md` — DDL aprovado; não é migration executável.
- `../guia-avaliacao-tecnica.md` — justificativas, alternativas, consequências e
  referências das decisões existentes; não substitui ADR ou spec.

## Specs v1 por tela

- [x] `login.md` — landing pública (`/`), 01 Login (`/login`) e controle de acesso.
- [ ] `catalogo.md` — evolução aprovada; API real validada com fixtures locais.
      Faltam inventário real, fotos aprovadas e fechamento dos CAs.
- [ ] `catalogo-detalhe.md` — aprovada; 03 Detalhe (`/catalogo/:patrimonio`), fluxo
      principal validado localmente; fechamento depende da spec principal.
- [ ] `meus-emprestimos.md` — aprovada; 04 Meus empréstimos (`/meus-emprestimos`),
      fluxo principal validado localmente; fechamento depende da spec principal.
- [ ] `operacoes-emprestimos.md` — arquivo ainda não criado; 05 Operações
      (`/operacoes/emprestimos`), sem spec aprovada.
- [ ] `equipamento-novo.md` — arquivo ainda não criado; 06 Cadastrar equipamento
      (`/operacoes/equipamentos/novo`), sem spec aprovada.

Os checkboxes indicam fechamento, não apenas aprovação. A existência da rota
não comprova implementação. Evidência: `../evidencias/fluxo-emprestimo-local.md`.
