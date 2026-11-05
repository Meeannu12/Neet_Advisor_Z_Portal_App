import {
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter: Transporter;

    constructor(private readonly configService: ConfigService) {
        const host = this.configService.get<string>('SMTP_HOST');
        const port = Number(this.configService.get<string>('SMTP_PORT') || 587);

        const user = this.configService.get<string>('SMTP_USER');
        const pass = this.configService.get<string>('SMTP_PASS');

        if (!host || !user || !pass) {
            throw new Error('SMTP configuration is missing');
        }

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure:
                this.configService.get<string>('SMTP_SECURE') === 'true',
            auth: {
                user,
                pass,
            },
        });
    }

    async sendNewContactRequest(number: string, requestedAt: Date) {
        try {
            const managerEmails = this.configService
                .get<string>('MANAGER_EMAILS')
                ?.split(',')
                .map((email) => email.trim())
                .filter(Boolean);

            if (!managerEmails?.length) {
                throw new Error('Manager email configuration is missing');
            }

            const from =
                this.configService.get<string>('SMTP_FROM') ||
                this.configService.get<string>('SMTP_USER');

            await this.transporter.sendMail({
                from,
                to: managerEmails,
                subject: 'New User Connection Request',

                text: `
A new user tried to log in to the mobile application.

Mobile Number: ${number}
Request Date: ${requestedAt.toLocaleString('en-IN')}

Please contact this user and complete their registration if appropriate.

Neet Advisor Application
        `,

                html: `
          <h2>New User Connection Request</h2>

          <p>A new user tried to log in to the mobile application.</p>

          <p><strong>Mobile Number:</strong> ${number}</p>

          <p>
            <strong>Request Date:</strong>
            ${requestedAt.toLocaleString('en-IN')}
          </p>

          <p>Please contact this user and complete their registration if appropriate.</p>

          <br />
          <p>Neet Advisor Application</p>
        `,
            });

            this.logger.log(`Contact request email sent for ${number}`);

            return true;
        } catch (error) {
            this.logger.error(
                'Failed to send contact request email',
                error instanceof Error ? error.stack : String(error),
            );

            throw new InternalServerErrorException(
                'Unable to send manager notification',
            );
        }
    }
}