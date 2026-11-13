# Imagens aprovadas — 13/nov/2026

## Estado atual — aprovação às 08h37 de São Paulo

O humano aprovou explicitamente as **12 imagens finais** nesta conversa. Os
arquivos são JPEG 800×600, com 12 photo_id e 12 SHA256 distintos. O manifesto
registra decision=approved, approvedSha256 e approvedAt por item. Aprovação visual
humana não equivale a comprovação automática de ausência de marcas ou pessoas.

As cinco substituições finais foram encontradas antes do limite de 08h40:
TI-0001 (1851043), TI-0003 (1846277), TI-0004 (925595), TI-0007 (5999978) e
TI-0012 (7703231). O recorte 4:3 do monitor está registrado no manifesto.

Folha atual: candidatos-revisao.jpg e contato.jpg. Arquivos finais: TI-0001.jpg
a TI-0012.jpg. Histórico de rejeições preservado em rejeicoes.json.
Pacote local em .verification/fotos-aprovadas-20261113/fotos-suporte_ti-083728.zip,
com pasta suporte_ti e exatamente 12 JPEGs. Não contém credenciais.

**Upload e carga concluídos pelo humano em 13/nov.** As 12 URLs públicas foram
conferidas contra os hashes aprovados; o banco contém 12 equipamentos, 9
disponíveis e 3 em manutenção, sem empréstimos. O operador usou Node 24 e
conexão de sessão na porta 5432 com timeout de transação ampliado para 60s,
após erro P2028 no pooler de transação. Não houve reset.
Os scripts de seleção ficam bloqueados se o manifesto já contiver aprovação.

## Histórico anterior à aprovação das 08h37

Lote **incompleto**, sem aprovação humana e sem carga do inventário.

Sete candidatos estão em candidatos-revisao.jpg: TI-0002, TI-0005, TI-0006,
TI-0008, TI-0009, TI-0010 e TI-0011. São candidatos para revisão, não aprovação.

Cinco itens continuam bloqueados: TI-0001, TI-0003, TI-0004, TI-0007 e TI-0012.
Os motivos específicos estão no manifesto e no histórico de rejeições. A busca
adicional não produziu substitutos que o agente pudesse declarar compatíveis
com todas as restrições, sobretudo marcas e inscrições nos equipamentos.

Foram preservadas as exigências de fonte Pixabay, fotos distintas, JPEG 800×600
e aprovação humana dos hashes finais. Não houve geração de imagens, remoção de
marcas por desfoque, relaxamento de schema, upload ou carga parcial em produção.

O inventário exige os 12 itens com fotos aprovadas e públicas; não executar o
seed com este lote. O contato.jpg anterior é histórico e não representa aprovação
nem a seleção desta rodada. Consulte candidatos-revisao.jpg e manifest.json.

As rotinas de revisão agora respeitam cache de resultados de 24 horas e permitem
consultas explícitas, páginas limitadas e inspeção do JPEG final. O histórico
rejeicoes.json registra arquivos/hashes descartados, sem conter chave da API.
