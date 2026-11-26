import { Test, TestingModule } from '@nestjs/testing';
import { VideosService } from './videos.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Video } from './entities/video.entity.js';
import { CoursesService } from '../courses/courses.service.js';
import { LanguagesService } from '../languages/languages.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { CategoriesService } from '../categories/categories.service.js';
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
                    provide: CoursesService,
                    useValue: { findOrCreate: vi.fn() },
                },
                {
                    provide: LanguagesService,
                    useValue: { findOrCreate: vi.fn() },
                },
                {
                    provide: SessionsService,
                    useValue: { findOrCreate: vi.fn() },
                },
                {
                    provide: CategoriesService,
                    useValue: { findOrCreate: vi.fn() },
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
});
