import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { VideosService } from './videos.service.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
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

    let coursesServiceMock: {
        findExistingOrThrow: ReturnType<typeof vi.fn>;
        findAll: ReturnType<typeof vi.fn>;
    };
    let languagesServiceMock: {
        findExistingOrThrow: ReturnType<typeof vi.fn>;
        findAll: ReturnType<typeof vi.fn>;
    };
    let sessionsServiceMock: {
        findExistingOrThrow: ReturnType<typeof vi.fn>;
        findAll: ReturnType<typeof vi.fn>;
    };
    let categoriesServiceMock: {
        findExistingOrThrow: ReturnType<typeof vi.fn>;
        findAll: ReturnType<typeof vi.fn>;
    };
    let counsellingTypesServiceMock: {
        findExistingOrThrow: ReturnType<typeof vi.fn>;
        findAll: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        videoRepositoryMock = {
            create: vi.fn((data) => data),
            save: vi.fn(async (data) => ({ id: 'vid-new', ...data })),
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
        coursesServiceMock = {
            findExistingOrThrow: vi.fn().mockResolvedValue({ id: 'course-1', name: 'UG' }),
            findAll: vi.fn().mockResolvedValue([{ name: 'UG', isActive: true }]),
        };
        languagesServiceMock = {
            findExistingOrThrow: vi.fn().mockResolvedValue({ id: 'lang-1', name: 'Hindi' }),
            findAll: vi.fn().mockResolvedValue([{ name: 'Hindi', isActive: true }]),
        };
        sessionsServiceMock = {
            findExistingOrThrow: vi.fn().mockResolvedValue({ id: 'session-1', name: '2025-26' }),
            findAll: vi.fn().mockResolvedValue([{ name: '2025-26', isActive: true }]),
        };
        categoriesServiceMock = {
            findExistingOrThrow: vi.fn().mockResolvedValue({ id: 'cat-1', name: 'Cutoff' }),
            findAll: vi.fn().mockResolvedValue([{ name: 'Cutoff', slug: 'cutoff', isActive: true }]),
        };
        counsellingTypesServiceMock = {
            findExistingOrThrow: vi.fn().mockResolvedValue({ id: 'ct-1', name: 'AIQ' }),
            findAll: vi.fn().mockResolvedValue([{ name: 'AIQ', slug: 'aiq', isActive: true }]),
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
                    useValue: coursesServiceMock,
                },
                {
                    provide: LanguagesService,
                    useValue: languagesServiceMock,
                },
                {
                    provide: SessionsService,
                    useValue: sessionsServiceMock,
                },
                {
                    provide: CategoriesService,
                    useValue: categoriesServiceMock,
                },
                {
                    provide: CounsellingTypesService,
                    useValue: counsellingTypesServiceMock,
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

    it('requires all 5 reference fields on CreateVideoDto', () => {
        const dtoMissingCounselling = plainToInstance(CreateVideoDto, {
            title: 'Test Video',
            thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
            videoUrl: 'https://cdn.example.com/vid.mp4',
            duration: 120,
            course: 'UG',
            language: 'Hindi',
            session: '2025-26',
            category: 'Cutoff',
        });

        const errors = validateSync(dtoMissingCounselling);
        expect(errors.some((e) => e.property === 'counsellingType')).toBe(true);
    });

    it('creates video when all 5 reference entities exist', async () => {
        const now = new Date();
        videoRepositoryMock.findOneOrFail.mockResolvedValueOnce({
            id: 'vid-new',
            title: 'Test Video',
            description: null,
            isPremium: false,
            thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
            videoUrl: 'https://cdn.example.com/vid.mp4',
            duration: 120,
            course: { name: 'UG' },
            language: { name: 'Hindi' },
            session: { name: '2025-26' },
            category: { name: 'Cutoff' },
            counsellingType: { name: 'AIQ' },
            createdAt: now,
            updatedAt: now,
        });

        const created = await service.create({
            title: 'Test Video',
            thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
            videoUrl: 'https://cdn.example.com/vid.mp4',
            duration: 120,
            course: 'UG',
            language: 'Hindi',
            session: '2025-26',
            category: 'Cutoff',
            counsellingType: 'AIQ',
        });

        expect(coursesServiceMock.findExistingOrThrow).toHaveBeenCalledWith('UG');
        expect(counsellingTypesServiceMock.findExistingOrThrow).toHaveBeenCalledWith('AIQ');
        expect(created.counsellingType).toBe('AIQ');
    });

    it('throws BadRequestException when any reference field does not exist', async () => {
        coursesServiceMock.findExistingOrThrow.mockRejectedValueOnce(
            new BadRequestException('Course "INVALID" does not exist or is inactive'),
        );
        counsellingTypesServiceMock.findExistingOrThrow.mockRejectedValueOnce(
            new BadRequestException('CounsellingType "UNKNOWN" does not exist or is inactive'),
        );

        await expect(
            service.create({
                title: 'Test Video',
                thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
                videoUrl: 'https://cdn.example.com/vid.mp4',
                duration: 120,
                course: 'INVALID',
                language: 'Hindi',
                session: '2025-26',
                category: 'Cutoff',
                counsellingType: 'UNKNOWN',
            }),
        ).rejects.toThrow('Course "INVALID" does not exist or is inactive; CounsellingType "UNKNOWN" does not exist or is inactive');
    });
});
