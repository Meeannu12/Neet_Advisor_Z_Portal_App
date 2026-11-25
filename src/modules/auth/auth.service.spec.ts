import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { RedisService } from '../../redis/redis.service.js';
import { SmsService } from '../../sms/sms.service.js';
import { ContactRequestsService } from '../contact-requests/contact-requests.service.js';
import { MailService } from '../../mail/mail.service.js';
import { UserDevicesService } from '../user-devices/user-devices.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: vi.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: vi.fn(),
            set: vi.fn(),
            delete: vi.fn(),
            increment: vi.fn(),
          },
        },
        {
          provide: SmsService,
          useValue: {
            sendOtp: vi.fn(),
          },
        },
        {
          provide: ContactRequestsService,
          useValue: {
            createRequest: vi.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendNewContactRequest: vi.fn(),
          },
        },
        {
          provide: UserDevicesService,
          useValue: {
            registerDevice: vi.fn(),
            saveRefreshToken: vi.fn(),
            rotateRefreshToken: vi.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: vi.fn(),
            verifyAsync: vi.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn(),
            getOrThrow: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
