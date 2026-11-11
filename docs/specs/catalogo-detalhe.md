# Detalhe do equipamento

Status: spec aprovada pelo humano em 11/nov/2026; fluxo principal validado localmente
com fixtures. Fechamento depende dos CAs da spec principal;
ver ../evidencias/fluxo-emprestimo-local.md.

Rota /catalogo/:patrimonio; data-screen-label="03 Detalhe do item".
Regras, contratos e CAs funcionais são os de [solicitar empréstimo](solicitar-emprestimo.md),
especialmente CA-SE-02 a CA-SE-09 e CA-SE-11. Esta referência não duplica IDs.

Consumir equipment.byPatrimonio, loan.summary e loan.request com Zod e tipos
inferidos. Sem sessão/vínculo, /login; item inexistente/de outro tenant tem
NOT_FOUND, sem exposição de dados. Mostrar dados conhecidos, foto ilustrativa,
situação, retirada no suporte de TI, prazo de 14 dias com horário, contador e
diálogo com confirmação e aviso do terceiro item.

Manutenção, empréstimo aberto, atraso e limite impedem confirmar e mostram motivo.
Nenhuma ficha técnica ou histórico fictício. Layout segue ../layout.md e sua
adaptação da prática na seção 11. Prova final pertence à spec funcional principal.
