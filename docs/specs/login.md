# Landing, login e acesso

## Rotas e experiência

| Rota        | `data-screen-label` | Comportamento                                                                                                                |
| ----------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/`         | `Landing`           | Página pública que apresenta o EmpresTI como sistema interno de empréstimo de equipamentos. **Entrar** abre `/login`.        |
| `/login`    | `01 Login`          | E-mail e senha. Ao entrar, abrir `/catalogo`. Uma sessão válida com vínculo também redireciona de `/login` para `/catalogo`. |
| `/catalogo` | `02 Catálogo`       | Tela inicial autenticada. Identifica o usuário, oferece **Sair** e exibe o catálogo demonstrativo.                           |

A landing e o login usam tema escuro, Open Sans e os tokens de `docs/layout.md`.
O login segue a composição em duas colunas da seção **01 · Login** em telas largas
e empilha apresentação e formulário em telas estreitas. O formulário tem rótulos,
foco visível, preenchimento automático de credenciais, feedback em pt-BR e
indicação de envio. O botão fica desabilitado durante o envio.

O login informa o limite de três itens e o prazo padrão de 14 dias. As regras de
atraso e manutenção permanecem na demonstração do catálogo. Esta etapa autentica
contas com senha já provisionadas por um administrador. O aceite de convite, a
definição inicial de senha e a recuperação de senha ficam para outras etapas.

## Sessão e autorização

- Autenticar por e-mail e senha no Supabase Auth. Manter o cadastro público
  desativado no provedor.
- Verificar a identidade no servidor e resolver o vínculo com `suporte_ti` pelo
  identificador de usuário do Supabase. O vínculo define o papel de colaborador
  ou administrador.
- Proteger `/catalogo`, `/catalogo/:patrimonio`, `/meus-emprestimos` e as rotas de
  Operações. Sem sessão válida ou vínculo, encaminhar para `/login`. Com vínculo
  de colaborador, encaminhar acessos a Operações para `/catalogo`.
- Usar `@supabase/ssr` no servidor e renovar a sessão no `proxy.ts`. Gravar os
  cookies com `HttpOnly`, `SameSite=Lax` e `Secure` em HTTPS. Respostas que tratam
  da sessão não podem entrar em cache compartilhado. Aplicar CSP com nonce por
  requisição, sem `unsafe-inline`.
- Limitar o login antes de consultar o provedor. O Postgres contabiliza de forma
  atômica até 5 tentativas por e-mail normalizado e 30 por IP em 15 minutos.
  Limites valem também para tentativas de contas inexistentes.
- Registrar entradas e saídas bem-sucedidas em auditoria append-only, com ator,
  tenant, ação e recurso. Credenciais e tokens ficam fora de respostas tRPC e logs.

## Contrato tRPC

Os dois procedimentos são mutações de mesma origem em `/api/trpc/[trpc]`.
O formulário de login usa React Hook Form com o mesmo esquema Zod de `auth.signIn`.

| Procedimento   | Entrada validada por Zod                                                                                                                                 | Sucesso                                                                        | Erros                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.signIn`  | `{ email, password }`. Validar o e-mail após remover espaços externos e normalizar para minúsculas. Exigir senha preenchida e preservar seus caracteres. | Confirma a sessão em cookie após verificar o vínculo. A tela abre `/catalogo`. | `BAD_REQUEST` para entrada inválida, `UNAUTHORIZED` para credenciais inválidas ou ausência de vínculo, `TOO_MANY_REQUESTS` para limite e `SERVICE_UNAVAILABLE` para indisponibilidade. |
| `auth.signOut` | Objeto vazio.                                                                                                                                            | Encerra a sessão atual e limpa os cookies. A tela abre `/login`.               | `UNAUTHORIZED` para sessão inválida, `SERVICE_UNAVAILABLE` para indisponibilidade.                                                                                                     |

Os resultados de sucesso retornam `{ ok: true }`. A tela trata falhas por código.
Credenciais inválidas e ausência de vínculo exibem a mesma mensagem. As falhas por
limite e indisponibilidade têm mensagens próprias.

`auth.me` é uma query com entrada vazia validada por Zod e `tenantProcedure`.
Retorna somente o identificador do usuário, e-mail, tenant e papel resolvidos no
servidor. A proteção das páginas e a tela inicial usam esse contrato inferido.

## Critérios de aceite

- **CA-01.** Visitantes abrem `/` e chegam ao formulário por **Entrar**. Landing e
  formulário funcionam em celular e por teclado.
- **CA-02.** Uma conta provisionada com vínculo entra com e-mail e senha e chega a
  `/catalogo`. Campos inválidos são sinalizados. Credenciais incorretas e ausência
  de vínculo produzem a mesma resposta de acesso negado.
- **CA-03.** O acesso direto às rotas internas sem sessão ou vínculo leva a
  `/login`. Colaboradores não acessam rotas de Operações e administradores com
  vínculo podem abrir essas rotas.
- **CA-04.** A sessão sobrevive a recarga e é renovada quando necessário. Com a
  sessão válida, `/login` leva a `/catalogo`. **Sair** encerra a sessão, e uma nova
  tentativa de abrir `/catalogo` exige login. Verificar atributos dos cookies,
  resposta sem cache compartilhado e CSP em build de produção.
- **CA-05.** Na mesma janela de 15 minutos, a sexta tentativa por e-mail ou a
  trigésima primeira por IP é bloqueada, inclusive com requisições simultâneas.
  Após a janela, uma nova tentativa é permitida.
- **CA-06.** Em Postgres local, a primeira migration sobe do zero, o seed pode
  rodar duas vezes e eventos de entrada e saída podem ser inseridos na auditoria.
  Tentativas de alteração ou remoção dos eventos são rejeitadas.
