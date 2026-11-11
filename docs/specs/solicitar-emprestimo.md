# Solicitar empréstimo

Status: spec aprovada pelo humano em 11/nov/2026; fluxo principal validado
localmente com fixtures. Critérios ainda não encerrados; faltam inventário real,
fotos aprovadas, revisão independente final e evidências humanas de produção.
Ver ../evidencias/fluxo-emprestimo-local.md e ../../ENTREGA.md.

Referências: dados-iniciais.md, login.md, ../prd.md, ../layout.md §11,
../adr/001-stack.md, ../decisoes-pratica.md e ../ddl-pratica.md.

## Rotas, atores e escopo

| Rota                  | data-screen-label   |
| --------------------- | ------------------- |
| /catalogo             | 02 Catálogo         |
| /catalogo/:patrimonio | 03 Detalhe do item  |
| /meus-emprestimos     | 04 Meus empréstimos |

Colaborador e administrador autenticados usam o mesmo fluxo e as mesmas regras.
Sessão e membership são obrigatórios. Tenant e usuário vêm do contexto; nenhum
input aceita tenant_id, user_id, papel, prazo, situação ou data de retirada.
Todas as leituras e mutações seguem Router → Service → Prisma; Client Components
consomem tRPC e tipos inferidos do AppRouter, sem respostas declaradas à mão.

Fora: devolução na interface, renovação, aprovação de Operações, fila, reserva,
notificação, histórico visível, cadastro de equipamento e funcionalidades de Operações.

## Regras e tempo

- Confirmação cria o empréstimo imediatamente. Retirada: “Retirada no suporte de TI”.
- Máximo 3 abertos por usuário no tenant atual. Atraso de outro tenant não bloqueia.
- Prazo: 14 dias corridos, 336 horas após borrowed_at, ambos calculados no servidor
  e armazenados em UTC. Exibição dd/mmm às HH:mm no fuso America/Sao_Paulo; data
  completa com ano disponível no texto acessível do prazo.
- Aberto significa returned_at nulo; atraso significa aberto com due_at <= agora.
- Manutenção ou empréstimo aberto impede solicitação. Situação exibida é derivada
  da condição e do empréstimo aberto; não armazenar flag emprestado independente.
- A UI informa o motivo e desabilita a ação, mas o service sempre revalida tudo.
- Professor não é usado nos testes reais de empréstimo.

## Contrato tRPC e paginação

Todo objeto de entrada é Zod strict. Códigos comuns: BAD_REQUEST, UNAUTHORIZED e
SERVICE_UNAVAILABLE. Procedimentos usam tenantProcedure e recebem acesso ao banco
limitado ao tenant pelo middleware; filtros não dependem de lembrança em cada service.

| Procedimento           | Tipo e entrada                                                                                                                                             | Resultado e erros específicos                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| equipment.list         | query { search?: string até 100, category?: notebook/monitor/cabo/camera, availableOnly?: boolean, cursor?: patrimônio, limit?: inteiro 1..24, padrão 24 } | { items, nextCursor, total, availableCount }; total e availableCount consideram tenant inteiro, items considera filtros.            |
| equipment.byPatrimonio | query { patrimonio: string não vazia até 40 }                                                                                                              | Item, imagem, situação e prazo do empréstimo aberto quando houver. NOT_FOUND para inexistente ou outro tenant.                      |
| loan.summary           | query {}                                                                                                                                                   | { openCount, limit: 3, overdueCount, canBorrow, blockedReason }; somente ator/tenant atuais.                                        |
| loan.request           | mutation { patrimonio: string não vazia até 40, requestId: UUID }                                                                                          | Empréstimo criado, com id, item, borrowedAt e dueAt. NOT_FOUND, PRECONDITION_FAILED, CONFLICT ou TOO_MANY_REQUESTS conforme abaixo. |
| loan.mine              | query { cursor?: UUID, limit?: inteiro 1..24, padrão 24 }                                                                                                  | { items, nextCursor }; somente empréstimos abertos do ator/tenant, com item e prazo.                                                |

Listas usam useInfiniteQuery, sem offset. O adapter envia também
direction?: forward|backward nos inputs das listas; o schema aceita esse metadado
técnico. A interface atual carrega páginas na direção forward. O servidor mantém
a ordem ascendente abaixo, sem prometer navegação reversa.

Equipamentos ordenados por patrimônio
ascendente; empréstimos por id ascendente. Cursor inválido ou fora do escopo retorna
BAD_REQUEST sem expor dado alheio. Buscar normaliza caixa/acentos como o seed.
Campos retornados são mínimos para a tela; nunca incluir identidade de outro tomador,
credenciais, conteúdo de auditoria ou contexto bruto. Datas usam SuperJSON.

O errorFormatter único acrescenta data.businessCode para erros do domínio:

| Código tRPC         | businessCode           | Significado                                    |
| ------------------- | ---------------------- | ---------------------------------------------- |
| PRECONDITION_FAILED | OVERDUE_LOAN           | Há empréstimo em atraso.                       |
| PRECONDITION_FAILED | LOAN_LIMIT_REACHED     | Já existem 3 empréstimos abertos.              |
| CONFLICT            | EQUIPMENT_UNAVAILABLE  | Equipamento em manutenção ou emprestado.       |
| CONFLICT            | IDEMPOTENCY_KEY_REUSED | requestId já utilizado para outro equipamento. |
| TOO_MANY_REQUESTS   | REQUEST_RATE_LIMITED   | Limite técnico de tentativas atingido.         |

Tela trata códigos, nunca substring de mensagem. Em erro, preserva contexto e
oferece tentar novamente quando apropriado; não simula sucesso nem grava otimista.

## Transação, repetição e auditoria

1. Validar identidade/entrada; verificar resultado anterior do mesmo requestId.
   Se existir para o mesmo item, devolver o resultado sem criar nem auditar de novo;
   se o patrimônio diferir, rejeitar. Não transformar falha anterior em sucesso.
2. Contabilizar novas tentativas no Postgres: 10 por usuário e 60 por IP em 60s,
   por tenant. Login mantém seus limites independentes. Contadores são atômicos.
3. Na transação, bloquear membership (tenant,user), revalidar repetição, bloquear
   equipamento filtrado por tenant e revalidar atraso, limite e disponibilidade.
   Com item encontrado, prioridade: atraso, limite, indisponibilidade.
4. Inserir empréstimo e auditoria loan.request com ator, tenant e UUID do empréstimo.
   Falha de qualquer gravação desfaz as duas. Índice parcial único impede dois
   abertos para o mesmo equipamento. FK composta impede referência entre tenants.
5. Concorrência pelo mesmo item: um sucesso; concorrência do mesmo usuário por itens
   diferentes não permite ultrapassar 3. Erros de disputa conhecidos viram códigos
   de negócio; não retornar SQL, stack ou metadados de outro usuário.

Gerar requestId ao abrir uma tentativa lógica; reutilizar em clique repetido ou
retry por perda de resposta. Desabilitar confirmação durante envio. Uma nova
solicitação intencional recebe novo UUID. Datas da prévia do diálogo são estimativas;
após sucesso exibir o prazo efetivamente retornado pelo servidor.

## Experiência e atualização

- Catálogo mostra foto, nome, patrimônio, categoria e situação; manutenção permanece
  visível quando o filtro só disponíveis estiver desligado. Sem dados fictícios.
- Busca/filtros são combináveis, com limpar filtros, carregamento, falha e vazio.
  Cards indisponíveis não têm ação de solicitar; URL direta do detalhe permite
  consultar informação, mas a confirmação continua bloqueada.
- Item disponível abre detalhe com foto ilustrativa, dados conhecidos, retirada,
  prazo estimado, contador e segmentos do limite. Não inventar ficha técnica.
- Diálogo confirma item, prazo e consequência; ao levar ao terceiro, avisar 3 de 3.
  Foco fica no diálogo, Escape/cancelar fecha e devolve foco ao acionador.
- Sucesso abre Meus empréstimos. Mostrar somente abertos, prazo com horário,
  barra proporcional ao tempo decorrido e atraso em vermelho suave. Sem botão
  Devolver e sem tabela de histórico nesta prática.
- Cabeçalhos e sidebar usam contagem real. Atualizar após mutação, ao recuperar
  foco e por polling de 30s somente com tela visível. Servidor continua soberano
  mesmo que outro usuário tenha mudado a disponibilidade entre duas atualizações.
- Crédito Fotos: Pixabay com link nas telas com fotos e “Imagem ilustrativa” no
  detalhe. CSP libera imagens somente do host específico do Storage além das
  fontes já permitidas; sem wildcard de hosts e sem unsafe-inline.
- Tema, tokens, Open Sans 400/600, botões contornados, foco, responsividade,
  gap e movimento reduzido seguem layout.md. Não tornar Operações funcional.

## Encerramento restrito dos testes de produção

Não criar rota de devolução. Ferramenta operacional executada pelo humano recebe
conta exclusiva e lista exata de UUIDs da rodada, oferece prévia e recusa a conta
do professor, itens de terceiros, outro tenant ou lista divergente. Na transação,
preenche returned_at dos empréstimos autorizados e insere auditoria por evento;
repetição não duplica encerramento. Preserva histórico e condição de manutenção.

## Critérios de aceite

- **CA-SE-01:** usuário válido vê os 12 itens iniciais com fotos e situações;
  filtros/busca combinam corretamente e paginação não mistura tenants.
- **CA-SE-02:** catálogo → detalhe → confirmação → Meus empréstimos funciona;
  o diálogo permite cancelar sem gravar e alerta quando chega ao terceiro item.
- **CA-SE-03:** solicitação válida grava empréstimo e auditoria na mesma transação,
  prazo exato de 336 horas; apresentação mantém data/hora corretas em mudança de mês/ano.
- **CA-SE-04:** os três primeiros itens são aceitos e o quarto recusado no service
  e na UI; administrador tem exatamente o mesmo limite.
- **CA-SE-05:** atraso bloqueia ao atingir due_at; imediatamente antes permite se
  houver capacidade. Empréstimo encerrado e atraso de outro tenant não bloqueiam.
- **CA-SE-06:** manutenção e equipamento emprestado são recusados, inclusive por
  chamada direta do procedimento; estado visual informa o motivo.
- **CA-SE-07:** dois usuários disputando um item produzem só um aberto; usuário
  com dois itens disputando dois outros nunca termina com quatro.
- **CA-SE-08:** repetição do mesmo requestId/item devolve o mesmo empréstimo sem
  segunda auditoria; reutilização para outro item é recusada.
- **CA-SE-09:** cada procedimento exige sessão/vínculo, rejeita inputs de tenant
  ou usuário e não expõe identidade ou empréstimos de outra pessoa/tenant.
- **CA-SE-10:** Meus empréstimos mostra só abertos próprios, com prazo, progresso,
  atraso, estado vazio e contagem real; atualização após solicitação e polling funciona.
- **CA-SE-11:** cada imagem tem crédito vinculado ao Pixabay; UI respeita teclado,
  foco, diálogo, celular, tokens e labels; falha/carregamento não simula sucesso.
- **CA-SE-12:** rate limit é atômico por usuário/IP e se renova após 60s; falha na
  auditoria desfaz empréstimo; testes usam Postgres real, migrations e RLS.
- **CA-SE-13:** rotina humana encerra só os UUIDs autorizados, recusa professor,
  preserva auditoria e pode repetir sem duplicar evento nem liberar manutenção.
- **CA-SE-14:** humano comprova fluxo no deploy com conta de teste, restaura os
  itens e confirma professor com zero empréstimos; registrar versão publicada.

Cada teste cita o ID correspondente. Evidência de produção é humana e complementar.
A spec só pode ser concluída após verificador independente aprovar a versão atual;
antes da evidência remota, o estado máximo é validada localmente para publicação.
