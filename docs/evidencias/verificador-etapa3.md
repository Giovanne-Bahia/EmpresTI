# Etapa 3 — verificador e consulta offline

Data: 11/nov/2026. Registro de evidências da infraestrutura, não aprovação das
funcionalidades de dados iniciais ou empréstimos.

## Estado de fechamento

Fechamento antes das 06h: infraestrutura implementada e revisão real comprovada;
ativação/confiança nas interfaces ainda exige conferência humana.

- 12 testes do verificador aprovados, além de lint, typecheck e 10 componentes.
- Build aprovado na rodada final do executor. Auth dessa rodada falhou ao refazer
  build por EBUSY no cache .next. Após limpeza do cache, o fechamento isolado
  terminou com código 0 antes das 06h: 6 testes de integração, build e 7 E2Es
  aprovados. Log: .verification/closing-auth.log e cópia nesta pasta como
  verificador-fechamento-auth.log. Ao todo, 35 testes aprovados: 12 do gate,
  10 componentes, 6 integração e 7 navegador. O checks.json da rodada anterior
  preserva a falha de cache; não foi adulterado para substituir esse histórico.
- Revisor real realizou 44 chamadas MCP e leu 31 arquivos. A auditoria confirmou
  leitura integral dos documentos obrigatórios, incluindo o final do layout.
- Relatório validado e recibo emitido em 11/nov/2026 às 05h54 de São Paulo:
  dados-iniciais.md = NAO_PRONTA. Seus 10 critérios foram enumerados. Resultado
  esperado: a feature ainda não foi implementada e a produção não foi verificada.
- Fonte/spec/config do recibo correspondem à versão revisada. Não há aprovação
  funcional nem permissão de publicação.

Tabela exportada: verificador-dados-iniciais-baseline.md. Metadados do recibo:
verificador-recibo-etapa3.json. Ambos estão nesta pasta para leitura offline.

## O que foi criado

- Contrato comum: docs/verificador-spec.md.
- Codex: .codex/agents/verificador-spec.toml e .codex/hooks.json.
- Cursor: .cursor/agents/verificador-spec.md e .cursor/hooks.json.
- Executor/gate: .cursor/hooks/verification.mjs e verification-core.mjs.
- Leitor MCP: .cursor/hooks/evidence-server.mjs; somente list_files e read_file.
- Testes: tests/verifier.test.mjs; execução pelo script test:verifier.
- Schema JSON fixo; relatórios JSON/Markdown, histórico e recibos em .verification/.

O Cursor usa o mesmo launcher isolado de Codex CLI. As entradas nativas descobrem
o papel, mas uma chamada nativa sem o launcher não constitui aprovação válida.
Nenhuma dependência foi instalada para o verificador: scripts usam Node padrão.

## Segurança comprovada e limites

- Testes locais verificam rejeição de arquivo fora do manifesto, env, traversal,
  junction externa e ferramenta write_file inexistente.
- Logs adulterados, fonte modificada, CA omitido, prova ausente e veredito
  incompatível são recusados. Falha de parsing do hook bloqueia, em vez de aprovar.
- O perfil real desativa apps/plugins/shell/navegador e usa sandbox read-only,
  sem carregar configuração de usuário nem arquivos env do EmpresTI.
- Em teste real, apply_patch tentou criar apenas **write_probe**.txt em uma cópia
  temporária. O runtime recusou: “writing is blocked by read-only sandbox;
  rejected by user approval settings”. Conferência no host: arquivo não criado.
- Somente as duas ferramentas locais de leitura do MCP recebem autorização auto.
  Não há ferramenta de banco, Storage ou deploy nesse servidor.
- A autenticação do próprio Codex continua necessária para chamar o modelo;
  isso não é credencial de produção do EmpresTI.
- O gate registra conclusão formal por versão. Não impede um humano de alterar
  deliberadamente seu código ou artefatos. Hooks de texto reconhecem declarações
  usuais; verify:finish aplica a checagem formal independentemente da redação.

## Ativação nas interfaces — exige conferência humana

Arquivos e protocolos de hooks foram testados por subprocessos locais. Isso NÃO
comprova que os dois aplicativos carregaram/confiaram os hooks nesta sessão.

1. No Codex, revisar e confiar os hooks do projeto no painel de hooks.
2. No Cursor, confirmar carregamento dos hooks deste workspace e o agente readonly.
3. Conferir eventos reais em .verification/hook-events.jsonl após usar as interfaces.
4. Não confiar apenas na presença dos JSONs. Se o aplicativo não carregar, reabrir
   o workspace e conferir seu painel/log de hooks; não desativar o gate para concluir.

## Comandos para consulta local

```text
npm run test:verifier
npm run verify:checks
npm run verify:spec -- docs/specs/dados-iniciais.md
npm run verify:finish -- docs/specs/dados-iniciais.md
```

- test:verifier executa testes locais, sem chamar modelo ou produção.
- verify:checks usa Node 24 e Docker com serviços descartáveis. Fontes de build
  e imagens Docker podem exigir Internet se seus caches não estiverem disponíveis.
- verify:spec precisa de Internet para a revisão independente por Codex.
- verify:finish não chama modelo; recusa aprovação ausente, negativa ou desatualizada.
- --local permite somente um relatório VALIDADA_LOCALMENTE, sem chamar a spec pronta.

O Node 24 portátil preparado está em
C:/Users/giovannetorquato-ieg/AppData/Local/Temp/empresti-node24/node-v24.22.2-win-x64/.
O executor tenta localizá-lo quando o Node padrão ainda for 20. Usar Node 24 no PATH
continua sendo o setup canônico do projeto.

## Histórico real desta etapa

1. Testes do gate e MCP passaram com fixtures sintéticas, sem comprovar as features.
2. Primeira chamada real ficou sem ferramentas por desativação indevida do componente
   de orquestração do CLI. Gate recusou relatório sem leitura.
3. Após correção, chamada exigiu aprovação das ferramentas locais; foram declaradas
   e configuradas apenas as duas operações comprovadamente somente de leitura.
4. Revisor leu as fontes e reprovou os dados iniciais ainda não implementados.
   Validador inicialmente recusou citações aos logs; mapeamento foi corrigido para
   aceitar somente logs previamente autenticados por hash.
5. Leitura incompleta do layout também foi recusada. O leitor passou a informar
   total de linhas e intervalo de cada resposta para permitir paginação completa.
6. Um build voltou a falhar por EPERM em cache .next no OneDrive. Foi feita nova
   limpeza somente desse cache autorizado antes da rodada de fechamento.

Esses eventos não são a prova com erro plantado no limite de empréstimos. Essa
prova permanece para a etapa 7 e exige dois commits humanos e feature implementada.

## Continuação após esta etapa

Etapas restantes: skill/imagens e aprovação visual; dados iniciais; empréstimos e
telas; prova com erro plantado; CI/publicação humana; evidências e ENTREGA.md/tag.
O humano ainda deve registrar a adoção de sharp no ADR antes da etapa de imagens.
Não houve commit, push, migration nova ou operação de produção nesta etapa.

Fontes de configuração consultadas: https://learn.chatgpt.com/docs/hooks,
https://learn.chatgpt.com/docs/config-file/config-reference e
https://cursor.com/docs/hooks. Os hooks do Codex e Cursor possuem formatos próprios.
