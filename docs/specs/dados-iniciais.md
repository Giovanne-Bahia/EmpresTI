# Dados iniciais e imagens dos equipamentos

Status: spec aprovada pelo humano em 11/nov/2026; schema e rotinas preparados.
Lote de 12 imagens finais aprovado explicitamente pelo humano em 13/nov/2026,
às 08h37 de São Paulo, com hashes vinculados. Conta do professor e vínculo
confirmados e senha testada em produção. Upload das imagens e carga do inventário
foram concluídos pelo humano e conferidos por leitura: 12 equipamentos, 9
disponíveis e 3 em manutenção, sem empréstimos. Aplicativo publicado em 13/nov,
deployment dpl_AwbwyLTpXZTsjJCzCuRxX5BfDvHP, mantendo o domínio existente.
Critérios não encerrados integralmente; ver ../evidencias/publicacao-2026-11-13.md.

Referências: ../prd.md, ../adr/001-stack.md, ../decisoes-pratica.md,
../ddl-pratica.md, AGENTS.md e rules/migration.md na raiz.

## Objetivo, rotas e limites

Preparar os 12 equipamentos reais, suas imagens e a conta do professor para o
tenant suporte_ti. Esta spec não cria tela, rota HTTP nem procedimento tRPC.
O resultado será consumido por solicitar-emprestimo.md. Acesso de conferência:
/login (01 Login); a apresentação dos itens pertence ao catálogo (02 Catálogo).

Fora: catálogo funcional, empréstimos iniciais, cadastro por interface, importação
de planilha e qualquer escrita em produção pelo agente.

## Conjunto inicial obrigatório

| Patrimônio | Nome                  | Categoria | Condição inicial |
| ---------- | --------------------- | --------- | ---------------- |
| TI-0001    | Notebook 14 polegadas | notebook  | disponivel       |
| TI-0002    | Notebook 15 polegadas | notebook  | disponivel       |
| TI-0003    | Notebook 13 polegadas | notebook  | disponivel       |
| TI-0004    | Notebook 15 polegadas | notebook  | manutencao       |
| TI-0005    | Monitor 24 polegadas  | monitor   | disponivel       |
| TI-0006    | Monitor 27 polegadas  | monitor   | disponivel       |
| TI-0007    | Monitor 22 polegadas  | monitor   | manutencao       |
| TI-0008    | Cabo HDMI 2 m         | cabo      | disponivel       |
| TI-0009    | Cabo USB-C 1 m        | cabo      | disponivel       |
| TI-0010    | Cabo de rede 3 m      | cabo      | manutencao       |
| TI-0011    | Webcam Full HD        | camera    | disponivel       |
| TI-0012    | Câmera compacta       | camera    | disponivel       |

São 4 notebooks, 3 monitores, 3 cabos e 2 câmeras. Patrimônio globalmente único.
O texto normalizado de busca é nome + patrimônio, com acentos removidos e caixa
baixa, produzido pela mesma função usada para normalizar a busca do catálogo.

## Skill imagens-equipamentos

- Fonte exclusiva: API do Pixabay, conforme autorização verbal do professor
  informada pelo aluno. Nunca misturar com Pexels, buscadores ou geração de imagem.
- A chave PIXABAY_API_KEY só existe no ambiente local do operador, nunca nos
  artefatos, manifesto, argumentos impressos, logs ou bundle do aplicativo.
- Consultas limitadas aos 12 itens e alternativas necessárias, com cache de 24h,
  respeito ao rate limit e sem download sistemático. Resultados são fotografias.
- Fazer download local; aplicativo publicado usa Storage, sem hotlink permanente.
- sharp 0.35.5 aplica orientação, recorte 4:3 e saída JPEG 800×600 sem deformação.
  Reabrir o arquivo e medir a saída; CSS sozinho não comprova tamanho.
- Não aprovar foto com pessoa, marca/logo legível, texto ou tela com conteúdo.
  O tipo físico deve corresponder ao item (HDMI, USB-C, rede, webcam etc.).
- Não repetir photo_id nem conteúdo final entre os 12 equipamentos.
- Gerar folha de contato e obter aprovação humana por arquivo final/hash. Se um
  recorte ou arquivo mudar, invalidar sua aprovação. Não corrigir imagem proibida
  com desfoque ou geração: escolher outra fotografia elegível.
- A skill não contém execução de upload de produção. Rotina operacional separada
  é executada somente pelo humano, com credenciais fora da sessão do agente.

Manifesto por item: patrimônio, provider=Pixabay, photo_id, página de origem,
autor, página do autor, URL da licença, instante da obtenção, arquivo final,
SHA256, width=800, height=600, decisão visual e motivo de eventual reprovação.
Artefatos finais e manifesto são versionados; cache e originais ficam ignorados.
Crédito “Fotos: Pixabay” com link e indicação de imagem ilustrativa são consumidos
pela spec da interface. Não declarar que uma checagem automática prova ausência
de pessoas ou marcas: isso depende da inspeção e da aprovação humana registrada.

## Persistência, Storage e provisionamento

- Usar Prisma Migrate para criar equipment, com tenant_id, patrimônio globalmente
  único, condição operacional, busca normalizada e metadados da imagem.
- RLS habilitada com policy explícita de negação do acesso direto; o aplicativo
  acessa dados pelo servidor com contexto de tenant, nunca pela Data API no browser.
- Banco registra caminho relativo da imagem, não URL arbitrária. Bucket público
  equipamentos; chave suporte_ti/TI-0001.jpg e equivalentes. JPEG e dimensões são
  conferidos antes de qualquer upload. Download público sem login; nenhuma policy
  de escrita para anon/authenticated. Configuração de Storage é tarefa humana,
  sem SQL avulso alterando o schema gerenciado pelo Prisma.
- Operador faz upload com caminhos fixos: objeto idêntico é reutilizado; hash
  divergente exige revisão, sem substituição automática de conteúdo existente.
- Validar todo o manifesto e URLs públicas antes de gravar os equipamentos, para
  não popular o inventário com imagens ausentes. Gravação do lote usa transação.
- Seed cria suporte_ti se faltar. Insere somente equipamentos ausentes. Para
  registros existentes, confere tenant, dados e imagem, relata divergência e
  preserva valores. Patrimônio de outro tenant causa conflito e rollback do lote.
- Nunca criar empréstimo, alterar audit_events existente nem liberar item em uso.
- Provisionamento de Auth é administrativo e separado da transação do inventário:
  conta marcelo.grilo@institutojef.org.br, papel colaborador em suporte_ti. Cadastro
  público continua desativado. Humano fornece a senha padrão por entrada segura;
  segredo não é gravado em código, arquivo de entrega nem histórico de comandos.
- Conta existente não tem senha redefinida. Vínculo existente divergente é relatado
  para decisão humana; não elevar/rebaixar papel silenciosamente. Em falha parcial
  entre Auth e membership, repetir retoma o provisionamento sem duplicar conta.
- Conta exclusiva de teste é configurada pelo operador, distinta da do professor.

## Critérios de aceite

- **CA-DI-01:** banco local vazio recebe exatamente os 12 itens da tabela, com
  nomes/categorias corretos, no tenant correto, 9 disponíveis e 3 em manutenção.
- **CA-DI-02:** cada item tem arquivo JPEG distinto, realmente 800×600, com hash e
  caminho conferidos; dimensões erradas, arquivo inválido e duplicatas são rejeitados.
- **CA-DI-03:** manifesto completo identifica origem Pixabay, autor e licença;
  não contém chave API nem segredo. Nenhuma imagem de outra origem é aceita.
- **CA-DI-04:** lote tem aprovação humana dos hashes finais; teste confere vínculo
  das aprovações aos arquivos e evidência visual registra rejeições reais.
- **CA-DI-05:** provisionamento cria ou reutiliza professor como colaborador com
  vínculo; login local funciona e começa com zero empréstimos. Teste usa segredo
  temporário local, nunca a credencial real do professor.
- **CA-DI-06:** executar duas vezes não duplica conta, tenant, membership, item ou
  objeto. Não redefine senha nem cria empréstimo.
- **CA-DI-07:** reexecução com item já emprestado ou dados divergentes preserva
  registros; conflito global de patrimônio não deixa o lote parcialmente gravado.
- **CA-DI-08:** migration sobe do zero em Postgres real; RLS/policy e unicidade são
  verificadas sem Prisma mockado; registros existentes de autenticação são preservados.
- **CA-DI-09:** preparação da skill não consegue publicar: ambiente de preparação
  sem credenciais/conectores de produção, e tentativa de operação remota é bloqueada.
- **CA-DI-10:** operador comprova em produção 12 itens, 12 URLs públicas com as
  dimensões corretas, login do professor e zero empréstimos. Registrar commit e data.

Testes automatizados citam IDs; evidência manual complementa os critérios visuais
e de produção, sem ser inventada ou substituída por mocks. Só encerrar a spec após
verificação independente e evidência humana dos critérios que exigem produção.
