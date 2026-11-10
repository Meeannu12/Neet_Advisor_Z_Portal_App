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

        // Check user status
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

        // Check device status
        const isActive = await this.userDevicesService.isDeviceActive(
            payload.sub,
            payload.deviceId,
        );

        if (!isActive) {
            throw new UnauthorizedException('Device session is inactive');
        }

        request.user = payload;

        return true;
    }
}