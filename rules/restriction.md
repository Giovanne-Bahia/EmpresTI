# O que não fazer — EmpresTI

> Trava de escopo e autoridade da IA. Complementa `AGENTS.md` (não repete).
> Se conflitar com `AGENTS.md`, vale o `AGENTS.md`. Se conflitar com ADR, pare e avise.

## Autoridade

- Não escreva ADR. Se encontrar uma decisão que precisa de um, descreva a
  decisão e as alternativas, e PARE. Quem decide é o time.
- Não contrarie o que está em `docs/adr/`. Se precisar contrariar, pare e diga.
- Não responda por conta própria o que o PRD deixou ambíguo. Liste as
  perguntas e espere.
- Não escolha biblioteca que não esteja no ADR-001. Proponha e espere.

## Escopo

- Não altere arquivo fora do escopo da tarefa atual.
- Não crie estrutura de pastas nova que não esteja num plano aprovado.
- Não gere scaffold automático de framework sem mostrar antes o que ele
  vai criar.
- Não escreva código de funcionalidade sem uma spec correspondente em
  `docs/specs/`. O esqueleto do projeto é a única exceção.
  - Exceção "esqueleto" = `package.json`, configs, `src/app/`, `src/server/`,
    `prisma/schema.prisma`, `proxy.ts`, `next.config.js` vazios ou mínimos.
  - Ver `docs/specs/README.md` para o formato mínimo da spec.

## Ritmo

- Não escreva código antes de um plano aprovado. Escreva o plano, mostre,
  e espere.
- "Pode implementar" NÃO autoriza o plano inteiro: execute UMA tarefa,
  rode os checks, mostre o resultado e pare.
- Não relate sucesso parcial. Se um check falhou, a tarefa não terminou.

## Precedência

- Se o código e uma spec discordarem sobre comportamento, a spec está certa
  até que alguém mude a spec.
- Se uma spec e um ADR discordarem, pare e avise. Não escolha um dos dois.
