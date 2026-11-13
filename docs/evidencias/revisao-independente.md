# Revisão independente equivalente — 11/nov/2026

Solicitada pelo humano como Bugbot. O tipo nativo Bugbot não estava disponível;
foi usado um subagente geral separado, somente de leitura, com essa limitação
informada ao humano. Não constitui execução do Bugbot nativo nem certificação
final de todos os critérios de aceite.

## Achados da rodada original de 11/nov

- **P2 — .cursor/hooks/verification-core.mjs:15 e :45:** impressão da fonte
  exclui .github/workflows e arquivos YAML. O revisor confirmou que sourceFiles()
  não inclui .github/workflows/checks.yml. Alterar checks ou migrations do CI pode
  preservar o fingerprint e um recibo anterior, apesar de ser mudança relevante.
- **P2 — src/server/services/equipment.service.ts:14 e loan.service.ts:108:**
  retornos de loan.mine/request passam equipamento sem a relação loans.
  publicEquipment interpreta relação ausente como ausência de empréstimo e pode
  retornar status disponivel/dueAt null para item emprestado. O catálogo carrega
  a relação; Meus empréstimos usa o prazo externo, mas o contrato contém divergência.

## Escopo e consequência

Revisão estática das mudanças locais, inclusive novos arquivos, e uma checagem
da enumeração de fontes. Sem suíte de testes pelo revisor, leitura de segredos,
alterações de arquivo ou acesso a produção. Os achados ficaram registrados;
não foram corrigidos nem ocultados para declarar aprovação da implementação.

Fotos, inventário real, provisionamento e publicação permanecem pendências
conhecidas. A prova deliberada separada está em prova-limite.md.

## Acompanhamento — 13/nov/2026

Na preparação local de eventual reenvio, o agente principal incluiu workflows
e extensões yml/yaml na impressão da fonte. Uma regressão confere alteração de
fingerprint e rejeição de recibo obsoleto para ambas as extensões.

As consultas de empréstimos passaram a carregar os empréstimos abertos do
equipamento, e a projeção pública exige essa relação no tipo. A regressão em
Postgres real confere solicitação, repetição, Meus empréstimos e detalhe com
situação emprestado e prazo coincidente. Resultados da rodada estão em
preparacao-reenvio.md. Correção e teste não equivalem a nova revisão independente.
