| CA       | Evidência                                                           | Status            | Observação                                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA-DI-01 | prisma/seed.ts:8; tests/verifier.test.mjs:42                        | SEM_TESTE         | Não há teste funcional que cite o ID e confira os 12 equipamentos. O seed implementa somente o tenant; equipamentos ainda não existem no schema.                                                                           |
| CA-DI-02 | prisma/schema.prisma:18                                             | SEM_TESTE         | Não existem arquivos finais de imagens, validação implementada ou testes do ID que provem JPEG, dimensões, hashes, caminhos e rejeição de duplicatas.                                                                      |
| CA-DI-03 | docs/specs/dados-iniciais.md:59                                     | SEM_TESTE         | Não há manifesto de fotografias nem teste do ID para origem, autoria, licença, ausência de segredos e rejeição de outra origem.                                                                                            |
| CA-DI-04 | docs/specs/dados-iniciais.md:103                                    | SEM_TESTE         | Ausentes teste do vínculo entre aprovações e hashes finais, lote de imagens e evidência humana de revisão visual com rejeições reais.                                                                                      |
| CA-DI-05 | prisma/seed.ts:8; tests/e2e/auth.spec.ts:4; checks/test-auth.log:49 | SEM_TESTE         | Não há teste do ID nem provisionamento do professor. Os testes de login usam contas de teste e não verificam esse provisionamento ou zero empréstimos. A rotina Auth também falhou antes de concluir o fluxo de navegador. |
| CA-DI-06 | checks/test-auth.log:21; prisma/seed.ts:8                           | SEM_TESTE         | Não há teste do ID para idempotência de conta, vínculo, equipamentos e objetos ou preservação de senha. Executar o seed de tenant duas vezes não prova o critério completo.                                                |
| CA-DI-07 | prisma/seed.ts:3                                                    | SEM_TESTE         | Ausentes teste do ID e implementação do lote transacional, preservação de equipamentos existentes e conflito global de patrimônio.                                                                                         |
| CA-DI-08 | checks/test-auth.log:4; tests/integration/auth.test.ts:68           | SEM_TESTE         | Não existe migration de equipamentos nem teste que cite o ID e prove sua RLS, unicidade e preservação da autenticação. O reset registrado aplica somente migrations da base Auth.                                          |
| CA-DI-09 | tests/verifier.test.mjs:242                                         | SEM_TESTE         | A skill de preparação de imagens não está implementada na cópia. Não há teste do ID que tente e comprove o bloqueio de publicação dessa preparação. Testes de isolamento do verificador não substituem essa prova.         |
| CA-DI-10 | docs/specs/dados-iniciais.md:116                                    | PENDENTE_PRODUCAO | A cópia não contém evidência humana em docs/evidencias/producao-*.md ou .json comprovando inventário, URLs, dimensões, login do professor e zero empréstimos com commit e data.                                            |

Veredito: NAO_PRONTA

lint: passou
typecheck: passou
test: passou
test:verifier: passou
build: passou
test:auth: falhou

Fingerprint: 62e2906f766dc0b55a37e12c2848725f3b96f89b5dca14d9bf65b11ef657e68d
