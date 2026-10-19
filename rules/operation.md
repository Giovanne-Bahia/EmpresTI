---
description: Contrato de operacao entre mim e o agente neste projeto
globs: []
alwaysApply: true
---

# Contrato de operação

## Git
> leitor: agente

- Commit e push: somente quando o humano pedir explicitamente na
  mensagem atual. Sugestão do agente não conta como autorização.
- Quando autorizado, faça um commit por pedido, com mensagem clara em
  pt-BR descrevendo o que mudou.
- Nunca use `--amend`, `push --force` ou `reset --hard`.
- Nunca commite `.env.local`, `.env` ou qualquer segredo.

## Autorização por tipo de ação
> leitor: agente

| ação                                                        | nível         |
|-------------------------------------------------------------|---------------|
| Editar arquivo existente dentro do escopo da tarefa         | livre         |
| Criar arquivo novo                                          | avisar depois |
| Deletar ou renomear arquivo                                 | pedir antes   |
| Instalar ou atualizar dependência                           | pedir antes   |
| Criar ou alterar migration                                  | pedir antes   |
| Mexer em variável de ambiente, config de deploy ou segredo  | proibido      |

O que cada nível significa:
- livre — faça e siga em frente.
- avisar depois — faça e me diga na resposta o que fez.
- pedir antes — descreva o que pretende fazer e PARE.
- proibido — não faça, mesmo que eu peça no meio de uma tarefa.
  Se eu pedir, me lembre desta linha.

## Configuração do operador
> leitor: humano — isto não é instrução para o agente

| fase                              | modelo / raciocínio |
|-----------------------------------|---------------------|
| Escrever a spec                   | raciocínio alto     |
| Planejar e quebrar em tarefas     | raciocínio alto     |
| Executar uma tarefa já decidida   | rápido              |
| Debugar algo que quebrou          | raciocínio alto     |
| Revisar o diff antes do commit    | padrão              |

- Revisão de diff acontece em sessão limpa, de preferência com
  modelo diferente do que escreveu o código.
- Sessão longa não se corrige com regra mais enfática: encerre
  a sessão com um resumo do estado atual e abra outra.
