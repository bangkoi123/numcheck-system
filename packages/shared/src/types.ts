export interface NumberValidationResult {
  e164: string;
  waStatus?: 'registered' | 'not_registered' | 'business_active' | 'unknown';
  tgStatus?: 'registered' | 'not_registered' | 'unknown';
  waCheckedAt?: Date;
  tgCheckedAt?: Date;
  error?: string;
  meta?: Record<string, any>;
}

export interface QuickCheckRequest {
  numbers: string[];
  platforms: ('whatsapp' | 'telegram')[];
  countryDefault?: string;
}

export interface QuickCheckResponse {
  items: NumberValidationResult[];
  summary: {
    wa: {
      registered: number;
      not_registered: number;
      business_active: number;
      unknown: number;
    };
    tg: {
      registered: number;
      not_registered: number;
      unknown: number;
    };
  };
}

export interface BulkJobRequest {
  numbers: string[];
  platforms: ('whatsapp' | 'telegram')[];
  countryDefault?: string;
}

export interface BulkJobResponse {
  jobId: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
  processed: number;
  total: number;
  progress: number;
  summary: QuickCheckResponse['summary'];
  exportUrl?: string;
  duplicatesCount: number;
  startedAt?: Date;
  finishedAt?: Date;
}

export interface RedisStreamMessage {
  id: string;
  data: Record<string, string>;
}

export interface BulkItemMessage {
  jobId: string;
  e164: string;
  platforms: string[];
  idempotencyKey: string;
}

export interface ProgressMessage {
  jobId: string;
  processed: number;
  total: number;
  summary: QuickCheckResponse['summary'];
}

export interface WaStage2Message {
  jobId: string;
  e164: string;
  idempotencyKey: string;
}

export interface TgCheckMessage {
  jobId: string;
  e164: string;
  idempotencyKey: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'TENANT_ADMIN' | 'USER';
  tenantId: string;
}

export interface ApiKeyAuth {
  tenantId: string;
  rateLimit: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}
