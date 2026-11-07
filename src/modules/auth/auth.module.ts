import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { SmsModule } from '../../sms/sms.module.js';
import { MailModule } from '../../mail/mail.module.js';
import { ContactRequestsModule } from '../contact-requests/contact-requests.module.js';
import { UserDevicesModule } from '../user-devices/user-devices.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([User]),
    SmsModule,
    MailModule,
    ContactRequestsModule,
    UserDevicesModule
  ],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule { }
