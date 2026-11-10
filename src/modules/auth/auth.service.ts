import { HttpException, HttpStatus, Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { Repository } from 'typeorm';
import { RedisService } from '../../redis/redis.service.js';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { SmsService } from '../../sms/sms.service.js';
import { ContactRequestsService } from '../contact-requests/contact-requests.service.js';
import { MailService } from '../../mail/mail.service.js';
import { UserDevicesService } from '../user-devices/user-devices.service.js';
import { DevicePlatform } from '../user-devices/entities/user-device.entity.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';


interface RefreshTokenPayload {
    sub: string;
    role: string;
    deviceId: string;
    tokenType: 'refresh';
}


@Injectable()
export class AuthService {

    private readonly logger = new Logger(AuthService.name);
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly redisService: RedisService,
        private readonly smsService: SmsService,
        private readonly contactRequestsService: ContactRequestsService,
        private readonly mailService: MailService,
        private readonly userDevicesService: UserDevicesService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }


    async verifyOtp(number: string, otp: string, device: { deviceId: string, deviceName?: string, platform: DevicePlatform }) {
        const user = await this.userRepository.findOne({
            where: { number },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException(
                'Invalid user or inactive account',
            );
        }

        const otpKey = `otp:${number}`;
        const attemptsKey = `otp:attempts:${number}`;

        // Get stored OTP hash
        const storedHash = await this.redisService.get(otpKey);

        if (!storedHash) {
            throw new UnauthorizedException(
                'OTP expired or not found. Please request a new OTP.',
            );
        }

        // Validate stored hash before timingSafeEqual
        if (!/^[a-f0-9]{64}$/i.test(storedHash)) {
            throw new UnauthorizedException('Invalid OTP');
        }

        // Generate hash of entered OTP
        const enteredHash = createHash('sha256')
            .update(otp)
            .digest('hex');

        const isValid = timingSafeEqual(
            Buffer.from(storedHash, 'hex'),
            Buffer.from(enteredHash, 'hex'),
        );

        // Wrong OTP
        if (!isValid) {
            const attempts = await this.redisService.increment(
                attemptsKey,
                300,
            );

            const remainingAttempts = Math.max(0, 5 - attempts);

            if (attempts >= 5) {
                await this.redisService.delete(otpKey);
                await this.redisService.delete(attemptsKey);

                throw new HttpException(
                    'Maximum OTP attempts exceeded. Please request a new OTP.',
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            throw new UnauthorizedException({
                message: 'Invalid OTP',
                remainingAttempts,
            });
        }

        // Register device only after OTP verification.
        // If the user already has 3 active devices, this throws 403.
        const registeredDevice =
            await this.userDevicesService.registerDevice({
                userId: user.id,
                deviceId: device.deviceId,
                deviceName: device.deviceName,
                platform: device.platform,
            });


        // Generate access token
        const accessToken = await this.jwtService.signAsync(
            {
                sub: user.id,
                role: user.role,
                deviceId: registeredDevice.deviceId,
                tokenType: 'access', // Important
            },
            {
                secret: this.configService.getOrThrow<string>(
                    'JWT_ACCESS_SECRET',
                ),
                expiresIn: '15m',
            },
        );

        // Generate refresh token
        const refreshToken = await this.jwtService.signAsync(
            {
                sub: user.id,
                role: user.role,
                deviceId: registeredDevice.deviceId,
                tokenType: 'refresh',
            },
            {
                secret: this.configService.getOrThrow<string>(
                    'JWT_REFRESH_SECRET',
                ),
                expiresIn: '30d',
            },
        );


        // Store only refresh token hash
        const refreshTokenHash = createHash('sha256')
            .update(refreshToken)
            .digest('hex');

        const refreshTokenExpiresAt = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
        );

        await this.userDevicesService.saveRefreshToken(
            user.id,
            registeredDevice.deviceId,
            refreshTokenHash,
            refreshTokenExpiresAt,
        );

        // OTP successfully verified
        await this.redisService.delete(otpKey);
        await this.redisService.delete(attemptsKey);

        return {
            success: true,
            message: 'OTP verified successfully',
            user: {
                id: user.id,
                name: user.name,
                number: user.number,
                role: user.role,
            },
            device: {
                id: registeredDevice.id,
                deviceId: registeredDevice.deviceId,
                deviceName: registeredDevice.deviceName,
                platform: registeredDevice.platform,
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: 900,
                refreshExpiresIn: 2592000,
            },
        };
    }

    async sendOtp(number: string) {
        const user = await this.userRepository.findOne({
            where: { number },
        });

        if (!user) {
            const { request, isNew } =
                await this.contactRequestsService.createRequest(number);

            if (isNew) {
                try {
                    await this.mailService.sendNewContactRequest(
                        number,
                        request.requestAt,
                    );
                } catch (error) {
                    this.logger.error(
                        `Manager notification failed for contact request ${request.id}`,
                        error instanceof Error ? error.stack : String(error),
                    );
                }
            }

            return {
                success: true,
                userRegistered: false,
                message: 'We will connect you soon.',
            };
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Your account is inactive');
        }

        // 3. Check resend cooldown
        const cooldownKey = `otp:cooldown:${number}`;

        const cooldown = await this.redisService.get(cooldownKey);

        if (cooldown) {
            throw new HttpException(
                'Please wait before requesting another OTP', HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        // Reset previous wrong OTP attempts
        await this.redisService.delete(`otp:attempts:${number}`);

        // 4. Generate 6-digit OTP
        const otp = randomInt(100000, 1000000).toString()

        // 5. Hash OTP
        const otpHash = createHash('sha256')
            .update(otp)
            .digest('hex')

        const otpKey = `otp:${number}`;

        await this.redisService.set(otpKey, otpHash, 300);

        // 7. Set 60-second resend cooldown
        await this.redisService.set(cooldownKey, '1', 60);

        // 8. Send OTP
        try {
            await this.smsService.sendOtp(number, otp);
        } catch {
            await this.redisService.delete(otpKey);
            await this.redisService.delete(cooldownKey);

            throw new InternalServerErrorException(
                'Unable to send OTP. Please try again.',
            );
        }


        return {
            success: true,
            message: 'OTP generated successfully',
            expiresIn: 300,
            resendAfter: 60,
        }
    }


    async refreshTokens(refreshToken: string) {
        let payload: RefreshTokenPayload;

        // 1. Verify refresh token
        try {
            payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
                refreshToken,
                {
                    secret: this.configService.getOrThrow<string>(
                        'JWT_REFRESH_SECRET',
                    ),
                },
            );
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        // 2. Check token type
        if (
            !payload.sub ||
            !payload.deviceId ||
            payload.tokenType !== 'refresh'
        ) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // 3. Check user
        const user = await this.userRepository.findOne({
            where: { id: payload.sub },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('User not found or inactive');
        }

        // 4. Hash old refresh token
        const oldTokenHash = createHash('sha256')
            .update(refreshToken)
            .digest('hex');

        // 5. Generate new tokens
        const accessToken = await this.jwtService.signAsync(
            {
                sub: user.id,
                role: user.role,
                deviceId: payload.deviceId,
                tokenType: 'access',
            },
            {
                secret: this.configService.getOrThrow<string>(
                    'JWT_ACCESS_SECRET',
                ),
                expiresIn: '15m',
            },
        );

        const newRefreshToken = await this.jwtService.signAsync(
            {
                sub: user.id,
                role: user.role,
                deviceId: payload.deviceId,
                tokenType: 'refresh',
            },
            {
                secret: this.configService.getOrThrow<string>(
                    'JWT_REFRESH_SECRET',
                ),
                expiresIn: '30d',
            },
        );

        const newTokenHash = createHash('sha256')
            .update(newRefreshToken)
            .digest('hex');

        const expiresAt = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
        );

        // 6. Atomically rotate refresh token
        const rotated = await this.userDevicesService.rotateRefreshToken(
            user.id,
            payload.deviceId,
            oldTokenHash,
            newTokenHash,
            expiresAt,
        );

        if (!rotated) {
            throw new UnauthorizedException(
                'Refresh token is invalid, expired or device is inactive',
            );
        }

        // 7. Return new tokens
        return {
            success: true,
            message: 'Tokens refreshed successfully',
            tokens: {
                accessToken,
                refreshToken: newRefreshToken,
                expiresIn: 900,
                refreshExpiresIn: 2592000,
            },
        };
    }


    async logoutDevice(
        userId: string,
        deviceId: string,
    ) {
        return this.userDevicesService.logoutDevice(
            userId,
            deviceId,
        );
    }

    async logoutAllDevices(userId: string) {
        return this.userDevicesService.logoutAllDevices(userId);
    }

    async getActiveDevices(userId: string) {
        return this.userDevicesService.getActiveDevices(userId);
    }

    async logoutSpecificDevice(
        userId: string,
        deviceId: string,
    ) {
        return this.userDevicesService.logoutSpecificDevice(
            userId,
            deviceId,
        );
    }
}
