# Evidência local do fluxo de empréstimo — 11/nov/2026

Esta evidência não certifica produção nem encerra integralmente CA-DI ou CA-SE.

- Node 24.22.2, Postgres real descartável e Supabase Auth local.
- Reset local aplicou do zero as quatro migrations, incluindo equipment e loans.
- 10 testes de integração passaram: autenticação, isolamento, prazo de 336 horas,
  manutenção, atraso, limite sob concorrência, disputa de equipamento, repetição
  idempotente e unicidade do evento de auditoria.
- Build Next.js de produção terminou com sucesso, incluindo a checagem TypeScript.
- 8 testes Playwright passaram em 39,4 segundos. O fluxo catálogo → detalhe →
  confirmação → Meus empréstimos foi verificado, incluindo persistência após reload.
- Lint terminou sem erros e typecheck isolado terminou com exit code 0.
- Equipamento e usuários do teste são sintéticos e exclusivos dos serviços locais
  descartáveis. Não comprovam os 12 itens reais nem a conta do professor.

Regressão descoberta pelo navegador: useInfiniteQuery envia `direction`; schemas
estritos recusavam a paginação. O contrato passou a aceitar direction e a rodada
seguinte aprovou o fluxo real. Não foi alterado teste para esconder o problema.

Cobertura parcial de CA-SE-02/03/04/05/06/07/08/09/10. Não estão comprovados todos
os detalhes de cada CA; faltam, entre outros, revisão independente final, imagens
aprovadas, provisionamento, rotinas administrativas completas e evidência humana
de produção. As rotinas novas de inventário e provisionamento ainda precisam de
testes de integração próprios. Nenhum commit, push ou deploy foi feito pelo agente.
