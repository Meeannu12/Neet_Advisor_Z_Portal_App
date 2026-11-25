import { Test, TestingModule } from '@nestjs/testing';
import { UserDevicesService } from './user-devices.service.js';
import { DataSource } from 'typeorm';
import { RedisService } from '../../redis/redis.service.js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('UserDevicesService', () => {
  let service: UserDevicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserDevicesService,
        {
          provide: DataSource,
          useValue: {
            transaction: vi.fn(),
            getRepository: vi.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: vi.fn(),
            set: vi.fn(),
            delete: vi.fn(),
            deletePattern: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserDevicesService>(UserDevicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
