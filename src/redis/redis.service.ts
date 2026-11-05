import {
    Injectable,
    OnModuleDestroy,
} from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly redis: Redis;

    constructor() {
        this.redis = new Redis(
            process.env.REDIS_URL || 'redis://127.0.0.1:6379',
        );

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

    async ping(): Promise<string> {
        return this.redis.ping();
    }

    async onModuleDestroy(): Promise<void> {
        await this.redis.quit();
    }
}