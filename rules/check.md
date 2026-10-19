---
description: O que precisa passar antes de declarar uma tarefa pronta
globs: []
alwaysApply: true
---

# Verificação de fim de tarefa
> leitor: agente

## Quando
Sempre que você for dizer "pronto", "implementado" ou "funcionando".

## Procedimento
1. Rode `npm run lint`.
2. Rode `npm run typecheck`.
3. Rode `npm run test`. Informe o resumo da saída na resposta.
4. Se a tarefa tocou em migration, rode `npx prisma migrate reset --force`
   no banco local e confirme que ele sobe do zero com todas as migrations.
5. Rode `npm run build`. Build que quebra na Vercel é o feedback mais
   lento e mais caro deste projeto.
6. Rode `git status --short`. Só podem aparecer arquivos do escopo
   da tarefa.
7. Diga qual critério de aceitação (CA-xx) esta tarefa atende. Para uma
   tarefa de esqueleto sem spec, declare explicitamente que não há CA funcional.

## Verificação
Pronto = lint, typecheck, testes e build terminaram sem falha, o git status
não trouxe surpresa e o reset local passou quando havia migration.

## Não faça
- Não relate sucesso parcial. Teste vermelho é tarefa não terminada,
  mesmo que o código "esteja certo".
- Não tente consertar a mesma falha duas vezes seguidas sem me mostrar
  a saída do erro.
- Não rode teste contra o banco remoto.
- Não use Supabase CLI para criar, aplicar ou resetar migrations; o dono
  único do schema é o Prisma Migrate.
