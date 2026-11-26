import { Test, TestingModule } from '@nestjs/testing';
import { CounsellingTypesService } from './counselling-types.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CounsellingType } from './entities/counselling-type.entity.js';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('CounsellingTypesService', () => {
    let service: CounsellingTypesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CounsellingTypesService,
                {
                    provide: getRepositoryToken(CounsellingType),
                    useValue: {
                        find: vi.fn(),
                        findOne: vi.fn(),
                        create: vi.fn(),
                        save: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<CounsellingTypesService>(CounsellingTypesService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
