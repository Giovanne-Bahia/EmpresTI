# EmpresTI — roteiro de entrega

## Atualização de 13/nov — imagens e acesso do professor

O humano informou aceite do reenvio. A conta do professor está confirmada, como
colaborador em suporte_ti, sem empréstimos; a senha fornecida foi testada e a
sessão temporária encerrada, sem gravar credenciais nos documentos.

Às 08h37, o humano aprovou as 12 imagens finais, com hashes registrados no
manifesto. Ver docs/imagens-equipamentos/TRIAGEM.md. O ZIP das fotos está em
.verification/fotos-aprovadas-20261113/fotos-suporte_ti-083728.zip. Upload e carga
do inventário foram concluídos pelo humano. Em 13/nov, às 08h57, a versão atual
foi publicada na Vercel, deployment dpl_AwbwyLTpXZTsjJCzCuRxX5BfDvHP, READY,
mantendo https://empresti.vercel.app/catalogo. Conferência por leitura confirmou
12 equipamentos (9 disponíveis e 3 em manutenção), sem empréstimos.
Ver docs/evidencias/publicacao-2026-11-13.md.
Os estados anteriores abaixo devem ser lidos com essa atualização.

## Candidato a reenvio — 13/nov/2026

Reenvio ainda depende da resposta do professor. O roteiro atualizado está em
[docs/reenvio.md](docs/reenvio.md); pacotes locais podem ser gerados por
`preparar-reenvio.ps1`. Esta preparação não autoriza envio, push ou publicação.
As correções locais dos dois P2 têm regressões automatizadas; o resultado desta
rodada está em docs/evidencias/preparacao-reenvio.md: 41 testes, lint, typecheck,
build e reset local aprovados. A revisão de
11/nov permanece histórica, sem ser transformada em aprovação desta versão.

Atualização operacional posterior ao commit: as duas migrations novas foram
aplicadas em produção pelo Prisma com exceção explícita do humano, via sessão
IPv4. A migration antiga local foi restaurada ao SQL original já publicado.
O deploy não terminou e o envio dos arquivos precisa ser refeito após aceite.

## Leitura para avaliação das decisões

A prioridade definida pelo humano é a avaliação das decisões técnicas. Comece
pelo [guia de avaliação técnica](docs/guia-avaliacao-tecnica.md): escolhas,
justificativas, alternativas descartadas, custos e referências. Ele resume
decisões existentes; o ADR continua de autoria humana. As limitações funcionais
abaixo permanecem explícitas, sem simular conclusão das specs.

## Estado verificável

O projeto está em desenvolvimento. Não apresentar este arquivo como aprovação
integral das specs. O catálogo real depende dos equipamentos com fotos válidas:
não foram inseridos registros com imagem ausente nem metadados inventados.

## Decisões que orientaram a implementação

- Monólito Next.js com tRPC: router valida entrada e permissão, service aplica
  regras e repositório Prisma limita as consultas ao tenant da sessão.
- Empréstimo imediato, sem aprovação intermediária; máximo de três itens abertos
  por pessoa e tenant. Prazo de 336 horas, armazenado em UTC e exibido em São Paulo.
- Atraso bloqueia novos empréstimos. Manutenção nunca aparece como disponível.
- Bloqueios de linha no usuário e equipamento serializam solicitações concorrentes.
  Índice único impede dois empréstimos abertos do mesmo equipamento.
- UUID por confirmação permite repetir a chamada sem duplicar empréstimo nem
  auditoria; reutilizar a chave para outro equipamento gera conflito.
- Foto obrigatória preservada por decisão explícita do humano. Origem exclusiva:
  Pixabay, com aprovação visual dos arquivos finais antes do inventário real.
- Limites de frequência ficam no Postgres; autorização principal no servidor e
  RLS como defesa adicional. Nenhuma credencial privada vai ao navegador.

Fontes: `docs/decisoes-pratica.md`, `docs/ddl-pratica.md`,
`docs/specs/dados-iniciais.md` e `docs/specs/solicitar-emprestimo.md`.

## Pendências para a demonstração real

1. Fotografias concluídas e aprovadas pelo humano em 13/nov às 08h37; preservar
   os hashes dos 12 JPEGs 800×600. Qualquer mudança exige nova revisão.
2. Humano configurar o bucket equipamentos e publicar os arquivos aprovados.
3. Concluir e validar o carregamento idempotente dos 12 itens. Conta e vínculo
   de colaborador do professor já conferidos; zero empréstimos.
4. Configurar CI e serviços de publicação; executar migration antes do deploy.
5. Validar as correções locais dos dois achados P2 e completar
   os commits específicos da prova deliberada. A prova em cópia local isolada
   já mostrou reprovação com quatro e aprovação ao restaurar três, sem editar teste.
   Publicação continua pendente.

As telas operacionais de cadastro e devolução ainda precisam de implementação;
não confundir a existência das rotas com funcionalidades completas.

## Evidências

Em 11/nov/2026, por volta de 07h17, passaram: build de produção, reset do banco
local com as quatro migrations, 10 testes de integração e 8 testes de navegador.
O fluxo catálogo → detalhe → confirmação → Meus empréstimos persistiu após reload.
Os 10 testes de componentes passaram na rodada anterior. O inventário real e a
conta do professor não foram provisionados em produção. As rotinas novas de
provisionamento e encerramento precisam de conferência pelo operador.

As evidências anteriores do verificador estão em `docs/evidencias/`. Elas descrevem
o estado da etapa 3 e não certificam mudanças posteriores. O resultado dos checks
do fluxo de empréstimo deve ser registrado depois de sua conclusão.

## Comandos do operador

Usar Node 24. Não executar reset no banco remoto.

```powershell
npm run lint
npm run typecheck
npm run test
npm run test:auth
git status --short
git diff
```

`test:auth` cria serviços locais descartáveis, aplica migrations do zero, testa
integração, gera build e verifica a navegação. O equipamento sintético desse teste
existe somente no banco descartável e não integra o inventário de entrega.

## Arquivos preparados nesta rodada

- `.cursor/skills/imagens-equipamentos/`: rotina Pixabay, cache, processamento e seleção.
- `docs/imagens-equipamentos/manifest.json`: 12 imagens e hashes aprovados em 13/nov às 08h37.
- `docs/imagens-equipamentos/rejeicoes.json`: histórico da primeira triagem.
- `prisma/seed-equipment.ts`: exige 12 aprovações vinculadas aos hashes, JPEG 800×600,
  fotos distintas e objetos públicos com bytes idênticos. Insere faltantes em
  transação e preserva divergências existentes.
- `prisma/provision-professor.ts`: operador cria/reutiliza conta sem redefinir senha.
- `prisma/close-test-loans.ts`: encerramento restrito aos UUIDs e conta de teste
  autorizados; recusa professor e preserva manutenção.
- `.github/workflows/checks.yml`: execução manual; migrations opcionais somente após
  checks. Publicação Vercel ainda depende da configuração humana.

## Operação humana restante

1. Conferir fotos uma a uma. Não aprovar candidatas de tipo errado, com pessoas,
   marcas legíveis ou conteúdo nas telas. A folha de contato facilita a triagem,
   mas não substitui a conferência do JPEG final. Nenhum candidato está aprovado.
2. Para cada foto aceita, registrar `decision: "approved"` e `approvedSha256` igual
   ao SHA256 do arquivo final. Registrar motivo; se o arquivo mudar, revisar de novo.
3. Criar bucket público `equipamentos`, sem escrita para anon/authenticated.
   Publicar os JPEGs com chaves `suporte_ti/TI-0001.jpg` a `suporte_ti/TI-0012.jpg`.
4. Aplicar migrations por CI antes de publicar o aplicativo. Configurar os secrets
   e as proteções do environment `production`; agente não executou o workflow.
5. Com as fotos aprovadas e públicas, executar no ambiente do operador:

```powershell
$env:EMPRESTI_SEED_EQUIPMENT = '1'
npx prisma db seed
Remove-Item Env:EMPRESTI_SEED_EQUIPMENT
```

6. Para provisionar o professor, fornecer a senha por entrada protegida, sem
   escrevê-la no comando ou em arquivo. A rotina não redefine conta existente:

```powershell
$passwordInput = Read-Host 'Senha do professor' -AsSecureString
$passwordCredential = [pscredential]::new('professor', $passwordInput)
$env:EMPRESTI_PROFESSOR_PASSWORD = $passwordCredential.GetNetworkCredential().Password
try { node --env-file=.env.local prisma/provision-professor.ts }
finally { Remove-Item Env:EMPRESTI_PROFESSOR_PASSWORD }
```

7. Confirmar no deploy os 12 itens (9 disponíveis, 3 em manutenção), login do
   professor com zero empréstimos e fluxo usando outra conta exclusiva de teste.
   Fazer os commits humanos e registrar versão, horário e limitações reais.

## Limitações conhecidas

O lote de imagens ainda requer triagem/aprovação e eventuais substituições. O seed
de inventário não foi executado com fotos reais aprovadas. Não houve publicação,
provisionamento remoto ou fechamento da revisão independente. A prova deliberada
foi executada em cópia local isolada; os dois commits específicos não foram feitos.
Revisão independente equivalente encontrou dois achados P2 em 11/nov; em 13/nov
foram feitas correções locais com testes de regressão, sem nova revisão independente;
ver docs/evidencias/revisao-independente.md e docs/evidencias/prova-limite.md.
Cadastro/devolução operacionais não têm spec aprovada nem funcionalidade completa.
O npm informou 22 vulnerabilidades no conjunto de dependências; não foi aplicado
`audit fix --force`, pois pode trocar versões aprovadas e quebrar a entrega.

Decisão final do humano, às 07h18: manter a restrição de marcas/inscrições e deixar
as fotos pendentes. O lote não foi aprovado e não libera o seed de inventário.
