# Prova deliberada do limite — 11/nov/2026

Autorizada pelo humano nesta conversa. Executada às 07h27–07h28 de São Paulo,
em cópia isolada dentro de .verification e Postgres 17 descartável. Não houve
escrita em produção, alteração do service principal ou edição do teste.

1. Aplicar as quatro migrations do zero na base local e criar o tenant.
2. Na cópia, trocar somente `loanLimit = 3` por `loanLimit = 4`.
3. Executar os quatro testes de integração de empréstimo existentes.
4. Observar reprovação de CA-SE-04/07: esperava três concessões, recebeu quatro.
5. Restaurar os bytes originais do service na cópia e repetir os mesmos testes.
6. Observar quatro testes aprovados e conferir hashes dos testes e do service.

Resultado: mutação deliberada reprovada (exit 1), restauração aprovada (exit 0).
Isso mostra que o teste detecta a alteração deliberada da regra. Não comprova
cobertura completa, execução do verificador nativo ou fechamento de toda a spec.

Evidências sem reescrever resultados:

- [Log da reprovação](prova-limite-quatro-reprovado.log).
- [Log da restauração](prova-limite-tres-aprovado.log).
- [Recibo e hashes](prova-limite-recibo.json).
- Executor: `tests/prove-loan-limit.mjs` na raiz do projeto.

Pendência: os dois commits humanos previstos no plano não foram criados. Esta
prova em cópia isolada não deve ser apresentada como se esses commits existissem.
