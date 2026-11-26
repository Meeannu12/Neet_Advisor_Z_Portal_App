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
    let videoRepositoryMock: {
        create: ReturnType<typeof vi.fn>;
        save: ReturnType<typeof vi.fn>;
        find: ReturnType<typeof vi.fn>;
        findOne: ReturnType<typeof vi.fn>;
        findOneOrFail: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
        query: ReturnType<typeof vi.fn>;
        createQueryBuilder: ReturnType<typeof vi.fn>;
    };
    let userRepositoryMock: {
        findOne: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        videoRepositoryMock = {
            create: vi.fn(),
            save: vi.fn(),
            find: vi.fn(),
            findOne: vi.fn(),
            findOneOrFail: vi.fn(),
            remove: vi.fn(),
            query: vi.fn(),
            createQueryBuilder: vi.fn(),
        };
        userRepositoryMock = {
            findOne: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VideosService,
                {
                    provide: getRepositoryToken(Video),
                    useValue: videoRepositoryMock,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: userRepositoryMock,
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

    it('should return videos grouped under Latest and active categories', async () => {
        const createdAt1 = new Date('2026-09-03T10:00:00.000Z');
        const createdAt2 = new Date('2026-08-14T10:00:00.000Z');

        const video1 = {
            id: 'vid-1',
            title: 'Kerala Notice',
            isPremium: false,
            thumbnailUrl: 'https://cdn.example.com/1.jpg',
            duration: 134,
            course: { name: 'UG' },
            language: { name: 'MALAYALAM' },
            session: { name: '2026' },
            category: { name: 'Quick Info' },
            counsellingType: { name: 'State Quota' },
            createdAt: createdAt1,
        };
        const video2 = {
            id: 'vid-2',
            title: 'Maharashtra Registration Demo',
            isPremium: true,
            thumbnailUrl: 'https://cdn.example.com/2.jpg',
            duration: 3665,
            course: { name: 'UG' },
            language: { name: 'ENGLISH' },
            session: { name: '2026' },
            category: { name: 'Registration Demos' },
            counsellingType: null,
            createdAt: createdAt2,
        };

        const createQbMock = (getManyResult: unknown[] = []) => {
            const qb: Record<string, ReturnType<typeof vi.fn>> = {
                leftJoinAndSelect: vi.fn(),
                leftJoin: vi.fn(),
                andWhere: vi.fn(),
                select: vi.fn(),
                addSelect: vi.fn(),
                orderBy: vi.fn(),
                take: vi.fn(),
                getMany: vi.fn().mockResolvedValue(getManyResult),
                getQueryAndParameters: vi.fn().mockReturnValue(['SELECT "video"."id" AS "id" FROM "videos" "video"', []]),
            };
            qb.leftJoinAndSelect.mockReturnValue(qb);
            qb.leftJoin.mockReturnValue(qb);
            qb.andWhere.mockReturnValue(qb);
            qb.select.mockReturnValue(qb);
            qb.addSelect.mockReturnValue(qb);
            qb.orderBy.mockReturnValue(qb);
            qb.take.mockReturnValue(qb);
            return qb;
        };

        const latestQb = createQbMock([video1, video2]);
        const rankedQb = createQbMock();

        userRepositoryMock.findOne.mockResolvedValueOnce({ id: 'user-1', course: { name: 'UG' } });
        videoRepositoryMock.createQueryBuilder
            .mockReturnValueOnce(latestQb)
            .mockReturnValueOnce(rankedQb);
        videoRepositoryMock.query.mockResolvedValueOnce([{ id: 'vid-1' }, { id: 'vid-2' }]);
        videoRepositoryMock.find.mockResolvedValueOnce([video1, video2]);

        const result = await service.findSections({ limit: 10 }, 'user-1', 'user');

        expect(latestQb.andWhere).toHaveBeenCalledWith('UPPER(course.name) = UPPER(:scopedCourse)', {
            scopedCourse: 'UG',
        });
        expect(videoRepositoryMock.query).toHaveBeenCalledWith(
            expect.stringContaining('WHERE ranked.rn <= $1'),
            [10],
        );
        expect(Object.keys(result.data)).toEqual(['Latest', 'Quick Info', 'Registration Demos']);
        expect(result.data.Latest).toHaveLength(2);
        expect(result.data['Quick Info'][0]).toEqual({
            id: 'vid-1',
            title: 'Kerala Notice',
            isPremium: false,
            thumbnailUrl: 'https://cdn.example.com/1.jpg',
            duration: 134,
            durationFormatted: '00:02:14',
            course: 'UG',
            language: 'MALAYALAM',
            session: '2026',
            category: 'Quick Info',
            counsellingType: 'State Quota',
            createdAt: createdAt1,
        });
        expect(result.data['Registration Demos'][0].durationFormatted).toBe('01:01:05');
    });

    it('should return empty Latest array when no videos match filters', async () => {
        const createEmptyQb = () => {
            const qb: Record<string, ReturnType<typeof vi.fn>> = {
                leftJoinAndSelect: vi.fn(),
                leftJoin: vi.fn(),
                andWhere: vi.fn(),
                select: vi.fn(),
                addSelect: vi.fn(),
                orderBy: vi.fn(),
                take: vi.fn(),
                getMany: vi.fn().mockResolvedValue([]),
                getQueryAndParameters: vi.fn().mockReturnValue(['SELECT "video"."id" AS "id" FROM "videos" "video"', []]),
            };
            qb.leftJoinAndSelect.mockReturnValue(qb);
            qb.leftJoin.mockReturnValue(qb);
            qb.andWhere.mockReturnValue(qb);
            qb.select.mockReturnValue(qb);
            qb.addSelect.mockReturnValue(qb);
            qb.orderBy.mockReturnValue(qb);
            qb.take.mockReturnValue(qb);
            return qb;
        };

        videoRepositoryMock.createQueryBuilder
            .mockReturnValueOnce(createEmptyQb())
            .mockReturnValueOnce(createEmptyQb());
        videoRepositoryMock.query.mockResolvedValueOnce([]);

        const result = await service.findSections({ session: '2099' });

        expect(videoRepositoryMock.find).not.toHaveBeenCalled();
        expect(result).toEqual({ data: { Latest: [] } });
    });
});
