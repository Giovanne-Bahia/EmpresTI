---
name: imagens-equipamentos
description: Prepara as fotografias Pixabay dos 12 equipamentos EmpresTI, com manifesto e aprovação visual humana.
disable-model-invocation: true
---

# Imagens dos equipamentos

Leia docs/specs/dados-iniciais.md e docs/adr/001-stack.md antes de executar.
Execute com Node 24: `node --env-file=.env.local .cursor/skills/imagens-equipamentos/scripts/prepare.mjs`.
Não imprima chave API, URL de requisição autenticada ou variáveis de ambiente.
Cache de resultados dura 24 horas. Não faça consultas ou downloads em massa.
Use somente fotografias Pixabay; não use geração de imagens, Pexels ou buscadores.
O script produz candidatos, nunca aprovação automática. Confira os tipos físicos,
ausência de pessoas, marcas legíveis, texto e conteúdo nas telas. Rejeite candidatos
inadequados; mantenha motivo e hash da reprovação. Cada item exige foto distinta.
Após triagem, obtenha aprovação humana dos hashes finais no manifesto. Qualquer
mudança invalida a aprovação. JPEG final deve medir 800×600, recortado sem deformar.
Preparação não acessa Supabase, não faz upload, não provisiona contas e não altera
banco. Credenciais de produção não devem ser repassadas a essa rotina.
