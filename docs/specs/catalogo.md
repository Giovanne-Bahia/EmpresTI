# Catálogo demonstrativo

Rota: `/catalogo`; `/` redireciona para ela. Rótulo: `02 Catálogo`.

Entrega acadêmica com dados locais fictícios, sem autenticação, gravação ou
procedimentos tRPC. Os tipos descrevem apenas fixtures locais, não respostas de API.
Referência visual: `docs/layout.md`. Integração real será especificada separadamente.

## Critérios de aceite

- CA-01: renderizar shell escuro, sidebar, header e cards com os três estados.
- CA-02: pesquisar por nome ou patrimônio, sem diferenciar caixa ou acentos.
- CA-03: combinar categoria e filtro de disponibilidade; permitir limpar filtros
  e mostrar estado vazio quando não houver resultado.
- CA-04: identificar a demonstração; não gravar empréstimos nem simular sucesso.
  Navegações ainda não implementadas ficam identificadas e desabilitadas.
- CA-05: informar limite de 3 itens, prazo de 14 dias, bloqueio por atraso e
  indisponibilidade de manutenção; não tratar regras visuais como autorização.
- CA-06: adaptar a grade para celular, manter foco visível e controles rotulados.
- CA-07: publicar URL HTTPS acessível sem conta Vercel.
