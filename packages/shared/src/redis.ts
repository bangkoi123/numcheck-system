import Redis from 'ioredis';
import { REDIS_STREAMS, REDIS_CONSUMER_GROUPS } from './constants';
import { logger } from './logger';

export class RedisClient {
  private client: Redis;

  constructor(url?: string) {
    this.client = new Redis(url || process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on('error', (error) => {
      logger.error({ err: error }, 'Redis connection error');
    });

    this.client.on('connect', () => {
      logger.info('Connected to Redis');
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  // Stream operations
  async addToStream(
    stream: string,
    data: Record<string, string>,
    maxLength?: number
  ): Promise<string> {
    const args: any[] = [stream, 'MAXLEN', '~', maxLength || 10000, '*'];
    
    for (const [key, value] of Object.entries(data)) {
      args.push(key, value);
    }

    return this.client.xadd(...args);
  }

  async readFromStream(
    stream: string,
    group: string,
    consumer: string,
    count = 10,
    block = 1000
  ): Promise<any[]> {
    try {
      // Ensure consumer group exists
      await this.ensureConsumerGroup(stream, group);

      const result = await this.client.xreadgroup(
        'GROUP',
        group,
        consumer,
        'COUNT',
        count,
        'BLOCK',
        block,
        'STREAMS',
        stream,
        '>'
      );

      return result || [];
    } catch (error) {
      logger.error({ err: error, stream, group, consumer }, 'Error reading from stream');
      return [];
    }
  }

  async acknowledgeMessage(stream: string, group: string, messageId: string): Promise<void> {
    await this.client.xack(stream, group, messageId);
  }

  private async ensureConsumerGroup(stream: string, group: string): Promise<void> {
    try {
      await this.client.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
    } catch (error: any) {
      // Group already exists, ignore BUSYGROUP error
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
    }
  }

  // Cache operations
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // Hash operations
  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  // Rate limiting
  async incrementRateLimit(key: string, window: number): Promise<number> {
    const pipeline = this.client.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, window);
    const results = await pipeline.exec();
    
    return results?.[0]?.[1] as number || 0;
  }

  // Utility methods
  getClient(): Redis {
    return this.client;
  }
}

// Singleton instance
let redisInstance: RedisClient | null = null;

export function getRedisClient(): RedisClient {
  if (!redisInstance) {
    redisInstance = new RedisClient();
  }
  return redisInstance;
}

export async function initializeRedis(): Promise<RedisClient> {
  const redis = getRedisClient();
  await redis.connect();
  return redis;
}
