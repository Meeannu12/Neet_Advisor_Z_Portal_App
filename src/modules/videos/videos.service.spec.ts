import { Test, TestingModule } from '@nestjs/testing';
import { VideosService } from './videos.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Video } from './entities/video.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CoursesService } from '../courses/courses.service.js';
import { LanguagesService } from '../languages/languages.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { CounsellingTypesService } from '../counselling-types/counselling-types.service.js';
import { StorageService } from '../storage/storage.service.js';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('VideosService', () => {
    let service: VideosService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VideosService,
                {
                    provide: getRepositoryToken(Video),
                    useValue: {
                        create: vi.fn(),
                        save: vi.fn(),
                        findOne: vi.fn(),
                        findOneOrFail: vi.fn(),
                        remove: vi.fn(),
                        createQueryBuilder: vi.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findOne: vi.fn(),
                    },
                },
                {
                    provide: CoursesService,
                    useValue: { findOrCreate: vi.fn(), findAll: vi.fn().mockResolvedValue([{ name: 'UG', isActive: true }]) },
                },
                {
                    provide: LanguagesService,
                    useValue: { findOrCreate: vi.fn(), findAll: vi.fn().mockResolvedValue([{ name: 'Hindi', isActive: true }]) },
                },
                {
                    provide: SessionsService,
                    useValue: { findOrCreate: vi.fn(), findAll: vi.fn().mockResolvedValue([{ name: '2025-26', isActive: true }]) },
                },
                {
                    provide: CategoriesService,
                    useValue: { findOrCreate: vi.fn(), findAll: vi.fn().mockResolvedValue([{ name: 'Cutoff', slug: 'cutoff', isActive: true }]) },
                },
                {
                    provide: CounsellingTypesService,
                    useValue: { findOrCreate: vi.fn(), findAll: vi.fn().mockResolvedValue([{ name: 'AIQ', slug: 'aiq', isActive: true }]) },
                },
                {
                    provide: StorageService,
                    useValue: {
                        generatePresignedUploadUrl: vi.fn(),
                        deleteFile: vi.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<VideosService>(VideosService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return filter options', async () => {
        const filters = await service.getFilterOptions();
        expect(filters).toEqual({
            courses: ['UG'],
            sessions: ['2025-26'],
            categories: [{ name: 'Cutoff', slug: 'cutoff' }],
            languages: ['Hindi'],
            counsellingTypes: [{ name: 'AIQ', slug: 'aiq' }],
        });
    });
});
