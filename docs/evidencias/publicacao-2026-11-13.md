# Publicação de 13/nov/2026

O humano autorizou publicar preservando o link da entrega. Publicação direta
dos 60 arquivos locais de execução, sem segredos, commit ou push. Base Git:
31e1459add27a35d7b8f83dc9ee52a1048c9cf33, com alterações locais posteriores.

- Projeto Vercel: prj_UI8pxv3g7JiGedydtbZurue1Mk2R, empresti, equipe Santos FC.
- Deployment: dpl_AwbwyLTpXZTsjJCzCuRxX5BfDvHP; produção, Node 24, Next.js.
- READY em 2026-11-13T11:57:31.908Z (08h57min31s de São Paulo).
- Alias empresti.vercel.app confirmado apontando para esse deployment.
- Endereço preservado: https://empresti.vercel.app/catalogo.
- Build remoto concluído em 51s. Lint, typecheck, build local e 10 testes de
  componentes passaram. EPERM inicial do build foi resolvido com execução
  autorizada fora da restrição; typecheck inicial coincidiu com recriação de
  tipos do Next e passou após o build. Vitest teve 7 testes aprovados e timeout
  de inicialização de worker na execução restrita; repetição isolada passou 10/10.
- HTTP sem sessão: /catalogo e /meus-emprestimos retornaram 307 para /login;
  /login retornou 200 com data-screen-label de 01 Login. CSP presente nas três.
- Consulta de logs error/fatal do deployment às 08h58 não encontrou registros
  nos cinco minutos anteriores. A janela curta não certifica ausência futura.

O humano enviou as fotos e executou a carga. Leitura independente do banco
confirmou 12 equipamentos em suporte_ti, 9 disponíveis, 3 em manutenção e zero
empréstimos. As 12 URLs públicas já haviam retornado 200 e SHA256 igual ao
manifesto aprovado. O operador corrigiu a execução usando Node 24 e pooler de
sessão 5432, com timeout de transação de 60s após P2028. Não houve reset nem
migration nesta publicação.

Este registro comprova publicação, endereço e verificações descritas. Não
encerra todas as specs, não certifica fluxos autenticados completos desta
publicação e não transforma funcionalidades pendentes em concluídas. O login
do professor tem evidência anterior; não foi repetido no site nesta rodada.
