-- Minimal bootstrap tables (sesuaikan dengan schema.prisma saat generate resmi)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT,
  api_key_hash TEXT,
  rate_limit INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  total INTEGER DEFAULT 0,
  processed INTEGER DEFAULT 0,
  success INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  country_default TEXT,
  platforms JSONB,
  summary JSONB
);

CREATE INDEX IF NOT EXISTS idx_jobs_tenant ON jobs(tenant_id);

CREATE TABLE IF NOT EXISTS job_items (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  e164 TEXT NOT NULL,
  wa_status TEXT,
  tg_status TEXT,
  wa_checked_at TIMESTAMPTZ,
  tg_checked_at TIMESTAMPTZ,
  error TEXT,
  meta JSONB
);

CREATE INDEX IF NOT EXISTS idx_job_items_job ON job_items(job_id);
CREATE INDEX IF NOT EXISTS idx_job_items_e164 ON job_items(e164);

CREATE TABLE IF NOT EXISTS wa_cache (
  e164 TEXT PRIMARY KEY,
  status TEXT,
  checked_at TIMESTAMPTZ,
  ttl_at TIMESTAMPTZ,
  meta JSONB
);

CREATE TABLE IF NOT EXISTS tg_cache (
  e164 TEXT PRIMARY KEY,
  status TEXT,
  checked_at TIMESTAMPTZ,
  ttl_at TIMESTAMPTZ,
  meta JSONB
);

CREATE TABLE IF NOT EXISTS tg_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_label TEXT,
  api_id TEXT,
  api_hash TEXT,
  session_string TEXT,
  proxy_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  daily_limit INTEGER DEFAULT 200,
  last_used_at TIMESTAMPTZ,
  error_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT,
  entity TEXT,
  entity_id TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
