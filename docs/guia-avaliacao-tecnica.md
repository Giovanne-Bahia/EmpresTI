# Guia de avaliação das decisões técnicas — EmpresTI

Este guia reúne decisões já registradas e suas consequências. Não cria ADR,
não altera escolhas do time e não certifica funcionalidades incompletas.
Fontes de autoridade: [AGENTS.md](../AGENTS.md), [ADR-001](adr/001-stack.md),
[decisões da prática](decisoes-pratica.md), [DDL aprovado](ddl-pratica.md) e specs.

## 1. Arquitetura proporcional ao problema

**Decisão:** monólito Next.js App Router, TypeScript strict, repositório único,
um projeto Vercel e comunicação por tRPC.

**Motivo registrado:** a equipe não precisa separar a escala nem a entrega de
front e servidor. REST/GraphQL e dois projetos acrescentariam contratos,
infraestrutura e manutenção sem necessidade conhecida de consumidor externo.
O AppRouter permite inferir entradas e saídas no cliente, sem duplicar interfaces.

**Custo aceito:** acoplamento entre cliente e servidor e menor facilidade de
separar o backend depois. Consumidores externos exigiriam reavaliar a API.
Um deploy conjunto reduz divergência, mas não prova que abas antigas do navegador
deixaram de existir; compatibilidade e atualização do cliente ainda merecem atenção.

**Rastreabilidade:** ADR-001 §§1–4; `src/server/api/root.ts`;
`src/app/_components/providers.tsx`.

## 2. Um caminho de acesso aos dados

**Decisão:** Router → Service → Prisma. Zod valida entradas em runtime; o router
resolve permissões; o service aplica negócio; o repositório limita acesso ao tenant.
Telas consomem tRPC, sem Prisma direto no componente ou mutação por Server Action.

**Motivo:** impedir que caminhos paralelos mantenham validações e autorizações
diferentes. Tipagem estática não substitui validação de requisição não confiável.
SuperJSON preserva datas entre servidor e tela. Códigos de erro separam negócio
da apresentação; a interface não depende de procurar palavras na mensagem.

**Custo aceito:** mais camadas e arquivos para uma operação pequena. O retorno
é centralizar regras testáveis e reduzir pontos de autorização.

**Rastreabilidade:** ADR-001 §§2–4; `src/shared/loans.ts`;
`src/server/api/trpc.ts`; `src/server/services/loan.service.ts`.

## 3. Isolamento por tenant e papel por vínculo

**Decisão:** banco único com tenant_id nas tabelas de domínio, memberships por
usuário/tenant e contexto derivado da sessão. O cliente não escolhe tenant,
usuário ou papel nos inputs. O middleware fornece um repositório já limitado.
FKs compostas impedem associar empréstimo e equipamento de tenants diferentes.

**Alternativa descartada:** banco/schema por tenant multiplicaria operação e
migrations. Papel global no usuário não representa alguém com papéis distintos
em áreas diferentes.

**Custo aceito e limite:** isolamento lógico exige revisão de todo acesso novo.
RLS está habilitada com negação explícita para acessos sujeitos às policies,
mas a conexão proprietária usada pelo Prisma pode ignorá-las. RLS não protege
uma consulta incorreta executada com bypass; a autorização principal é do servidor.

**Rastreabilidade:** ADR-001 §§6–7; DDL; `tenant.repository.ts`;
`tests/integration/identity.test.ts` e `tests/integration/loans.test.ts`.

## 4. Concorrência tratada no servidor e no banco

**Decisão:** dentro de uma transação, bloquear membership do solicitante,
revalidar repetição, bloquear equipamento e conferir atraso, limite e situação.
O banco também tem índice único parcial para um empréstimo aberto por equipamento.

**Por quê:** duas chamadas podem ler simultaneamente “dois empréstimos” ou
“item disponível”. Desabilitar botão ou fazer count antes da transação não evita
que ambas gravem. O bloqueio do usuário serializa sua capacidade; o bloqueio do
equipamento e a unicidade impedem dupla concessão.

**Custo aceito e limite:** transações concorrentes esperam por locks, consumindo
conexões e tempo. O limite de três é uma regra transacional do service, não um CHECK
de linha; SQL administrativo que ignore o service não recebe essa mesma garantia.

**Rastreabilidade:** spec solicitar-emprestimo, CA-SE-04/07;
`loan.service.ts`; migration `20261111100002_loans`;
testes de quatro solicitações simultâneas e de dois usuários disputando um item.

## 5. Repetição segura e auditoria consistente

**Decisão:** requestId UUID por confirmação lógica, unicidade por tenant/usuário
e consulta do resultado anterior. Mesmo UUID/item retorna o mesmo empréstimo;
UUID reutilizado para outro item gera conflito. Empréstimo e auditoria são gravados
na mesma transação. Eventos existentes são append-only.

**Por quê:** perder a resposta HTTP não significa que a operação falhou no banco.
Repetir sem identificador pode duplicar a operação. Auditar fora da transação
pode deixar empréstimo sem evento ou evento de uma gravação que não aconteceu.

**Custo aceito:** guardar e conferir identificadores de tentativa. Idempotência
trata repetição da mesma intenção; não substitui os locks de solicitações distintas.
O teste local confirmou repetição sem segunda auditoria; não há evidência de todos
os cenários de falha ou de uma revisão independente final dessa implementação.

**Rastreabilidade:** spec CA-SE-03/08/12; DDL; `loan.service.ts`;
`tests/integration/loans.test.ts`.

## 6. Tempo e disponibilidade com uma definição explícita

**Decisão humana:** 14 dias corridos definidos como 336 horas a partir da
solicitação; UTC no banco e exibição America/Sao_Paulo. Atraso começa em
due_at <= agora, inclusive. Manutenção prevalece; empréstimo aberto determina
“emprestado”; caso contrário, o item fica disponível.

**Por quê:** prazo sem unidade/fuso deixa casos de borda ambíguos. Derivar
disponibilidade evita sincronizar uma flag “emprestado” com a tabela de empréstimos.
Os três itens em manutenção seguem a lista aprovada, resultando em nove disponíveis
quando o inventário inicial estiver carregado e sem empréstimos.

**Custo aceito:** calcular situação exige consultar empréstimos abertos. A regra
de 336 horas é duração fixa; não deve ser reinterpretada depois como dias úteis
ou como uma regra de calendário diferente sem nova decisão.

**Rastreabilidade:** decisões da prática; spec CA-SE-03/05/06; checks do DDL;
`src/shared/loans.ts` e `loan.service.ts`.

## 7. Segurança compatível com instâncias serverless

**Decisão:** sessão por cookie httpOnly e renovação pelo proxy; cadastro fechado;
segredos somente no servidor; CSP com nonce; rate limit atômico no Postgres por
tenant/usuário/IP. Runtime e migration usam conexões com finalidades distintas.

**Alternativas descartadas:** token em localStorage fica acessível ao JavaScript;
contador de tentativas em memória é diferente em cada instância. Migration no
boot pode ser disparada simultaneamente por várias instâncias.

**Custo aceito:** mais acessos ao banco, cuidado com pool/conexões e configuração
dos serviços. Cookie httpOnly reduz leitura do token por scripts, mas não impede
sozinho requisições autenticadas feitas por um XSS. CSP, origem e autorização
continuam necessárias. Não há certificação de segurança completa por esses controles.

**Rastreabilidade:** ADR-001 §§5/7/9/10; `src/proxy.ts`;
`src/server/api/context.ts`; `tenant.repository.ts` e testes locais de autenticação.

## 8. Um dono do schema e dados iniciais sem destruição

**Decisão:** Prisma Migrate controla estrutura, policies e triggers na mesma
sequência de migrations. Seed cria faltantes, preserva existentes e aponta
divergências. Não redefine senhas nem libera itens emprestados.

**Por quê:** painel SQL e dois gerenciadores de migration geram ambientes
divergentes. Reexecutar uma preparação não deve apagar trabalho nem modificar
silenciosamente a conta do professor. Conflito global de patrimônio desfaz o lote.

**Exceção explicitamente autorizada:** acrescentar IF EXISTS na proteção de
_prisma_migrations da migration local, ainda sem commit, para permitir o shadow
database do Prisma. Isso não autoriza editar migrations já publicadas.

**Custo aceito e estado:** o inventário exige manifesto aprovado e fotos públicas
conferidas antes de inserir dados. A rotina foi preparada, mas o lote real não
foi carregado nem teve seus cenários de idempotência completamente testados.

**Rastreabilidade:** DDL; spec dados-iniciais, CA-DI-06/07/08;
`prisma/seed-equipment.ts`; quatro migrations e reset local bem-sucedido.

## 9. Imagens como artefato rastreável

**Decisões humanas:** Pixabay exclusivo; sharp 0.35.5 registrado pelo humano no
ADR; JPEG 800×600 sem deformação; autoria/licença/origem e hash em manifesto;
aprovação humana vinculada aos bytes finais. Foto continua obrigatória.

**Por quê:** CSS não comprova dimensões do arquivo; uma aprovação genérica não
identifica o recorte avaliado. Hash vincula a decisão ao arquivo. Preservar origem
e crédito permite rastrear o material usado. A autorização verbal para trocar
Pexels por Pixabay foi informada pelo aluno, sem comprovação documental anexada.

**Custo aceito e estado:** critérios visuais rígidos exigiram reprovação e
substituições. O humano preferiu manter a restrição de marcas/inscrições e deixar
as fotos pendentes. Não foram aprovadas automaticamente nem substituídas por
metadados fictícios para preencher o banco. Aprovação visual não é prova de licença.

**Rastreabilidade:** ADR, seção Processamento local de imagens; spec CA-DI-02/03/04;
`docs/imagens-equipamentos/manifest.json` e `rejeicoes.json`;
`.cursor/skills/imagens-equipamentos/`.

## 10. SDD e fronteira de autoridade do agente

**Decisão:** esclarecer conflitos antes de implementar, aprovar spec e DDL,
implementar contra critérios de aceite e usar verificador separado sem permissão
de corrigir código ou relaxar testes. Alterações relevantes invalidam evidência antiga.

**Exemplos reais:** PRD de três itens prevaleceu após decisão humana sobre briefing
de cinco; prazo e manutenção foram esclarecidos; foto opcional foi recusada;
adoção de sharp aguardou registro humano no ADR; lote visual permaneceu pendente.
O humano repriorizou o fluxo funcional e, depois, a documentação técnica para avaliação.

**Custo aceito e limite:** houve trabalho de verificação maior que o desejado sob
prazo curto. A revisão da etapa 3 não certifica código escrito depois. A prova
deliberada de permitir quatro itens foi executada depois em cópia isolada:
reprovação com quatro e aprovação ao restaurar três, sem alterar o teste. Os dois
commits humanos específicos dessa prova continuam pendentes; a evidência local
não deve ser apresentada como se esses commits existissem.

**Rastreabilidade:** `rules/`; decisões da prática; `docs/verificador-spec.md`;
`docs/evidencias/`. O ADR permanece de autoria do humano.

## Evidência, pendência e roteiro de apresentação

Apresente nesta ordem: problema e escopo, decisões e alternativas, integridade sob
concorrência, autorização por tenant, critérios de aceite, evidências e limitações.
Explique um caso concreto: dois usuários solicitam o mesmo equipamento; o lock e
o índice único permitem somente um empréstimo aberto, com auditoria transacional.

Evidência local: 10 testes de componentes, 10 de integração, 8 de navegador,
lint, typecheck, build e reset local. O fluxo principal foi validado com fixtures
locais, não com o inventário real ou a conta do professor. Consulte
[evidência do fluxo](evidencias/fluxo-emprestimo-local.md).

Pendências: fotos aprovadas, inventário real, provisionamento remoto, publicação,
fechamento da revisão independente e commits específicos da prova deliberada.
Uma revisão estática equivalente encontrou dois P2 em 11/nov. Foram corrigidos
localmente na preparação de 13/nov, com regressões automatizadas e sem nova revisão
independente. Consulte
[o relatório](evidencias/revisao-independente.md) e
[a prova local](evidencias/prova-limite.md). Cadastro/devolução em Operações
fazem parte da v1 do PRD, mas estão fora da prática de solicitação e continuam sem
spec aprovada; não foram retirados do PRD. Configuração de CI preparada não prova
execução no GitHub. Consulte [ENTREGA.md](../ENTREGA.md).

A qualidade das decisões pode ser examinada separadamente da maturidade do sistema.
Isso não transforma uma decisão documentada em funcionalidade comprovada.
