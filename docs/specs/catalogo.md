# Catálogo — transição para dados reais

Status: evolução aprovada pelo humano em 11/nov/2026; API real validada localmente
com fixtures. Inventário real e fotos aprovadas continuam pendentes. Os critérios
históricos abaixo documentam o estágio demonstrativo anterior; não encerram o
catálogo real. solicitar-emprestimo.md governa o comportamento novo e substitui
a demonstração. Testes históricos não comprovam automaticamente a evolução;
ver ../evidencias/fluxo-emprestimo-local.md.

## Comportamento alvo da prática

Rota /catalogo, data-screen-label="02 Catálogo". Consumir equipment.list e
loan.summary via tRPC, com tipos inferidos, cursor e Zod. Busca e filtros continuam,
agora no conjunto persistido. Mostrar fotos, categoria, patrimônio, situação,
contagem real e crédito Fotos: Pixabay. Itens disponíveis abrem detalhe;
indisponíveis não oferecem solicitar. Sem identidade de outro tomador.

Os critérios funcionais são CA-SE-01, CA-SE-02, CA-SE-04 a CA-SE-06 e CA-SE-09 a
CA-SE-11 de [solicitar empréstimo](solicitar-emprestimo.md). Layout segue sua seção
11 de adaptação da prática. Dados iniciais são definidos em dados-iniciais.md.

## Histórico: catálogo demonstrativo

Rota: `/catalogo`. Rótulo: `02 Catálogo`. É a tela inicial após o login.

O acesso exige sessão e vínculo com o tenant, conforme [Login e acesso](login.md).
A busca e os filtros continuam usando dados locais fictícios. A tela usa a sessão
para identificar o usuário e chama `auth.signOut` na ação **Sair**. A persistência
de equipamentos e de empréstimos será especificada separadamente.
Referência visual: `docs/layout.md`.

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
- CA-07: quando publicado, acessar a landing por HTTPS sem conta Vercel e abrir
  o catálogo com uma conta válida do EmpresTI.
- CA-08: encaminhar visitante sem acesso para `/login`. Com sessão válida e
  vínculo, identificar o usuário autenticado e oferecer a ação **Sair**.
