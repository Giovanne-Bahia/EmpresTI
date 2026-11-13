# Verificação da preparação de reenvio — 13/nov/2026

Esta é evidência local do executor, não revisão independente, aceite do professor,
publicação na Vercel ou comprovação de produção. O estado candidato inclui mudanças
não commitadas sobre 31e1459 e a restauração da migration antiga já autorizada.

## Resultado final da rodada

- ESLint: exit 0, sem erros ou warnings.
- Typecheck strict: exit 0.
- Componentes: 10 testes aprovados em três arquivos.
- Verificador: 13 testes aprovados, incluindo alterações de workflows yml e yaml.
- Integração em Postgres real descartável: 10 testes aprovados.
- Build de produção Next.js: concluído com sucesso, incluindo TypeScript.
- Playwright com Auth e Postgres locais: oito testes aprovados em 43,4 segundos.
- Reset local: as quatro migrations aplicadas do zero, sem passos manuais.

Total: **41 testes aprovados** nas suítes finais acima. Comandos executados com
Node 24.22.2: scripts canônicos lint, typecheck, test, test:verifier e test:auth;
test:auth executa reset, integração, build e navegação e remove só seus serviços
descartáveis. Nenhum reset, teste ou alteração de dados foi feito em produção.

## Regressões verificadas

O teste `alteração de workflow YAML invalida recibo e fingerprint`, em
tests/verifier.test.mjs, confirma para yml e yaml que a fonte inclui o workflow,
que uma alteração muda o fingerprint e que o recibo anterior é recusado.

O teste CA-SE-03/08 de tests/integration/loans.test.ts compara solicitação,
repetição, Meus empréstimos e detalhe: todos retornam equipamento emprestado
e prazo igual ao empréstimo. O tipo da projeção exige a relação de empréstimos;
não interpreta mais relação ausente como lista vazia.

Essas verificações reforçam consistência do contrato (parte de CA-SE-06/10) e
invalidação de evidências. Não encerram todos os critérios das specs.

## Falhas de execução registradas

A primeira execução do verificador no sandbox falhou ao criar uma junction
temporária (EPERM). A repetição com permissão apropriada passou nos 13 testes,
sem alterar o teste ou desabilitar a checagem de links.

A primeira rodada de componentes teve sete testes aprovados e um erro de timeout
ao iniciar um worker enquanto outras verificações estavam em execução. Após o
build terminar, a mesma suíte foi repetida sozinha: os dez testes passaram em
13,58 segundos, sem alteração de teste, timeout ou critério de aceite.

## Limites e pendências

Nenhuma nova revisão independente foi executada. As correções dos dois P2 foram
feitas pelo executor e testadas, não aprovadas retroativamente pelo revisor.
O gate antigo de specs não recebe recibo PRONTA manualmente; suas evidências
anteriores continuam históricas. Fotos, inventário, professor, cadastro/devolução
em Operações e publicação permanecem com as limitações de ENTREGA.md.

Os ZIPs são gerados depois deste registro pelo script preparar-reenvio.ps1.
Se qualquer arquivo mudar, gerar novos pacotes e repetir os checks afetados.
