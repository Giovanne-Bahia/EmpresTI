# Revisão da base — etapa 1

Data: 11/nov/2026. Estado: **checks da etapa 1 aprovados; aguardando revisão humana**.

## Escopo e preservação

Revisão inicial da autenticação, autorização, configuração de testes e execução
dos checks. As alterações locais anteriores foram preservadas. Não houve commit,
push, migration nova ou operação de produção. O executor aplicou as migrations
existentes e resetou exclusivamente o Postgres descartável criado por ele.

## Alteração desta rodada

`tests/run-auth.mjs`: substituir a herança integral de `process.env` por uma lista
de variáveis do sistema operacional. As conexões e credenciais dos serviços de
teste continuam sendo definidas pelo executor para seus serviços descartáveis.
Isso reduz a propagação de credenciais aos subprocessos; não substitui o futuro
isolamento do verificador nem garante que frameworks não carreguem arquivos env.

`resolveIdentity` passou a declarar somente a dependência `getUser` que utiliza.
Foram acrescentados dois testes de integração com Prisma e Postgres reais: vínculo
somente em outro tenant não concede acesso; papel admin de outro tenant não eleva
o papel de colaborador no suporte_ti. Apenas a resposta do provedor de identidade
é uma fixture; o banco e os memberships não são mockados.

## Verificações executadas

| Verificação                          | Resultado                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------- |
| Lint                                 | Passou com Node 24.                                                       |
| Typecheck                            | Passou; o build também verificou TypeScript após os novos testes.         |
| Componentes                          | 3 arquivos, 10 testes aprovados no Node 24 fora do sandbox.               |
| Sintaxe do executor (`node --check`) | Passou.                                                                   |
| Build Next com URLs locais de teste  | Passou, usando as conexões descartáveis do executor.                      |
| Docker local                         | Engine 28.3.2 acessível fora do sandbox.                                  |
| Integração                           | 2 arquivos, 6 testes aprovados em Postgres real.                          |
| Navegador                            | 7 cenários Playwright aprovados.                                          |
| Reset e seed                         | Duas migrations aplicadas do zero; seed executado duas vezes com sucesso. |
| `git diff --check`                   | Passou.                                                                   |

O diretório que bloqueou o build tem atributos ReadOnly e ReparsePoint no
workspace sincronizado pelo OneDrive. O mesmo erro ocorreu fora do sandbox;
a causa completa não foi demonstrada. Após a autorização de continuação, somente
o cache `.next` foi removido; o build seguinte passou.

O runtime padrão do terminal continua Node 20.20.2. Para os checks desta rodada,
foi baixado Node 24.22.2 portátil do site oficial para a pasta temporária do Windows,
conferido contra SHASUMS256.txt. A instalação do sistema não foi alterada.
Uma primeira execução de componentes no sandbox falhou por timeout de um worker;
a repetição fora do sandbox aprovou os dez testes. Não houve alteração de teste
para ocultar a falha.

## Constatações da leitura inicial

- Login usa schema Zod compartilhado, Supabase Auth e membership de suporte_ti.
- Autorização usa protectedProcedure, tenantProcedure e adminProcedure.
- O rate limit usa Postgres e a auditoria tem trigger append-only nas migrations.
  Os testes locais comprovaram concorrência do rate limit e rejeição de alterações
  e exclusões da auditoria.
- A CSP atual não permite imagens externas: precisará admitir o host específico
  do Storage quando a funcionalidade de fotos for implementada.
- O verificador existente é um contrato em Markdown; não há hooks de conclusão
  nem isolamento técnico demonstrado. Não representa a entrega final do verificador.
- A cobertura de isolamento foi ampliada para a resolução da identidade. A revisão
  por procedimento das novas features fará parte das respectivas specs.
- Capturas de login em celular e catálogo em desktop foram inspecionadas; tema,
  composição e controles visíveis conferem com o estágio demonstrativo atual.

## Continuação necessária

1. Revisão humana desta etapa antes de iniciar as specs da prática.
2. Usar Node 24 no terminal de trabalho; manter Docker disponível para integração.
3. Seguir para specs e decisões aprovadas, mantendo as etapas do plano.

Os novos testes sustentam o CA-03 da spec de login. Os sete E2Es exercitam CA-01
a CA-05 e a integração exercita CA-05 e CA-06. Isso não declara a spec pronta:
o verificador independente obrigatório ainda será construído na etapa 3.
