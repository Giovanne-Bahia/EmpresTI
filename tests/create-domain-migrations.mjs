import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { spawnSync } from 'node:child_process'
import {
  appendFileSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { join, dirname, delimiter } from 'node:path'

const original = readFileSync('prisma/schema.prisma', 'utf8')
let db
function run(args, env) {
  const result = spawnSync(
    process.execPath,
    ['node_modules/prisma/build/index.js', ...args],
    { env, stdio: 'inherit' },
  )
  if (result.status !== 0) throw new Error('Prisma falhou: ' + args.join(' '))
}
function migration(name, sql) {
  const folder = readdirSync('prisma/migrations')
    .filter((entry) => entry.endsWith('_' + name))
    .sort()
    .at(-1)
  if (!folder) throw new Error('Migration gerada não encontrada.')
  appendFileSync(
    join('prisma/migrations', folder, 'migration.sql'),
    '\n' + sql + '\n',
  )
}
try {
  db = await new PostgreSqlContainer('postgres:17')
    .withDatabase('empresti_migrations')
    .start()
  const url = db.getConnectionUri()
  if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
    throw new Error('Banco deve ser local.')
  const env = {
    ...process.env,
    DATABASE_URL: url,
    DIRECT_URL: url,
    PATH: dirname(process.execPath) + delimiter + process.env.PATH,
  }
  const equipmentOnly = original
    .replace(/^model Loan \{[\s\S]*?^\}\r?\n/gm, '')
    .replace(/^model LoanRateLimit \{[\s\S]*?^\}\r?\n/gm, '')
    .replace(/^\s*loans\s+Loan\[\].*\r?\n/gm, '')
    .replace(/^\s*loanRateLimits\s+LoanRateLimit\[\].*\r?\n/gm, '')
  writeFileSync('prisma/schema.prisma', equipmentOnly)
  run(['migrate', 'dev', '--name', 'equipment', '--create-only'], env)
  migration(
    'equipment',
    `ALTER TABLE equipment
  ADD CONSTRAINT equipment_name_check CHECK (length(trim(name))>0),
  ADD CONSTRAINT equipment_patrimonio_check CHECK (length(trim(patrimonio))>0),
  ADD CONSTRAINT equipment_provider_check CHECK (image_provider='Pixabay'),
  ADD CONSTRAINT equipment_image_size_check CHECK (image_width=800 AND image_height=600),
  ADD CONSTRAINT equipment_image_hash_check CHECK (image_sha256 ~ '^[0-9a-f]{64}$');
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_direct_access ON equipment AS RESTRICTIVE FOR ALL TO PUBLIC USING(false) WITH CHECK(false);`,
  )
  run(['migrate', 'deploy'], env)
  writeFileSync('prisma/schema.prisma', original)
  run(['migrate', 'dev', '--name', 'loans', '--create-only'], env)
  migration(
    'loans',
    `ALTER TABLE loans
  ADD CONSTRAINT loans_term_check CHECK (due_at=borrowed_at+interval '336 hours'),
  ADD CONSTRAINT loans_returned_at_check CHECK (returned_at IS NULL OR returned_at>=borrowed_at);
CREATE UNIQUE INDEX loans_one_open_per_equipment_idx ON loans(tenant_id,equipment_id) WHERE returned_at IS NULL;
CREATE INDEX loans_open_user_idx ON loans(tenant_id,user_id,id) WHERE returned_at IS NULL;
CREATE INDEX loans_open_due_idx ON loans(tenant_id,user_id,due_at) WHERE returned_at IS NULL;
ALTER TABLE loan_rate_limits
  ADD CONSTRAINT loan_rate_limits_dimension_check CHECK(dimension IN ('user','ip')),
  ADD CONSTRAINT loan_rate_limits_hash_check CHECK(octet_length(key_hash)=32),
  ADD CONSTRAINT loan_rate_limits_attempts_check CHECK(attempts>0);
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_direct_access ON loans AS RESTRICTIVE FOR ALL TO PUBLIC USING(false) WITH CHECK(false);
CREATE POLICY deny_direct_access ON loan_rate_limits AS RESTRICTIVE FOR ALL TO PUBLIC USING(false) WITH CHECK(false);`,
  )
  run(['migrate', 'deploy'], env)
  run(['generate'], env)
} finally {
  writeFileSync('prisma/schema.prisma', original)
  await db?.stop()
}
