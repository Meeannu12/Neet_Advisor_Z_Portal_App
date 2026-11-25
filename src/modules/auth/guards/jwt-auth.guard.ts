import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../users/entities/user.entity.js';
import { UserDevicesService } from '../../user-devices/user-devices.service.js';
import { RedisService } from '../../../redis/redis.service.js';

import type { Request } from 'express';

interface AccessTokenPayload {
    sub: string;
    role: string;
    deviceId: string;
    tokenType: 'access';
}

interface AuthenticatedRequest extends Request {
    user?: AccessTokenPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly userDevicesService: UserDevicesService,
        private readonly redisService: RedisService,

        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request =
            context.switchToHttp().getRequest<AuthenticatedRequest>();

        const authHeader = request.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Access token required');
        }

        const token = authHeader.substring(7);

        let payload: AccessTokenPayload;

        try {
            payload =
                await this.jwtService.verifyAsync<AccessTokenPayload>(
                    token,
                    {
                        secret: this.configService.getOrThrow<string>(
                            'JWT_ACCESS_SECRET',
                        ),
                    },
                );
        } catch {
            throw new UnauthorizedException(
                'Invalid or expired access token',
            );
        }

        if (
            !payload.sub ||
            !payload.deviceId ||
            payload.tokenType !== 'access'
        ) {
            throw new UnauthorizedException('Invalid access token');
        }

        // =========================================================================
        // Performance Optimization: Redis Session Cache
        // Checking Redis in O(1) time (~0.5ms) bypasses 2 PostgreSQL queries on
        // EVERY protected API call, cutting DB auth load by ~95%.
        // =========================================================================
        const sessionKey = `session:${payload.sub}:${payload.deviceId}`;
        const cachedSession = await this.redisService.get(sessionKey);

        if (cachedSession === 'active') {
            request.user = payload;
            return true;
        }

        // Cache Miss: Perform database verification
        // 1. Check user status
        const user = await this.userRepository.findOne({
            where: {
                id: payload.sub,
                isActive: true,
            },
            select: {
                id: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException('User is inactive or not found');
        }

        // 2. Check device status
        const isActive = await this.userDevicesService.isDeviceActive(
            payload.sub,
            payload.deviceId,
        );

        if (!isActive) {
            throw new UnauthorizedException('Device session is inactive');
        }

        // Populate Redis session cache with TTL = 15m (matching access token lifespan)
        await this.redisService.set(sessionKey, 'active', 900);

        request.user = payload;
        return true;
    }
}
