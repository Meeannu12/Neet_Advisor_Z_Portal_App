import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CounsellingTypesService } from './counselling-types.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CounsellingType } from './entities/counselling-type.entity.js';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('CounsellingTypesService', () => {
    let service: CounsellingTypesService;
    let repoMock: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(async () => {
        repoMock = {
            find: vi.fn().mockResolvedValue([{ id: 'ct-1', name: 'All India Quota', slug: 'all-india-quota', isActive: true }]),
            findOne: vi.fn(),
            create: vi.fn((d) => d),
            save: vi.fn(async (d) => ({ id: 'ct-new', ...d })),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CounsellingTypesService,
                {
                    provide: getRepositoryToken(CounsellingType),
                    useValue: repoMock,
                },
            ],
        }).compile();

        service = module.get<CounsellingTypesService>(CounsellingTypesService);
    });

    it('should create a counselling type with slug when unique', async () => {
        repoMock.findOne.mockResolvedValueOnce(null);
        const created = await service.create('Central Quota');
        expect(created).toEqual(
            expect.objectContaining({
                name: 'Central Quota',
                slug: 'central-quota',
                isActive: true,
            }),
        );
    });

    it('should throw ConflictException when creating duplicate counselling type', async () => {
        repoMock.findOne.mockResolvedValueOnce({ id: 'ct-1', name: 'All India Quota' });
        await expect(service.create('All India Quota')).rejects.toThrow(ConflictException);
    });
});
