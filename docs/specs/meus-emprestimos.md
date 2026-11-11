# Meus empréstimos

Status: spec aprovada pelo humano em 11/nov/2026; fluxo principal validado localmente
com fixtures. Fechamento depende dos CAs da spec principal;
ver ../evidencias/fluxo-emprestimo-local.md.

Rota /meus-emprestimos; data-screen-label="04 Meus empréstimos".
Fonte funcional: [solicitar empréstimo](solicitar-emprestimo.md), especialmente
CA-SE-03 a CA-SE-05, CA-SE-09 a CA-SE-11. Não duplicar os critérios.

Consumir loan.mine com cursor/useInfiniteQuery e loan.summary, ambos com Zod e
tipos inferidos. Mostrar somente abertos do usuário e tenant atuais: item, retirada,
prazo dd/mmm às HH:mm em São Paulo, barra de progresso e atraso. Contador e segmentos
representam o limite de três. Fornecer estados de carregamento, erro e vazio,
navegação ao catálogo, atualização após mutação, ao foco e polling visível de 30s.

Não implementar Devolver nem histórico nesta prática. O encerramento de testes
é operação humana restrita definida na spec principal, sem endpoint do aplicativo.
Preservar shell, acessibilidade e tokens de ../layout.md com sua seção 11.
