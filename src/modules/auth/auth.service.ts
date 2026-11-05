import { HttpException, HttpStatus, Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { Repository } from 'typeorm';
import { RedisService } from '../../redis/redis.service.js';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { SmsService } from '../../sms/sms.service.js';
import { ContactRequestsService } from '../contact-requests/contact-requests.service.js';
import { MailService } from '../../mail/mail.service.js';

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
    ) { }


    async verifyOtp(number: string, otp: string) {
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
}
