# DDL proposto — prática SDD

Status: **DDL aprovado pelo humano em 11/nov/2026; não executar este documento**.
Não é migration, não altera schema.prisma e não autoriza escrita remota.

Referências: specs/dados-iniciais.md, specs/solicitar-emprestimo.md e
decisoes-pratica.md. Prisma Migrate continua sendo o único dono do schema.

## Divisão e compatibilidade

1. Tarefa dados iniciais: uma migration nova cria enums e equipment.
2. Tarefa solicitar empréstimo: uma migration nova cria loans e loan_rate_limits.

Não editar as duas migrations existentes, salvo a exceção posterior autorizada
explicitamente pelo humano: IF EXISTS na instrução sobre _prisma_migrations da
migration local de autenticação, ainda sem commit, para o shadow database. A
exceção não autoriza editar migration já publicada. Na inspeção posterior de
produção, confirmou-se que a versão original já havia sido aplicada; o humano
autorizou restaurar o arquivo local ao SQL original e aplicar somente as duas
novas migrations pelo Prisma. O IF EXISTS não permanece na migration antiga.
Não alterar dados de tenants,
memberships, login_rate_limits ou audit_events. Novas tabelas começam vazias;
não há backfill. Seed é separado, idempotente e executado pelo humano em produção.
O DDL abaixo é o alvo semântico: o Prisma gera o SQL estrutural e a mesma migration
recebe checks, índice parcial e policies que não são representáveis no schema.

## Migration 1 — equipamentos

```sql
CREATE TYPE equipment_category AS ENUM ('notebook', 'monitor', 'cabo', 'camera');
CREATE TYPE equipment_condition AS ENUM ('disponivel', 'manutencao');

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  patrimonio VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  category equipment_category NOT NULL,
  condition equipment_condition NOT NULL DEFAULT 'disponivel',
  search_text TEXT NOT NULL,
  image_path TEXT NOT NULL,
  image_provider TEXT NOT NULL DEFAULT 'Pixabay',
  image_photo_id TEXT NOT NULL,
  image_source_url TEXT NOT NULL,
  image_author TEXT NOT NULL,
  image_author_url TEXT NOT NULL,
  image_license_url TEXT NOT NULL,
  image_sha256 CHAR(64) NOT NULL,
  image_width INTEGER NOT NULL DEFAULT 800,
  image_height INTEGER NOT NULL DEFAULT 600,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT equipment_tenant_id_id_key UNIQUE (tenant_id, id),
  CONSTRAINT equipment_tenant_photo_key UNIQUE (tenant_id, image_photo_id),
  CONSTRAINT equipment_tenant_image_hash_key UNIQUE (tenant_id, image_sha256),
  CONSTRAINT equipment_name_check CHECK (length(trim(name)) > 0),
  CONSTRAINT equipment_patrimonio_check CHECK (length(trim(patrimonio)) > 0),
  CONSTRAINT equipment_provider_check CHECK (image_provider = 'Pixabay'),
  CONSTRAINT equipment_image_size_check CHECK (image_width = 800 AND image_height = 600),
  CONSTRAINT equipment_image_hash_check CHECK (image_sha256 ~ '^[0-9a-f]{64}$')
);
CREATE INDEX equipment_tenant_patrimonio_idx ON equipment (tenant_id, patrimonio);
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_direct_access ON equipment AS RESTRICTIVE
  FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
```

Identidade visual aprovada fica no manifesto, vinculada ao hash, não como flag
editável pelo usuário. image_path é relativo ao bucket; o servidor monta a URL
com host conhecido. Validação Zod do manifesto restringe origem, URLs e caminho.

## Migration 2 — empréstimos e rate limit

```sql
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  equipment_id UUID NOT NULL,
  user_id UUID NOT NULL,
  request_id UUID NOT NULL,
  borrowed_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at TIMESTAMPTZ(6) NOT NULL,
  returned_at TIMESTAMPTZ(6),
  CONSTRAINT loans_equipment_tenant_fkey FOREIGN KEY (tenant_id, equipment_id)
    REFERENCES equipment(tenant_id, id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT loans_membership_fkey FOREIGN KEY (tenant_id, user_id)
    REFERENCES memberships(tenant_id, user_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT loans_request_key UNIQUE (tenant_id, user_id, request_id),
  CONSTRAINT loans_term_check CHECK (due_at = borrowed_at + INTERVAL '336 hours'),
  CONSTRAINT loans_returned_at_check CHECK (returned_at IS NULL OR returned_at >= borrowed_at)
);
CREATE UNIQUE INDEX loans_one_open_per_equipment_idx
  ON loans (tenant_id, equipment_id) WHERE returned_at IS NULL;
CREATE INDEX loans_open_user_idx
  ON loans (tenant_id, user_id, id) WHERE returned_at IS NULL;
CREATE INDEX loans_open_due_idx
  ON loans (tenant_id, user_id, due_at) WHERE returned_at IS NULL;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_direct_access ON loans AS RESTRICTIVE
  FOR ALL TO PUBLIC USING (false) WITH CHECK (false);

CREATE TABLE loan_rate_limits (
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  dimension TEXT NOT NULL,
  key_hash BYTEA NOT NULL,
  window_started_at TIMESTAMPTZ(6) NOT NULL,
  attempts INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, dimension, key_hash),
  CONSTRAINT loan_rate_limits_dimension_check CHECK (dimension IN ('user', 'ip')),
  CONSTRAINT loan_rate_limits_hash_check CHECK (octet_length(key_hash) = 32),
  CONSTRAINT loan_rate_limits_attempts_check CHECK (attempts > 0)
);
ALTER TABLE loan_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_direct_access ON loan_rate_limits AS RESTRICTIVE
  FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
```

O limite de três depende do service/transação e de lock da membership; CHECK de
linha não conta empréstimos concorrentes com segurança. A unicidade de aberto é
reforçada por índice no banco. Logs/auditoria reutilizam a estrutura existente.
O encerramento operacional só preenche returned_at e insere auditoria, sem DELETE.

## Storage e teste local

Bucket equipamentos é público para leitura, com JPEG e limite de tamanho definidos
pelo operador; nenhuma escrita pública é autorizada. O agente não altera Storage
nem tabelas internas do Supabase. A criação/configuração do bucket será guiada no
roteiro humano; não gerenciar schema do Storage com SQL solto.

Após aprovação, gerar cada migration na sua tarefa usando Prisma contra banco
local descartável, revisar SQL e testar aplicação/reset do zero. Não executar este
bloco por execute_sql, painel SQL ou ferramenta remota. Não há rollback destrutivo
automático: corrigir aditivamente uma migration já publicada.
