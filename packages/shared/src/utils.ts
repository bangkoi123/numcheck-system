import crypto from 'crypto';

export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function generateJobId(): string {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8);
  return `job_${timestamp}_${random}`;
}

export function hashApiKey(apiKey: string, pepper: string): string {
  return crypto
    .createHash('sha256')
    .update(apiKey + pepper)
    .digest('hex');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function exponentialBackoff(attempt: number, baseDelay = 1000, maxDelay = 30000): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

export function parseJsonSafely<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export function calculateProgress(processed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((processed / total) * 100) / 100;
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function maskSensitiveData(data: string, visibleChars = 4): string {
  if (data.length <= visibleChars * 2) {
    return '*'.repeat(data.length);
  }
  
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const middle = '*'.repeat(data.length - visibleChars * 2);
  
  return start + middle + end;
}

export function createSignedUrl(
  baseUrl: string,
  path: string,
  secret: string,
  expiresIn = 3600
): string {
  const expires = Math.floor(Date.now() / 1000) + expiresIn;
  const payload = `${path}:${expires}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  const url = new URL(path, baseUrl);
  url.searchParams.set('expires', expires.toString());
  url.searchParams.set('signature', signature);
  
  return url.toString();
}

export function verifySignedUrl(
  url: string,
  secret: string
): { valid: boolean; expired?: boolean } {
  try {
    const urlObj = new URL(url);
    const expires = urlObj.searchParams.get('expires');
    const signature = urlObj.searchParams.get('signature');
    
    if (!expires || !signature) {
      return { valid: false };
    }
    
    const expiresNum = parseInt(expires, 10);
    const now = Math.floor(Date.now() / 1000);
    
    if (now > expiresNum) {
      return { valid: false, expired: true };
    }
    
    const path = urlObj.pathname + urlObj.search.replace(/[?&](expires|signature)=[^&]*/g, '');
    const payload = `${path}:${expires}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return { valid: signature === expectedSignature };
  } catch {
    return { valid: false };
  }
}
