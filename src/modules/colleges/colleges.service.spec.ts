import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { CollegesService } from './colleges.service.js';
import { College } from './entities/college.entity.js';
import { CollegeSeat } from './entities/college-seat.entity.js';
import { ClosingRank } from './entities/closing-rank.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CoursesService } from '../courses/courses.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { CounsellingTypesService } from '../counselling-types/counselling-types.service.js';

describe('CollegesService', () => {
    let service: CollegesService;
    let collegeRepoMock: Record<string, ReturnType<typeof vi.fn>>;
    let seatRepoMock: Record<string, ReturnType<typeof vi.fn>>;
    let closingRankRepoMock: Record<string, ReturnType<typeof vi.fn>>;
    let userRepoMock: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(async () => {
        collegeRepoMock = {
            findOne: vi.fn(),
            create: vi.fn((d) => d),
            save: vi.fn(async (d) => ({ id: 'college-1', ...d })),
        };
        seatRepoMock = {
            findOne: vi.fn(),
            create: vi.fn((d) => d),
            save: vi.fn(async (d) => ({ id: 'seat-1', ...d })),
            createQueryBuilder: vi.fn(),
        };
        closingRankRepoMock = {
            findOne: vi.fn(),
            create: vi.fn((d) => d),
            save: vi.fn(async (d) => ({ id: 'cr-1', ...d })),
            createQueryBuilder: vi.fn(),
        };
        userRepoMock = {
            findOne: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CollegesService,
                { provide: getRepositoryToken(College), useValue: collegeRepoMock },
                { provide: getRepositoryToken(CollegeSeat), useValue: seatRepoMock },
                { provide: getRepositoryToken(ClosingRank), useValue: closingRankRepoMock },
                { provide: getRepositoryToken(User), useValue: userRepoMock },
                {
                    provide: CoursesService,
                    useValue: { findOrCreate: vi.fn().mockResolvedValue({ id: 'course-1', name: 'UG' }) },
                },
                {
                    provide: SessionsService,
                    useValue: { findOrCreate: vi.fn().mockResolvedValue({ id: 'session-1', name: '2025' }) },
                },
                {
                    provide: CounsellingTypesService,
                    useValue: { findOrCreate: vi.fn().mockResolvedValue({ id: 'ct-1', name: 'All India Quota' }) },
                },
            ],
        }).compile();

        service = module.get<CollegesService>(CollegesService);
    });

    it('creates a college with normalized slug', async () => {
        collegeRepoMock.findOne.mockResolvedValueOnce(null);
        const result = await service.createCollege({
            name: 'Grant Medical College',
            state: 'Maharashtra',
            city: 'Mumbai',
            instituteType: 'GOVT',
        });

        expect(result.slug).toBe('grant-medical-college-maharashtra');
        expect(collegeRepoMock.save).toHaveBeenCalledTimes(1);
    });

    it('scopes findColleges by regular user course from token', async () => {
        const qb: Record<string, ReturnType<typeof vi.fn>> = {
            innerJoinAndSelect: vi.fn(),
            andWhere: vi.fn(),
            orderBy: vi.fn(),
            addOrderBy: vi.fn(),
            skip: vi.fn(),
            take: vi.fn(),
            getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
        };
        qb.innerJoinAndSelect.mockReturnValue(qb);
        qb.andWhere.mockReturnValue(qb);
        qb.orderBy.mockReturnValue(qb);
        qb.addOrderBy.mockReturnValue(qb);
        qb.skip.mockReturnValue(qb);
        qb.take.mockReturnValue(qb);

        userRepoMock.findOne.mockResolvedValueOnce({ id: 'user-1', course: { name: 'UG' } });
        seatRepoMock.createQueryBuilder.mockReturnValueOnce(qb);

        const res = await service.findColleges({ page: 1, limit: 10 }, 'user-1', 'user');

        expect(qb.andWhere).toHaveBeenCalledWith('UPPER(course.name) = UPPER(:scopedCourse)', {
            scopedCourse: 'UG',
        });
        expect(res).toEqual({
            data: [],
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
        });
    });

    it('applies rank scan window when userRank is passed to findCutoffs', async () => {
        const qb: Record<string, ReturnType<typeof vi.fn>> = {
            innerJoinAndSelect: vi.fn(),
            andWhere: vi.fn(),
            orderBy: vi.fn(),
            skip: vi.fn(),
            take: vi.fn(),
            getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
        };
        qb.innerJoinAndSelect.mockReturnValue(qb);
        qb.andWhere.mockReturnValue(qb);
        qb.orderBy.mockReturnValue(qb);
        qb.skip.mockReturnValue(qb);
        qb.take.mockReturnValue(qb);

        closingRankRepoMock.createQueryBuilder.mockReturnValueOnce(qb);

        await service.findCutoffs({ userRank: 10000 });

        expect(qb.andWhere).toHaveBeenCalledWith('cr.closingRank BETWEEN :minScan AND :maxScan', {
            minScan: 5000,
            maxScan: 15000,
        });
    });
});
