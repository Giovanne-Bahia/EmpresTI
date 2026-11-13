# Decisões da prática SDD

Status: decisões confirmadas pelo humano nesta conversa em 11/nov/2026.
As specs e o DDL produzidos na etapa 2 foram aprovados pelo humano na mesma data. Este registro
não afirma implementação, publicação ou autorização de commit.

O humano aprovou a consolidação das decisões e o guia de avaliação técnica nesta
conversa em 11/nov/2026 e autorizou prosseguir com revisão independente e prova
local deliberada. Não é aprovação retroativa de critérios não comprovados, fotos
pendentes, specs de Operações inexistentes ou operações de Git/produção.

## Conflitos e escolhas de produto

| Assunto            | Alternativa do pedido                      | Decisão humana e motivo registrado                                                                                                       |
| ------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Limite             | Briefing: 5; PRD: 3                        | Preservar 3, por pessoa e tenant atual. Mantém o contrato do produto.                                                                    |
| Prazo              | 14 úteis ou corridos; horário indefinido   | 14 corridos, mesmo horário da solicitação; exibir data e hora em São Paulo.                                                              |
| Manutenção         | Briefing: dois; lista obrigatória: três    | Seguir a lista: TI-0004, TI-0007, TI-0010. São 9 disponíveis.                                                                            |
| Fonte das fotos    | Contrato original exige Pexels             | Usar exclusivamente Pixabay. O aluno informou autorização verbal do professor; não existe evidência documental fornecida nesta conversa. |
| Crédito            | Briefing pede catálogo sem crédito         | Mostrar crédito discreto “Fotos: Pixabay” com link; manter autoria e licença por foto no manifesto.                                      |
| Senha do professor | Briefing pede senha no seed                | Não versionar senha. Operador informa a senha padrão fora do código e dos logs.                                                          |
| Verificador        | Pedido do tech lead permite corrigir teste | Verificador só avalia. Correção pertence ao agente principal.                                                                            |
| Identificador      | Único por tenant ou global                 | Patrimônio único no sistema inteiro, por escolha humana.                                                                                 |

## Lacunas resolvidas

| Assunto                | Decisão                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Professor              | Colaborador em suporte_ti, sem empréstimos iniciais.                                                                           |
| Administradores        | Podem solicitar para si, sob as mesmas regras.                                                                                 |
| Fluxo                  | Catálogo → detalhe → diálogo → Meus empréstimos; confirmação cria imediatamente.                                               |
| Retirada               | “Retirada no suporte de TI”; não inventar sala, andar ou horário.                                                              |
| Privacidade            | Mostrar situação e prazo de outro empréstimo, sem nome, e-mail ou user_id do responsável.                                      |
| Foto                   | Ilustrativa do mesmo tipo; indicar “Imagem ilustrativa” no detalhe.                                                            |
| Enquadramento          | JPEG 800×600 com recorte proporcional 4:3, sem distorção.                                                                      |
| Revisão visual         | Agente faz triagem e folha de contato; humano aprova o lote e registra reprovações.                                            |
| Biblioteca             | sharp 0.35.5 para preparação local; registro humano no ADR concluído, dependência direta adicionada.                           |
| Seed repetido          | Inserir faltantes; preservar existentes e relatar divergências. Não redefinir senha, liberar equipamento ou apagar empréstimo. |
| Testes em produção     | Conta exclusiva, e-mail informado pelo operador na execução. Professor não é conta de testes.                                  |
| Após o teste           | Operador encerra só empréstimos da conta e da rodada autorizada, com auditoria; equipamentos voltam à disponibilidade.         |
| Ferramentas            | Codex e Cursor; configurações compatíveis com contrato comum.                                                                  |
| Executor e verificador | Rotina fixa executa testes locais descartáveis; verificador isolado só lê código e evidências.                                 |
| Obrigatoriedade        | Hooks e relatório por versão da spec/código; mudanças relevantes invalidam a aprovação.                                        |
| Prova                  | Permitir quarto item temporariamente sem alterar o teste de três; registrar reprovação e correção em dois commits humanos.     |

## Autorizações operacionais específicas

- Plano aprovado e execução por etapas completas, com revisão entre etapas.
  Esta decisão substitui somente o ritmo de uma tarefa por turno para esta prática.
- Agente pode preparar workflows versionados e modelos de variáveis sem valores
  reais. Humano configura serviços e segredos; agente não altera produção.
- CI de publicação acionado pelo humano, com migration antes do deploy.
- Humano faz commits, push, merges e tag; autorização para implementar não os inclui.
- A revisão roda sobre cópia de leitura sem conectores ou credenciais de produção.
- Nenhuma autorização desta conversa permite ao agente escrever ADR.

## Padrões técnicos propostos para aprovação com as specs

- Cursores estáveis, páginas de até 24 itens e polling de 30 segundos com tela visível.
- Identificador UUID por tentativa lógica de empréstimo para repetição segura.
- Rate limit da solicitação: 10 tentativas por usuário e 60 por IP em 60 segundos,
  por tenant, contabilizadas no Postgres. Login mantém seus limites próprios.
- Vencimento em UTC após 336 horas; atraso a partir de due_at, inclusive.
- Disponibilidade derivada: manutenção prevalece; empréstimo aberto torna o item
  emprestado; caso contrário, disponível.

## Evidências e honestidade

### Fechamento visual do lote — 13/nov/2026, 08h37

O humano estabeleceu limite de busca até 08h40, permitindo encerrar com pendências
se necessário. As cinco substituições restantes foram encontradas antes desse
limite e o humano aprovou explicitamente as 12 imagens finais. O manifesto vincula
cada aprovação ao SHA256; os 12 JPEGs 800×600 têm photo_id e conteúdo distintos.
As restrições visuais não foram relaxadas. O recorte 4:3 do monitor exclui um objeto
com texto no primeiro plano e está documentado, sem desfoque ou geração de imagem.
Upload e carga do inventário não foram executados nesta rodada.

### Preparação condicional do reenvio — 13/nov/2026

O humano conversará com o professor sobre eventual reenvio. Autorizou preparar
os arquivos para uma entrega rápida caso aceita; não enviar, commitar, dar push,
publicar ou mudar serviços nesta preparação. Corrigir localmente os dois P2 e
incluir regressões preserva as decisões aprovadas, sem criar ADR ou nova feature.
O roteiro está em reenvio.md e os pacotes registram data real e mudanças locais.

Durante a tentativa anterior de publicação, o humano autorizou uma exceção
operacional específica: restaurar a migration antiga ao SQL já aplicado e usar
Prisma via sessão IPv4, fora do CI, para aplicar somente as duas migrations novas.
A aplicação terminou com sucesso. Isso corrige a premissa anterior de que a
migration antiga ainda não estava publicada. O deploy não foi concluído e essa
exceção não é autorização permanente para mudanças remotas futuras.

### Prioridade da avaliação técnica

O humano pediu concentrar a entrega nas decisões técnicas, aceitando limitações
do sistema. O guia `guia-avaliacao-tecnica.md` reúne motivos, alternativas,
consequências, fontes e limites de evidência das escolhas já registradas.
Isso não aprova novas decisões, não autoriza escrever ADR nem encerra CAs pendentes.

### Repriorização solicitada pelo humano em 11/nov/2026, antes da entrega

O humano pediu priorizar o sistema utilizável em vez de revisão exaustiva. A ordem
passa a ser banco/API e fluxo de empréstimo, depois fotos/refinamentos/automação.
Manter regras de negócio, isolamento e testes críticos; registrar limitações e
checks não executados. Não declarar a spec pronta sem evidência nem publicar pelo
agente. Ao perguntar sobre imagens pendentes, o humano manteve foto obrigatória:
não relaxar NOT NULL nem inventar imagem/autor/hash para popular os 12 equipamentos.
Chave Pixabay não estava configurada no ambiente no início deste bloco.

Às 07h18, o humano decidiu manter a proibição de marcas/inscrições nas fotos e
deixar o lote pendente. Portanto, nenhum hash foi aprovado; não executar seed de
inventário nem publicar os candidatos como se cumprissem os critérios visuais.
O humano registrou sharp 0.35.5 no ADR e a dependência direta foi adicionada.

ENTREGA.md deverá referenciar estas decisões, specs e commits reais quando existirem.
Não há, até aqui, episódio confirmado de agente que tomou decisão de produto sozinho.
Observar a execução e registrar somente um episódio real; se não ocorrer, declarar
a ausência. O erro plantado é uma prova deliberada e nunca será descrito como erro
espontâneo. A aprovação da etapa 1 não equivale à aprovação das novas specs.
