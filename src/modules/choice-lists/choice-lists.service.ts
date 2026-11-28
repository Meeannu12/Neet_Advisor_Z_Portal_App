import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import ExcelJS from 'exceljs';
import { ChoiceList } from './entities/choice-list.entity.js';
import { ChoiceListItem } from './entities/choice-list-item.entity.js';
import { CollegeSeat } from '../colleges/entities/college-seat.entity.js';
import { ClosingRank } from '../colleges/entities/closing-rank.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CoursesService } from '../courses/courses.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { CounsellingTypesService } from '../counselling-types/counselling-types.service.js';
import { UserRole } from '../../common/constants/roles.constant.js';
import {
    CandidateCategory,
    ChoiceListStatus,
    CounsellingRound,
} from '../colleges/constants/counselling.constants.js';
import {
    AddChoiceListItemsDto,
    AdminAssignChoiceListDto,
    AutoGenerateChoiceListDto,
    ChoiceListItemInputDto,
    CreateChoiceListDto,
    DuplicateChoiceListDto,
    ReorderChoiceListDto,
    SaveChoiceListDto,
} from './dto/choice-list.dto.js';
import {
    computeChanceTag,
    isSeatEligibleForCriteria,
} from './utils/choice-list-chance.util.js';

@Injectable()
export class ChoiceListsService {
    constructor(
        @InjectRepository(ChoiceList)
        private readonly choiceListRepository: Repository<ChoiceList>,
        @InjectRepository(ChoiceListItem)
        private readonly itemRepository: Repository<ChoiceListItem>,
        @InjectRepository(CollegeSeat)
        private readonly seatRepository: Repository<CollegeSeat>,
        @InjectRepository(ClosingRank)
        private readonly closingRankRepository: Repository<ClosingRank>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly coursesService: CoursesService,
        private readonly sessionsService: SessionsService,
        private readonly counsellingTypesService: CounsellingTypesService,
        private readonly dataSource: DataSource,
    ) {}

    private async resolveTargetUserAndCriteria(
        targetUserId: string,
        userRole?: string,
        courseOverride?: string,
        domicileOverride?: string,
    ) {
        const user = await this.userRepository.findOne({
            where: { id: targetUserId },
            relations: { course: true },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const courseName =
            userRole === UserRole.ADMIN && courseOverride?.trim()
                ? courseOverride.trim()
                : user.course?.name || courseOverride?.trim();

        if (!courseName) {
            throw new BadRequestException('Course is required for choice list');
        }

        const course = await this.coursesService.findOrCreate(courseName);
        const domicileState = domicileOverride?.trim() || user.state;

        return { user, course, domicileState };
    }

    private async assertAccess(
        id: string,
        userId: string,
        userRole?: string,
        requireMutable = false,
    ): Promise<ChoiceList> {
        const list = await this.choiceListRepository.findOne({
            where: { id },
            relations: {
                course: true,
                session: true,
                counsellingType: true,
            },
        });

        if (!list) {
            throw new NotFoundException('Choice list not found');
        }

        if (userRole !== UserRole.ADMIN && list.userId !== userId) {
            throw new ForbiddenException('You do not have access to this choice list');
        }

        if (requireMutable && list.status === ChoiceListStatus.LOCKED) {
            throw new BadRequestException('Choice list is locked and cannot be modified');
        }

        return list;
    }

    private async validateSeatsAndBuildRankMap(
        seatIds: string[],
        courseId: string,
        sessionId: string,
        round: CounsellingRound,
        candidateCategory: CandidateCategory,
    ) {
        if (seatIds.length === 0) {
            return new Map<string, number>();
        }

        const uniqueSeatIds = Array.from(new Set(seatIds));
        const seats = await this.seatRepository.find({
            where: { id: In(uniqueSeatIds), isActive: true },
        });

        if (seats.length !== uniqueSeatIds.length) {
            throw new BadRequestException('One or more collegeSeatId values are invalid or inactive');
        }

        const invalidCourseSeat = seats.find((s) => s.courseId !== courseId);
        if (invalidCourseSeat) {
            throw new BadRequestException(
                'All selected college seats must match the choice list course',
            );
        }

        const closingRanks = await this.closingRankRepository.find({
            where: {
                collegeSeatId: In(uniqueSeatIds),
                sessionId,
                round,
                candidateCategory,
            },
        });

        return new Map(closingRanks.map((cr) => [cr.collegeSeatId, cr.closingRank]));
    }

    private async replaceItemsInTransaction(
        manager: EntityManager,
        choiceListId: string,
        rawItems: ChoiceListItemInputDto[],
        neetRank: number,
        rankMap: Map<string, number>,
    ) {
        await manager.delete(ChoiceListItem, { choiceListId });

        if (rawItems.length === 0) {
            return;
        }

        // Deduplicate by collegeSeatId preserving ordered sequence
        const seen = new Set<string>();
        const ordered = [...rawItems]
            .sort((a, b) => (a.priorityOrder ?? Number.MAX_SAFE_INTEGER) - (b.priorityOrder ?? Number.MAX_SAFE_INTEGER))
            .filter((item) => {
                if (seen.has(item.collegeSeatId)) return false;
                seen.add(item.collegeSeatId);
                return true;
            });

        const itemRepo = manager.getRepository(ChoiceListItem);
        const entities = ordered.map((item, idx) =>
            itemRepo.create({
                choiceListId,
                collegeSeatId: item.collegeSeatId,
                priorityOrder: idx + 1,
                chanceTag: computeChanceTag(neetRank, rankMap.get(item.collegeSeatId)),
                notes: item.notes?.trim() || null,
            }),
        );

        await itemRepo.save(entities);
    }

    private async loadDetailedChoiceList(id: string) {
        const list = await this.choiceListRepository.findOne({
            where: { id },
            relations: {
                course: true,
                session: true,
                counsellingType: true,
                items: {
                    collegeSeat: {
                        college: true,
                        course: true,
                        counsellingType: true,
                    },
                },
            },
        });

        if (!list) {
            throw new NotFoundException('Choice list not found');
        }

        const sortedItems = [...(list.items ?? [])].sort(
            (a, b) => a.priorityOrder - b.priorityOrder,
        );

        const seatIds = sortedItems.map((item) => item.collegeSeatId);
        const closingRanks = seatIds.length
            ? await this.closingRankRepository.find({
                  where: {
                      collegeSeatId: In(seatIds),
                      sessionId: list.sessionId,
                      round: list.round,
                      candidateCategory: list.candidateCategory,
                  },
              })
            : [];
        const rankMap = new Map(closingRanks.map((cr) => [cr.collegeSeatId, cr]));

        return {
            id: list.id,
            userId: list.userId,
            createdByAdvisorId: list.createdByAdvisorId,
            title: list.title,
            course: list.course?.name || '',
            session: list.session?.name || '',
            counsellingType: list.counsellingType?.name || null,
            round: list.round,
            neetRank: list.neetRank,
            candidateCategory: list.candidateCategory,
            domicileState: list.domicileState,
            maxAnnualBudget: list.maxAnnualBudget,
            status: list.status,
            version: list.version,
            lastSavedAt: list.lastSavedAt,
            createdAt: list.createdAt,
            updatedAt: list.updatedAt,
            items: sortedItems.map((item) => {
                const cutoff = rankMap.get(item.collegeSeatId);
                return {
                    id: item.id,
                    collegeSeatId: item.collegeSeatId,
                    priorityOrder: item.priorityOrder,
                    chanceTag: item.chanceTag,
                    notes: item.notes,
                    collegeId: item.collegeSeat.college.id,
                    collegeName: item.collegeSeat.college.name,
                    state: item.collegeSeat.college.state,
                    city: item.collegeSeat.college.city,
                    instituteType: item.collegeSeat.college.instituteType,
                    programName: item.collegeSeat.programName,
                    counsellingType: item.collegeSeat.counsellingType?.name || '',
                    quotaName: item.collegeSeat.quotaName,
                    annualTuitionFee: item.collegeSeat.annualTuitionFee,
                    bondYears: item.collegeSeat.bondYears,
                    stipendAmount: item.collegeSeat.stipendAmount,
                    openingRank: cutoff?.openingRank ?? null,
                    closingRank: cutoff?.closingRank ?? null,
                };
            }),
        };
    }

    async findAllForUser(userId: string) {
        const lists = await this.choiceListRepository.find({
            where: { userId },
            relations: {
                course: true,
                session: true,
                counsellingType: true,
                items: true,
            },
            order: { updatedAt: 'DESC' },
        });

        return {
            data: lists.map((list) => ({
                id: list.id,
                title: list.title,
                course: list.course?.name || '',
                session: list.session?.name || '',
                counsellingType: list.counsellingType?.name || null,
                round: list.round,
                neetRank: list.neetRank,
                candidateCategory: list.candidateCategory,
                domicileState: list.domicileState,
                maxAnnualBudget: list.maxAnnualBudget,
                status: list.status,
                version: list.version,
                itemCount: list.items?.length ?? 0,
                lastSavedAt: list.lastSavedAt,
                createdAt: list.createdAt,
                updatedAt: list.updatedAt,
            })),
        };
    }

    async create(
        userId: string,
        userRole: string | undefined,
        dto: CreateChoiceListDto,
        createdByAdvisorId: string | null = null,
        forcedStatus?: 'SAVED' | 'REVIEWED',
    ) {
        const { course, domicileState } = await this.resolveTargetUserAndCriteria(
            userId,
            userRole,
            dto.course,
            dto.domicileState,
        );

        const session = await this.sessionsService.findOrCreate(dto.session);
        const counsellingType = dto.counsellingType?.trim()
            ? await this.counsellingTypesService.findOrCreate(dto.counsellingType)
            : null;

        const round = dto.round ?? CounsellingRound.ROUND_1;
        const items = dto.items ?? [];
        const rankMap = await this.validateSeatsAndBuildRankMap(
            items.map((i) => i.collegeSeatId),
            course.id,
            session.id,
            round,
            dto.candidateCategory,
        );

        const hasItems = items.length > 0;
        const now = new Date();

        const createdId = await this.dataSource.transaction(async (manager) => {
            const listRepo = manager.getRepository(ChoiceList);
            const list = listRepo.create({
                userId,
                createdByAdvisorId,
                title: dto.title.trim(),
                courseId: course.id,
                sessionId: session.id,
                counsellingTypeId: counsellingType?.id ?? null,
                round,
                neetRank: dto.neetRank,
                candidateCategory: dto.candidateCategory,
                domicileState,
                maxAnnualBudget: dto.maxAnnualBudget ?? null,
                status: forcedStatus ?? (hasItems ? ChoiceListStatus.SAVED : ChoiceListStatus.DRAFT),
                version: 1,
                lastSavedAt: hasItems || forcedStatus ? now : null,
            });

            const savedList = await listRepo.save(list);
            if (hasItems) {
                await this.replaceItemsInTransaction(
                    manager,
                    savedList.id,
                    items,
                    dto.neetRank,
                    rankMap,
                );
            }

            return savedList.id;
        });

        return this.loadDetailedChoiceList(createdId);
    }

    async adminAssign(advisorId: string, dto: AdminAssignChoiceListDto) {
        return this.create(
            dto.userId,
            UserRole.ADMIN,
            dto,
            advisorId,
            dto.status ?? ChoiceListStatus.REVIEWED,
        );
    }

    async findOne(id: string, userId: string, userRole?: string) {
        await this.assertAccess(id, userId, userRole, false);
        return this.loadDetailedChoiceList(id);
    }

    /**
     * Explicit cross-device Save/Sync endpoint: updates metadata and replaces ordered items atomically.
     */
    async save(
        id: string,
        userId: string,
        userRole: string | undefined,
        dto: SaveChoiceListDto,
    ) {
        const list = await this.assertAccess(id, userId, userRole, true);

        if (typeof dto.version === 'number' && dto.version !== list.version) {
            throw new ConflictException(
                'Choice list was modified on another device. Refresh and try saving again.',
            );
        }

        const nextRank = dto.neetRank ?? list.neetRank;
        const nextCategory = dto.candidateCategory ?? list.candidateCategory;

        const rankMap = await this.validateSeatsAndBuildRankMap(
            dto.items.map((i) => i.collegeSeatId),
            list.courseId,
            list.sessionId,
            list.round,
            nextCategory,
        );

        await this.dataSource.transaction(async (manager) => {
            const listRepo = manager.getRepository(ChoiceList);
            await listRepo.update(
                { id: list.id },
                {
                    title: dto.title?.trim() ?? list.title,
                    neetRank: nextRank,
                    candidateCategory: nextCategory,
                    domicileState: dto.domicileState?.trim() ?? list.domicileState,
                    maxAnnualBudget:
                        dto.maxAnnualBudget !== undefined
                            ? dto.maxAnnualBudget
                            : list.maxAnnualBudget,
                    status: dto.status ?? ChoiceListStatus.SAVED,
                    lastSavedAt: new Date(),
                    version: list.version + 1,
                },
            );

            await this.replaceItemsInTransaction(
                manager,
                list.id,
                dto.items,
                nextRank,
                rankMap,
            );
        });

        return this.loadDetailedChoiceList(id);
    }

    async autoGenerate(
        userId: string,
        userRole: string | undefined,
        dto: AutoGenerateChoiceListDto,
    ) {
        const { course, domicileState } = await this.resolveTargetUserAndCriteria(
            userId,
            userRole,
            dto.course,
            dto.domicileState,
        );

        const session = await this.sessionsService.findOrCreate(dto.session);
        const counsellingType = dto.counsellingType?.trim()
            ? await this.counsellingTypesService.findOrCreate(dto.counsellingType)
            : null;

        const round = dto.round ?? CounsellingRound.ROUND_1;
        const safeLimit = Math.min(Math.max(Number(dto.limit) || 50, 1), 100);
        const minDreamRank = Math.max(1, Math.floor(dto.neetRank * 0.5));

        const qb = this.closingRankRepository
            .createQueryBuilder('cr')
            .innerJoinAndSelect('cr.collegeSeat', 'seat')
            .innerJoinAndSelect('seat.college', 'college')
            .innerJoinAndSelect('seat.counsellingType', 'counsellingType')
            .where('seat.courseId = :courseId', { courseId: course.id })
            .andWhere('seat.isActive = :seatActive', { seatActive: true })
            .andWhere('college.isActive = :collegeActive', { collegeActive: true })
            .andWhere('cr.sessionId = :sessionId', { sessionId: session.id })
            .andWhere('cr.round = :round', { round })
            .andWhere('cr.candidateCategory = :category', { category: dto.candidateCategory })
            .andWhere('cr.closingRank >= :minDreamRank', { minDreamRank })
            .orderBy('cr.closingRank', 'ASC');

        if (counsellingType) {
            qb.andWhere('seat.counsellingTypeId = :counsellingTypeId', {
                counsellingTypeId: counsellingType.id,
            });
        }

        const candidateCutoffs = await qb.getMany();
        const eligibleCutoffs = candidateCutoffs
            .filter((cr) =>
                isSeatEligibleForCriteria(
                    {
                        annualTuitionFee: cr.collegeSeat.annualTuitionFee,
                        isOpenState: cr.collegeSeat.isOpenState,
                        collegeState: cr.collegeSeat.college.state,
                        counsellingTypeSlug: cr.collegeSeat.counsellingType?.slug,
                        counsellingTypeName: cr.collegeSeat.counsellingType?.name,
                    },
                    {
                        domicileState,
                        maxAnnualBudget: dto.maxAnnualBudget,
                    },
                ),
            )
            .slice(0, safeLimit);

        const defaultTitle =
            dto.title?.trim() ||
            `${course.name} ${round.replace('_', ' ')} (${dto.candidateCategory})`;

        return this.create(userId, userRole, {
            title: defaultTitle,
            course: course.name,
            session: session.name,
            counsellingType: counsellingType?.name,
            round,
            neetRank: dto.neetRank,
            candidateCategory: dto.candidateCategory,
            domicileState,
            maxAnnualBudget: dto.maxAnnualBudget,
            items: eligibleCutoffs.map((cr, idx) => ({
                collegeSeatId: cr.collegeSeatId,
                priorityOrder: idx + 1,
            })),
        });
    }

    async addItems(
        id: string,
        userId: string,
        userRole: string | undefined,
        dto: AddChoiceListItemsDto,
    ) {
        const list = await this.assertAccess(id, userId, userRole, true);
        const existingItems = await this.itemRepository.find({
            where: { choiceListId: list.id },
            order: { priorityOrder: 'ASC' },
        });

        const existingSeatIds = new Set(existingItems.map((i) => i.collegeSeatId));
        const newItems = dto.items.filter((i) => !existingSeatIds.has(i.collegeSeatId));

        if (newItems.length === 0) {
            return this.loadDetailedChoiceList(id);
        }

        const rankMap = await this.validateSeatsAndBuildRankMap(
            newItems.map((i) => i.collegeSeatId),
            list.courseId,
            list.sessionId,
            list.round,
            list.candidateCategory,
        );

        await this.dataSource.transaction(async (manager) => {
            const itemRepo = manager.getRepository(ChoiceListItem);
            const startOrder = existingItems.length;
            const entities = newItems.map((item, idx) =>
                itemRepo.create({
                    choiceListId: list.id,
                    collegeSeatId: item.collegeSeatId,
                    priorityOrder: startOrder + idx + 1,
                    chanceTag: computeChanceTag(
                        list.neetRank,
                        rankMap.get(item.collegeSeatId),
                    ),
                    notes: item.notes?.trim() || null,
                }),
            );
            await itemRepo.save(entities);

            await manager.getRepository(ChoiceList).update(
                { id: list.id },
                {
                    status: ChoiceListStatus.SAVED,
                    lastSavedAt: new Date(),
                    version: list.version + 1,
                },
            );
        });

        return this.loadDetailedChoiceList(id);
    }

    async reorder(
        id: string,
        userId: string,
        userRole: string | undefined,
        dto: ReorderChoiceListDto,
    ) {
        const list = await this.assertAccess(id, userId, userRole, true);

        if (typeof dto.version === 'number' && dto.version !== list.version) {
            throw new ConflictException(
                'Choice list was modified on another device. Refresh and try reordering again.',
            );
        }

        const existingItems = await this.itemRepository.find({
            where: { choiceListId: list.id },
        });
        const existingMap = new Map(existingItems.map((item) => [item.id, item]));

        if (
            dto.orderedItemIds.length !== existingItems.length ||
            dto.orderedItemIds.some((itemId) => !existingMap.has(itemId))
        ) {
            throw new BadRequestException(
                'orderedItemIds must contain every item ID in the choice list exactly once',
            );
        }

        await this.dataSource.transaction(async (manager) => {
            const itemRepo = manager.getRepository(ChoiceListItem);
            for (let idx = 0; idx < dto.orderedItemIds.length; idx++) {
                await itemRepo.update(
                    { id: dto.orderedItemIds[idx], choiceListId: list.id },
                    { priorityOrder: idx + 1 },
                );
            }

            await manager.getRepository(ChoiceList).update(
                { id: list.id },
                {
                    status: ChoiceListStatus.SAVED,
                    lastSavedAt: new Date(),
                    version: list.version + 1,
                },
            );
        });

        return this.loadDetailedChoiceList(id);
    }

    async removeItem(
        id: string,
        itemId: string,
        userId: string,
        userRole?: string,
    ) {
        const list = await this.assertAccess(id, userId, userRole, true);
        const existingItems = await this.itemRepository.find({
            where: { choiceListId: list.id },
            order: { priorityOrder: 'ASC' },
        });

        const target = existingItems.find((item) => item.id === itemId);
        if (!target) {
            throw new NotFoundException('Choice list item not found');
        }

        const remaining = existingItems.filter((item) => item.id !== itemId);

        await this.dataSource.transaction(async (manager) => {
            const itemRepo = manager.getRepository(ChoiceListItem);
            await itemRepo.delete({ id: itemId, choiceListId: list.id });

            for (let idx = 0; idx < remaining.length; idx++) {
                await itemRepo.update(
                    { id: remaining[idx].id },
                    { priorityOrder: idx + 1 },
                );
            }

            await manager.getRepository(ChoiceList).update(
                { id: list.id },
                {
                    lastSavedAt: new Date(),
                    version: list.version + 1,
                },
            );
        });

        return this.loadDetailedChoiceList(id);
    }

    async duplicate(
        id: string,
        userId: string,
        userRole: string | undefined,
        dto: DuplicateChoiceListDto,
    ) {
        const source = await this.assertAccess(id, userId, userRole, false);
        const sourceItems = await this.itemRepository.find({
            where: { choiceListId: source.id },
            order: { priorityOrder: 'ASC' },
        });

        return this.create(source.userId, UserRole.ADMIN, {
            title: dto.title?.trim() || `${source.title} (Copy)`,
            course: source.course.name,
            session: dto.session?.trim() || source.session.name,
            counsellingType: source.counsellingType?.name,
            round: dto.round ?? source.round,
            neetRank: source.neetRank,
            candidateCategory: source.candidateCategory,
            domicileState: source.domicileState,
            maxAnnualBudget: source.maxAnnualBudget ?? undefined,
            items: sourceItems.map((item) => ({
                collegeSeatId: item.collegeSeatId,
                priorityOrder: item.priorityOrder,
                notes: item.notes ?? undefined,
            })),
        });
    }

    async exportExcel(id: string, userId: string, userRole?: string) {
        const detail = await this.findOne(id, userId, userRole);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Choice List');

        sheet.columns = [
            { header: 'Priority', key: 'priorityOrder', width: 10 },
            { header: 'College Name', key: 'collegeName', width: 42 },
            { header: 'State', key: 'state', width: 18 },
            { header: 'Institute Type', key: 'instituteType', width: 16 },
            { header: 'Program', key: 'programName', width: 22 },
            { header: 'Counselling Type', key: 'counsellingType', width: 22 },
            { header: 'Quota', key: 'quotaName', width: 18 },
            { header: 'Annual Fee', key: 'annualTuitionFee', width: 15 },
            { header: 'Bond (Years)', key: 'bondYears', width: 14 },
            { header: 'Closing Rank', key: 'closingRank', width: 14 },
            { header: 'Chance', key: 'chanceTag', width: 14 },
            { header: 'Notes', key: 'notes', width: 30 },
        ];

        for (const item of detail.items) {
            sheet.addRow({
                priorityOrder: item.priorityOrder,
                collegeName: item.collegeName,
                state: item.state,
                instituteType: item.instituteType,
                programName: item.programName,
                counsellingType: item.counsellingType,
                quotaName: item.quotaName,
                annualTuitionFee: item.annualTuitionFee,
                bondYears: item.bondYears,
                closingRank: item.closingRank ?? '-',
                chanceTag: item.chanceTag,
                notes: item.notes ?? '',
            });
        }

        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
        const safeFileName = detail.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'choice-list';

        return {
            fileName: `${safeFileName}.xlsx`,
            buffer,
        };
    }
}
