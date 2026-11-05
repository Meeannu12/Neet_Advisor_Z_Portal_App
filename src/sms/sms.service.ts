import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);

    async sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
        this.logger.log(
            `[MOCK SMS] OTP ${otp} sent to ${phoneNumber}`,
        );

        return true;
    }
}