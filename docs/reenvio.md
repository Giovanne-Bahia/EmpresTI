# Preparação para eventual reenvio — 13/nov/2026

Publicação autorizada e concluída em 13/nov/2026: deployment
`dpl_AwbwyLTpXZTsjJCzCuRxX5BfDvHP`, READY, no mesmo endereço
https://empresti.vercel.app/catalogo. Upload e carga dos 12 itens concluídos
pelo humano e conferidos. Ver evidencias/publicacao-2026-11-13.md.
As pendências de publicação e inventário nos registros abaixo são históricas.

Aceite do reenvio: **informado pelo humano nesta conversa**. Confirmar ainda
formato e canal. O material é uma versão candidata local; este registro não é
comprovante de envio nem altera a entrega anterior.

## O que confirmar com o professor

Confirmar se aceita nova entrega, até quando, por qual canal e se avaliará os
arquivos do repositório, um ZIP ou também o sistema publicado. Esclarecer se o
link anterior pode ser atualizado; não presumir que atualizar o site equivale
a um reenvio aceito. Registrar a resposta real antes de executar a publicação.

## Arquivos para avaliação técnica

1. `docs/guia-avaliacao-tecnica.md`: escolhas, alternativas, motivos e custos.
2. `docs/adr/001-stack.md`: decisões de stack, de autoria humana.
3. `docs/decisoes-pratica.md`: conflitos de requisitos e decisões humanas.
4. `docs/specs/`: contratos e critérios de aceite; aprovação não significa conclusão.
5. `docs/evidencias/`: resultados históricos e atuais, com seus limites.
6. `ENTREGA.md`: funcionalidades e pendências declaradas.

O executor `preparar-reenvio.ps1` gera dois ZIPs em `.verification/reenvio-*`:
documentação e projeto para reprodução. Ele não carrega envs, não acessa rede,
não publica e não modifica Git. Só inclui arquivos de uma lista positiva; exclui
credenciais locais, caches, dependências instaladas e histórico Git. Cada pacote
contém manifesto com commit de base, indicação de mudanças locais e hashes.
As 12 imagens finais foram aprovadas pelo humano às 08h37 de 13/nov, com hashes
vinculados no manifesto. Upload e carga do inventário ainda não ocorreram.

```powershell
pwsh -NoProfile -File .\preparar-reenvio.ps1
```

## Sequência após aceite explícito

Na rodada final de 13/nov, passaram 41 testes, lint, typecheck, build e reset
local. Ver `docs/evidencias/preparacao-reenvio.md`, inclusive falhas de execução
anteriores, repetições e limites. Isso não certifica publicação nem todas as specs.

1. Registrar resposta do professor, canal, prazo e formato autorizado.
2. Conferir evidência atual das verificações locais. Havendo mudança depois delas,
   executar os checks correspondentes antes de apresentar a nova versão como validada.
3. Gerar novamente os pacotes se qualquer arquivo mudar. Não editar ZIP manualmente.
4. Se a entrega for pelo GitHub, solicitar commit/push explicitamente. O commit
   31e1459 registra 11/nov às 07h30min52s; alterações posteriores recebem datas reais.
5. Se o professor exigir site atualizado, completar upload/build na Vercel e
   validar domínio, redirecionamento de catálogo sem sessão e login autorizado.
   Não anunciar publicação antes de confirmar o deployment READY e o domínio.
6. Entregar somente pelo canal autorizado e guardar comprovante real do envio.

## Pendências que não devem ser ocultadas

- Fotos finais aprovadas; faltam upload e carga do inventário. Acesso do professor
  confirmado com senha testada e zero empréstimos. Preservar imagem obrigatória.
- Cadastro e devolução em Operações continuam sem spec aprovada e implementação completa.
- Os dois commits específicos previstos para a prova deliberada não existem;
  há evidência local real de reprovação com quatro e aprovação ao restaurar três.
- A publicação anterior não terminou: faltavam arquivos para iniciar o build.
- Em 11/nov, o humano autorizou aplicar somente duas novas migrations em produção
  via Prisma e sessão IPv4, fora do CI, antes do deploy. A operação terminou com
  sucesso. A migration antiga local foi restaurada ao SQL já aplicado, não foi
  reexecutada. Não repetir migrations nem mudar configuração remota nesta preparação.
- Novas correções locais e documentação ainda precisam de commit autorizado.
- Revisão independente atualizada é distinta dos checks automatizados e continua
  necessária para declarar fechamento das specs.

## Rascunho para usar somente após autorização

“Professor, conforme sua autorização de reenvio, encaminho a versão atualizada
do EmpresTI. O guia técnico apresenta decisões, alternativas e consequências;
as specs e evidências distinguem resultados comprovados de pendências. Também
informei as limitações do sistema. Seguem os arquivos/links no formato combinado.”

Substituir os links e anexar apenas o que de fato tiver sido autorizado. Este
texto é um rascunho; nenhuma mensagem foi enviada pelo agente.
