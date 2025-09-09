export const REDIS_STREAMS = {
  BULK_ITEMS: 'bulk:items',
  BULK_PROGRESS: 'bulk:progress',
  WA_STAGE2: 'wa:stage2',
  TG_CHECKS: 'tg:checks',
} as const;

export const REDIS_CONSUMER_GROUPS = {
  RUNNER: 'runner',
  AGGREGATOR: 'aggregator',
  WA_WORKER: 'wa',
  TG_WORKER: 'tg',
} as const;

export const CACHE_TTL = {
  WA_CACHE: 7 * 24 * 60 * 60, // 7 days in seconds
  TG_CACHE: 7 * 24 * 60 * 60, // 7 days in seconds
  RATE_LIMIT: 60, // 1 minute in seconds
} as const;

export const RATE_LIMITS = {
  QUICK_CHECK_DEFAULT: 60, // requests per minute
  BULK_INGESTION_DEFAULT: 200, // items per second
  TG_ACCOUNT_DEFAULT: 20, // requests per minute
} as const;

export const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELED: 'canceled',
} as const;

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  USER: 'USER',
} as const;

export const PLATFORMS = {
  WHATSAPP: 'whatsapp',
  TELEGRAM: 'telegram',
} as const;

export const WA_STATUS = {
  REGISTERED: 'registered',
  NOT_REGISTERED: 'not_registered',
  BUSINESS_ACTIVE: 'business_active',
  UNKNOWN: 'unknown',
} as const;

export const TG_STATUS = {
  REGISTERED: 'registered',
  NOT_REGISTERED: 'not_registered',
  UNKNOWN: 'unknown',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const METRICS = {
  QUICK_CHECK_DURATION: 'numcheck_quick_check_duration_seconds',
  BULK_JOB_DURATION: 'numcheck_bulk_job_duration_seconds',
  WA_CHECK_DURATION: 'numcheck_wa_check_duration_seconds',
  TG_CHECK_DURATION: 'numcheck_tg_check_duration_seconds',
  CACHE_HIT_RATE: 'numcheck_cache_hit_rate',
  RATE_LIMIT_HITS: 'numcheck_rate_limit_hits_total',
  ACTIVE_JOBS: 'numcheck_active_jobs',
  QUEUE_SIZE: 'numcheck_queue_size',
} as const;
