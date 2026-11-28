import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ChoiceListsService } from './choice-lists.service.js';
import { ChoiceList } from './entities/choice-list.entity.js';
import { ChoiceListItem } from './entities/choice-list-item.entity.js';
import { CollegeSeat } from '../colleges/entities/college-seat.entity.js';
import { ClosingRank } from '../colleges/entities/closing-rank.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CoursesService } from '../courses/courses.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { CounsellingTypesService } from '../counselling-types/counselling-types.service.js';
import {
    computeChanceTag,
    isSeatEligibleForCriteria,
} from './utils/choice-list-chance.util.js';

describe('ChoiceListsService & helpers', () => {
    let service: ChoiceListsService;
    let choiceListRepoMock: Record<string, ReturnType<typeof vi.fn>>;
    let itemRepoMock: Record<string, ReturnType<typeof vi.fn>>;
    let seatRepoMock: Record<string, ReturnType<typeof vi.fn>>;
    let closingRankRepoMock: Record<string, ReturnType<typeof vi.fn>>;
    let userRepoMock: Record<string, ReturnType<typeof vi.fn>>;
    let managerMock: {
        delete: ReturnType<typeof vi.fn>;
        getRepository: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        choiceListRepoMock = {
            find: vi.fn(),
            findOne: vi.fn(),
            update: vi.fn(),
            create: vi.fn((d) => d),
            save: vi.fn(async (d) => ({ id: 'list-1', ...d })),
        };
        itemRepoMock = {
            find: vi.fn(),
            delete: vi.fn(),
            update: vi.fn(),
            create: vi.fn((d) => d),
            save: vi.fn(async (d) => d),
        };
        seatRepoMock = {
            find: vi.fn(),
        };
        closingRankRepoMock = {
            find: vi.fn(),
            createQueryBuilder: vi.fn(),
        };
        userRepoMock = {
            findOne: vi.fn(),
        };

        managerMock = {
            delete: vi.fn(),
            getRepository: vi.fn((entity: unknown) => {
                if (entity === ChoiceList) return choiceListRepoMock;
                return itemRepoMock;
            }),
        };

        const dataSourceMock = {
            transaction: vi.fn(async (cb: (m: typeof managerMock) => Promise<unknown>) =>
                cb(managerMock),
            ),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChoiceListsService,
                { provide: getRepositoryToken(ChoiceList), useValue: choiceListRepoMock },
                { provide: getRepositoryToken(ChoiceListItem), useValue: itemRepoMock },
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
                { provide: DataSource, useValue: dataSourceMock },
            ],
        }).compile();

        service = module.get<ChoiceListsService>(ChoiceListsService);
    });

    it('computes DREAM, REALISTIC, SAFE, and UNKNOWN chance tags accurately', () => {
        expect(computeChanceTag(10000, 7500)).toBe('DREAM');
        expect(computeChanceTag(10000, 10500)).toBe('REALISTIC');
        expect(computeChanceTag(10000, 15000)).toBe('SAFE');
        expect(computeChanceTag(10000, null)).toBe('UNKNOWN');
    });

    it('enforces budget and domicile eligibility rules', () => {
        expect(
            isSeatEligibleForCriteria(
                {
                    annualTuitionFee: 100000,
                    isOpenState: false,
                    collegeState: 'Maharashtra',
                    counsellingTypeSlug: 'state-quota',
                },
                { domicileState: 'Maharashtra', maxAnnualBudget: 200000 },
            ),
        ).toBe(true);

        expect(
            isSeatEligibleForCriteria(
                {
                    annualTuitionFee: 100000,
                    isOpenState: false,
                    collegeState: 'Karnataka',
                    counsellingTypeSlug: 'state-quota',
                },
                { domicileState: 'Maharashtra', maxAnnualBudget: 200000 },
            ),
        ).toBe(false);

        expect(
            isSeatEligibleForCriteria(
                {
                    annualTuitionFee: 100000,
                    isOpenState: false,
                    collegeState: 'Delhi',
                    counsellingTypeSlug: 'all-india-quota',
                },
                { domicileState: 'Maharashtra', maxAnnualBudget: 200000 },
            ),
        ).toBe(true);
    });

    it('saves choice list atomically with incremented version for cross-device sync', async () => {
        choiceListRepoMock.findOne
            .mockResolvedValueOnce({
                id: 'list-1',
                userId: 'user-1',
                title: 'Old Title',
                courseId: 'course-1',
                sessionId: 'session-1',
                round: 'ROUND_1',
                neetRank: 12000,
                candidateCategory: 'OBC',
                domicileState: 'Maharashtra',
                maxAnnualBudget: 500000,
                status: 'DRAFT',
                version: 1,
            })
            .mockResolvedValueOnce({
                id: 'list-1',
                userId: 'user-1',
                createdByAdvisorId: null,
                title: 'AIQ Round 1 Saved',
                course: { name: 'UG' },
                session: { name: '2025' },
                counsellingType: null,
                sessionId: 'session-1',
                round: 'ROUND_1',
                neetRank: 12000,
                candidateCategory: 'OBC',
                domicileState: 'Maharashtra',
                maxAnnualBudget: 500000,
                status: 'SAVED',
                version: 2,
                lastSavedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                items: [
                    {
                        id: 'item-1',
                        collegeSeatId: 'seat-1',
                        priorityOrder: 1,
                        chanceTag: 'REALISTIC',
                        notes: 'Top pick',
                        collegeSeat: {
                            id: 'seat-1',
                            programName: 'MBBS',
                            quotaName: 'AIQ 15%',
                            annualTuitionFee: 50000,
                            bondYears: 1,
                            stipendAmount: null,
                            counsellingType: { name: 'All India Quota' },
                            college: {
                                id: 'college-1',
                                name: 'GMC Mumbai',
                                state: 'Maharashtra',
                                city: 'Mumbai',
                                instituteType: 'GOVT',
                            },
                        },
                    },
                ],
            });

        seatRepoMock.find.mockResolvedValueOnce([{ id: 'seat-1', courseId: 'course-1', isActive: true }]);
        closingRankRepoMock.find
            .mockResolvedValueOnce([{ collegeSeatId: 'seat-1', closingRank: 12500 }])
            .mockResolvedValueOnce([{ collegeSeatId: 'seat-1', openingRank: 8000, closingRank: 12500 }]);

        const result = await service.save('list-1', 'user-1', 'user', {
            title: 'AIQ Round 1 Saved',
            version: 1,
            items: [{ collegeSeatId: 'seat-1', priorityOrder: 1, notes: 'Top pick' }],
        });

        expect(choiceListRepoMock.update).toHaveBeenCalledWith(
            { id: 'list-1' },
            expect.objectContaining({
                title: 'AIQ Round 1 Saved',
                status: 'SAVED',
                version: 2,
            }),
        );
        expect(result.version).toBe(2);
        expect(result.status).toBe('SAVED');
        expect(result.items[0].chanceTag).toBe('REALISTIC');
    });

    it('throws ConflictException when saving with stale version from another device', async () => {
        choiceListRepoMock.findOne.mockResolvedValueOnce({
            id: 'list-1',
            userId: 'user-1',
            status: 'SAVED',
            version: 3,
        });

        await expect(
            service.save('list-1', 'user-1', 'user', {
                version: 2,
                items: [],
            }),
        ).rejects.toThrow(ConflictException);
    });

    it('exports saved choice list to an xlsx buffer', async () => {
        choiceListRepoMock.findOne
            .mockResolvedValueOnce({
                id: 'list-1',
                userId: 'user-1',
                status: 'SAVED',
            })
            .mockResolvedValueOnce({
                id: 'list-1',
                userId: 'user-1',
                createdByAdvisorId: null,
                title: 'My Export List',
                course: { name: 'UG' },
                session: { name: '2025' },
                counsellingType: null,
                sessionId: 'session-1',
                round: 'ROUND_1',
                neetRank: 12000,
                candidateCategory: 'GEN',
                domicileState: 'Delhi',
                maxAnnualBudget: null,
                status: 'SAVED',
                version: 1,
                lastSavedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                items: [],
            });

        const exported = await service.exportExcel('list-1', 'user-1', 'user');
        expect(exported.fileName).toBe('my-export-list.xlsx');
        expect(Buffer.isBuffer(exported.buffer)).toBe(true);
        expect(exported.buffer.byteLength).toBeGreaterThan(0);
    });
});
