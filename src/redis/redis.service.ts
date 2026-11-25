import {
    Injectable,
    OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly redis: Redis;

    constructor(private readonly configService: ConfigService) {
        // Loose Coupling: Read configuration via ConfigService instead of direct process.env
        const redisUrl =
            this.configService.get<string>('REDIS_URL') ||
            process.env.REDIS_URL ||
            'redis://127.0.0.1:6379';

        this.redis = new Redis(redisUrl, {
            // Resilience: Configure bounded retries to prevent blocking under connection failure
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        this.redis.on('connect', () => {
            console.log('Redis connected successfully');
        });

        this.redis.on('error', (error: Error) => {
            console.error('Redis connection error:', error.message);
        });
    }

    async increment(
        key: string,
        ttlSeconds: number,
    ): Promise<number> {
        const count = await this.redis.incr(key);

        if (count === 1) {
            await this.redis.expire(key, ttlSeconds);
        }

        return count;
    }

    async get(key: string): Promise<string | null> {
        return this.redis.get(key);
    }

    async set(
        key: string,
        value: string,
        ttlSeconds?: number,
    ): Promise<void> {
        if (ttlSeconds) {
            await this.redis.set(key, value, 'EX', ttlSeconds);
            return;
        }

        await this.redis.set(key, value);
    }

    async delete(key: string): Promise<number> {
        return this.redis.del(key);
    }

    // Pattern-based deletion helper for clearing multiple device sessions (e.g. on logoutAll)
    async deletePattern(pattern: string): Promise<void> {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }

    async ping(): Promise<string> {
        return this.redis.ping();
    }

    async onModuleDestroy(): Promise<void> {
        await this.redis.quit();
    }
}
