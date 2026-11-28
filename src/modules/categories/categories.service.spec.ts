import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { CategoriesService } from './categories.service.js';
import { Category } from './entities/category.entity.js';

describe('CategoriesService', () => {
    let service: CategoriesService;
    let repoMock: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(async () => {
        repoMock = {
            find: vi.fn().mockResolvedValue([{ id: 'cat-1', name: 'Registration Demos', slug: 'registration-demos', isActive: true }]),
            findOne: vi.fn(),
            create: vi.fn((d) => d),
            save: vi.fn(async (d) => ({ id: 'cat-new', ...d })),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CategoriesService,
                { provide: getRepositoryToken(Category), useValue: repoMock },
            ],
        }).compile();

        service = module.get<CategoriesService>(CategoriesService);
    });

    it('creates a new category with slug and throws ConflictException on duplicate', async () => {
        repoMock.findOne.mockResolvedValueOnce(null);
        const created = await service.create('Registration Demos');
        expect(created.slug).toBe('registration-demos');

        repoMock.findOne.mockResolvedValueOnce({ id: 'cat-1', name: 'Registration Demos' });
        await expect(service.create('Registration Demos')).rejects.toThrow(ConflictException);
    });
});
