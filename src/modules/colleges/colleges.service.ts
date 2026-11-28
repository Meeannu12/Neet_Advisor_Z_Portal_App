import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { College } from './entities/college.entity.js';
import { CollegeSeat } from './entities/college-seat.entity.js';
import { ClosingRank } from './entities/closing-rank.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CoursesService } from '../courses/courses.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { CounsellingTypesService } from '../counselling-types/counselling-types.service.js';
import {
    CreateCollegeDto,
    CreateCollegeSeatDto,
    UpsertClosingRankDto,
} from './dto/create-college.dto.js';
import {
    BaseCollegeFilterDto,
    QueryCollegesDto,
    QueryCutoffsDto,
} from './dto/query-colleges.dto.js';
import { UserRole } from '../../common/constants/roles.constant.js';
import {
    CandidateCategory,
    CounsellingRound,
    InstituteType,
} from './constants/counselling.constants.js';
import { parseCollegeImportFile } from './utils/college-import-parser.util.js';

export interface CollegeImportResult {
    totalRows: number;
    processed: number;
    skipped: number;
    errors: { row: number; reason: string }[];
}

@Injectable()
export class CollegesService {
    constructor(
        @InjectRepository(College)
        private readonly collegeRepository: Repository<College>,
        @InjectRepository(CollegeSeat)
        private readonly seatRepository: Repository<CollegeSeat>,
        @InjectRepository(ClosingRank)
        private readonly closingRankRepository: Repository<ClosingRank>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly coursesService: CoursesService,
        private readonly sessionsService: SessionsService,
        private readonly counsellingTypesService: CounsellingTypesService,
    ) {}

    private generateSlug(name: string, state: string): string {
        return `${name}-${state}`
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    private async resolveScopedCourse(
        queryCourse?: string,
        userId?: string,
        userRole?: string,
    ): Promise<string | undefined> {
        if (userId && userRole !== UserRole.ADMIN) {
            const user = await this.userRepository.findOne({
                where: { id: userId },
                relations: { course: true },
            });
            return user?.course?.name?.trim() || undefined;
        }

        return queryCourse?.trim() || undefined;
    }

    private applySeatFilters<T extends CollegeSeat | ClosingRank>(
        qb: SelectQueryBuilder<T>,
        query: BaseCollegeFilterDto,
        scopedCourse?: string,
    ): SelectQueryBuilder<T> {
        qb.andWhere('college.isActive = :collegeActive', { collegeActive: true })
            .andWhere('seat.isActive = :seatActive', { seatActive: true });

        if (scopedCourse) {
            qb.andWhere('UPPER(course.name) = UPPER(:scopedCourse)', { scopedCourse });
        }

        if (query.state?.trim()) {
            qb.andWhere('LOWER(college.state) = LOWER(:state)', {
                state: query.state.trim(),
            });
        }

        if (query.instituteType) {
            qb.andWhere('college.instituteType = :instituteType', {
                instituteType: query.instituteType,
            });
        }

        if (query.counsellingType?.trim()) {
            qb.andWhere(
                '(counsellingType.slug = :counsellingType OR LOWER(counsellingType.name) = LOWER(:counsellingType))',
                { counsellingType: query.counsellingType.trim() },
            );
        }

        if (query.programName?.trim()) {
            qb.andWhere('seat.programName ILIKE :programName', {
                programName: `%${query.programName.trim()}%`,
            });
        }

        if (typeof query.maxFee === 'number') {
            qb.andWhere('seat.annualTuitionFee <= :maxFee', { maxFee: query.maxFee });
        }

        if (typeof query.isOpenState === 'boolean') {
            qb.andWhere('seat.isOpenState = :isOpenState', { isOpenState: query.isOpenState });
        }

        if (query.search?.trim()) {
            qb.andWhere(
                '(college.name ILIKE :search OR college.city ILIKE :search OR college.state ILIKE :search OR seat.programName ILIKE :search)',
                { search: `%${query.search.trim()}%` },
            );
        }

        return qb;
    }

    async createCollege(dto: CreateCollegeDto): Promise<College> {
        const slug = this.generateSlug(dto.name, dto.state);
        const existing = await this.collegeRepository.findOne({ where: { slug } });
        if (existing) {
            existing.shortName = dto.shortName?.trim() ?? existing.shortName;
            existing.city = dto.city?.trim() ?? existing.city;
            existing.instituteType = dto.instituteType;
            existing.establishedYear = dto.establishedYear ?? existing.establishedYear;
            existing.bedsCount = dto.bedsCount ?? existing.bedsCount;
            existing.universityName = dto.universityName?.trim() ?? existing.universityName;
            existing.website = dto.website?.trim() ?? existing.website;
            return this.collegeRepository.save(existing);
        }

        const college = this.collegeRepository.create({
            name: dto.name.trim(),
            shortName: dto.shortName?.trim() || null,
            slug,
            state: dto.state.trim(),
            city: dto.city?.trim() || null,
            instituteType: dto.instituteType,
            establishedYear: dto.establishedYear ?? null,
            bedsCount: dto.bedsCount ?? null,
            universityName: dto.universityName?.trim() || null,
            website: dto.website?.trim() || null,
            isActive: true,
        });

        return this.collegeRepository.save(college);
    }

    async createSeat(collegeId: string, dto: CreateCollegeSeatDto): Promise<CollegeSeat> {
        const college = await this.collegeRepository.findOne({ where: { id: collegeId } });
        if (!college) {
            throw new NotFoundException('College not found');
        }

        const [course, counsellingType] = await Promise.all([
            this.coursesService.findOrCreate(dto.course),
            this.counsellingTypesService.findOrCreate(dto.counsellingType),
        ]);

        const programName = dto.programName.trim();
        const quotaName = dto.quotaName.trim();

        const existing = await this.seatRepository.findOne({
            where: {
                collegeId: college.id,
                courseId: course.id,
                programName,
                counsellingTypeId: counsellingType.id,
                quotaName,
            },
        });

        if (existing) {
            existing.annualTuitionFee = dto.annualTuitionFee;
            existing.hostelFee = dto.hostelFee ?? existing.hostelFee;
            existing.totalSeats = dto.totalSeats ?? existing.totalSeats;
            existing.bondYears = dto.bondYears ?? existing.bondYears;
            existing.bondPenalty = dto.bondPenalty ?? existing.bondPenalty;
            existing.stipendAmount = dto.stipendAmount ?? existing.stipendAmount;
            existing.isOpenState = dto.isOpenState ?? existing.isOpenState;
            return this.seatRepository.save(existing);
        }

        const seat = this.seatRepository.create({
            collegeId: college.id,
            courseId: course.id,
            programName,
            counsellingTypeId: counsellingType.id,
            quotaName,
            annualTuitionFee: dto.annualTuitionFee,
            hostelFee: dto.hostelFee ?? null,
            totalSeats: dto.totalSeats ?? null,
            bondYears: dto.bondYears ?? 0,
            bondPenalty: dto.bondPenalty ?? null,
            stipendAmount: dto.stipendAmount ?? null,
            isOpenState: dto.isOpenState ?? false,
            isActive: true,
        });

        return this.seatRepository.save(seat);
    }

    async upsertClosingRank(seatId: string, dto: UpsertClosingRankDto): Promise<ClosingRank> {
        const seat = await this.seatRepository.findOne({ where: { id: seatId } });
        if (!seat) {
            throw new NotFoundException('College seat not found');
        }

        const session = await this.sessionsService.findOrCreate(dto.session);

        const existing = await this.closingRankRepository.findOne({
            where: {
                collegeSeatId: seat.id,
                sessionId: session.id,
                round: dto.round,
                candidateCategory: dto.candidateCategory,
            },
        });

        if (existing) {
            existing.openingRank = dto.openingRank ?? existing.openingRank;
            existing.closingRank = dto.closingRank;
            existing.closingScore = dto.closingScore ?? existing.closingScore;
            return this.closingRankRepository.save(existing);
        }

        const record = this.closingRankRepository.create({
            collegeSeatId: seat.id,
            sessionId: session.id,
            round: dto.round,
            candidateCategory: dto.candidateCategory,
            openingRank: dto.openingRank ?? null,
            closingRank: dto.closingRank,
            closingScore: dto.closingScore ?? null,
        });

        return this.closingRankRepository.save(record);
    }

    async findColleges(query: QueryCollegesDto, userId?: string, userRole?: string) {
        const safeLimit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
        const safePage = Math.max(Number(query.page) || 1, 1);
        const skip = (safePage - 1) * safeLimit;
        const scopedCourse = await this.resolveScopedCourse(query.course, userId, userRole);

        const qb = this.seatRepository
            .createQueryBuilder('seat')
            .innerJoinAndSelect('seat.college', 'college')
            .innerJoinAndSelect('seat.course', 'course')
            .innerJoinAndSelect('seat.counsellingType', 'counsellingType');

        this.applySeatFilters(qb, query, scopedCourse);

        qb.orderBy('college.name', 'ASC')
            .addOrderBy('seat.annualTuitionFee', 'ASC')
            .skip(skip)
            .take(safeLimit);

        const [seats, total] = await qb.getManyAndCount();

        return {
            data: seats.map((seat) => ({
                collegeSeatId: seat.id,
                collegeId: seat.college.id,
                collegeName: seat.college.name,
                shortName: seat.college.shortName,
                state: seat.college.state,
                city: seat.college.city,
                instituteType: seat.college.instituteType,
                course: seat.course?.name || '',
                programName: seat.programName,
                counsellingType: seat.counsellingType?.name || '',
                quotaName: seat.quotaName,
                annualTuitionFee: seat.annualTuitionFee,
                hostelFee: seat.hostelFee,
                totalSeats: seat.totalSeats,
                bondYears: seat.bondYears,
                bondPenalty: seat.bondPenalty,
                stipendAmount: seat.stipendAmount,
                isOpenState: seat.isOpenState,
            })),
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit),
        };
    }

    async findCollegeById(id: string) {
        const college = await this.collegeRepository.findOne({
            where: { id, isActive: true },
            relations: {
                seats: {
                    course: true,
                    counsellingType: true,
                    closingRanks: {
                        session: true,
                    },
                },
            },
        });

        if (!college) {
            throw new NotFoundException('College not found');
        }

        return {
            id: college.id,
            name: college.name,
            shortName: college.shortName,
            slug: college.slug,
            state: college.state,
            city: college.city,
            instituteType: college.instituteType,
            establishedYear: college.establishedYear,
            bedsCount: college.bedsCount,
            universityName: college.universityName,
            website: college.website,
            seats: (college.seats ?? [])
                .filter((s) => s.isActive)
                .map((seat) => ({
                    id: seat.id,
                    course: seat.course?.name || '',
                    programName: seat.programName,
                    counsellingType: seat.counsellingType?.name || '',
                    quotaName: seat.quotaName,
                    annualTuitionFee: seat.annualTuitionFee,
                    hostelFee: seat.hostelFee,
                    totalSeats: seat.totalSeats,
                    bondYears: seat.bondYears,
                    bondPenalty: seat.bondPenalty,
                    stipendAmount: seat.stipendAmount,
                    isOpenState: seat.isOpenState,
                    closingRanks: (seat.closingRanks ?? []).map((cr) => ({
                        id: cr.id,
                        session: cr.session?.name || '',
                        round: cr.round,
                        candidateCategory: cr.candidateCategory,
                        openingRank: cr.openingRank,
                        closingRank: cr.closingRank,
                        closingScore: cr.closingScore,
                    })),
                })),
        };
    }

    async findCutoffs(query: QueryCutoffsDto, userId?: string, userRole?: string) {
        const safeLimit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
        const safePage = Math.max(Number(query.page) || 1, 1);
        const skip = (safePage - 1) * safeLimit;
        const scopedCourse = await this.resolveScopedCourse(query.course, userId, userRole);

        const qb = this.closingRankRepository
            .createQueryBuilder('cr')
            .innerJoinAndSelect('cr.session', 'session')
            .innerJoinAndSelect('cr.collegeSeat', 'seat')
            .innerJoinAndSelect('seat.college', 'college')
            .innerJoinAndSelect('seat.course', 'course')
            .innerJoinAndSelect('seat.counsellingType', 'counsellingType');

        this.applySeatFilters(qb, query, scopedCourse);

        if (query.session?.trim()) {
            qb.andWhere('LOWER(session.name) = LOWER(:session)', {
                session: query.session.trim(),
            });
        }

        if (query.round) {
            qb.andWhere('cr.round = :round', { round: query.round });
        }

        if (query.candidateCategory) {
            qb.andWhere('cr.candidateCategory = :candidateCategory', {
                candidateCategory: query.candidateCategory,
            });
        }

        if (typeof query.userRank === 'number') {
            const minScan = Math.max(1, Math.floor(query.userRank * 0.5));
            const maxScan = Math.ceil(query.userRank * 1.5);
            qb.andWhere('cr.closingRank BETWEEN :minScan AND :maxScan', { minScan, maxScan });
        } else {
            if (typeof query.minRank === 'number') {
                qb.andWhere('cr.closingRank >= :minRank', { minRank: query.minRank });
            }
            if (typeof query.maxRank === 'number') {
                qb.andWhere('cr.closingRank <= :maxRank', { maxRank: query.maxRank });
            }
        }

        qb.orderBy('cr.closingRank', 'ASC')
            .skip(skip)
            .take(safeLimit);

        const [records, total] = await qb.getManyAndCount();

        return {
            data: records.map((cr) => ({
                id: cr.id,
                collegeSeatId: cr.collegeSeat.id,
                collegeId: cr.collegeSeat.college.id,
                collegeName: cr.collegeSeat.college.name,
                state: cr.collegeSeat.college.state,
                instituteType: cr.collegeSeat.college.instituteType,
                course: cr.collegeSeat.course?.name || '',
                programName: cr.collegeSeat.programName,
                counsellingType: cr.collegeSeat.counsellingType?.name || '',
                quotaName: cr.collegeSeat.quotaName,
                annualTuitionFee: cr.collegeSeat.annualTuitionFee,
                bondYears: cr.collegeSeat.bondYears,
                stipendAmount: cr.collegeSeat.stipendAmount,
                isOpenState: cr.collegeSeat.isOpenState,
                session: cr.session?.name || '',
                round: cr.round,
                candidateCategory: cr.candidateCategory,
                openingRank: cr.openingRank,
                closingRank: cr.closingRank,
                closingScore: cr.closingScore,
            })),
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit),
        };
    }

    async importColleges(buffer: Buffer, originalName: string): Promise<CollegeImportResult> {
        const parsedRows = await parseCollegeImportFile(buffer, originalName);
        const result: CollegeImportResult = {
            totalRows: parsedRows.length,
            processed: 0,
            skipped: 0,
            errors: [],
        };

        const validInstituteTypes = new Set<string>(Object.values(InstituteType));
        const validRounds = new Set<string>(Object.values(CounsellingRound));
        const validCategories = new Set<string>(Object.values(CandidateCategory));

        for (const row of parsedRows) {
            const d = row.data;
            const addError = (reason: string) => {
                result.skipped++;
                result.errors.push({ row: row.rowNumber, reason });
            };

            const instituteType = d.institutetype?.toUpperCase();
            if (!instituteType || !validInstituteTypes.has(instituteType)) {
                addError(`Invalid instituteType "${d.institutetype}"`);
                continue;
            }

            const annualTuitionFee = Number(d.annualtuitionfee);
            if (!Number.isFinite(annualTuitionFee) || annualTuitionFee < 0) {
                addError('Invalid annualTuitionFee');
                continue;
            }

            try {
                const college = await this.createCollege({
                    name: d.collegename,
                    shortName: d.shortname || undefined,
                    state: d.state,
                    city: d.city || undefined,
                    instituteType: instituteType as InstituteType,
                    establishedYear: d.establishedyear ? Number(d.establishedyear) : undefined,
                    bedsCount: d.bedscount ? Number(d.bedscount) : undefined,
                    universityName: d.universityname || undefined,
                    website: d.website || undefined,
                });

                const seat = await this.createSeat(college.id, {
                    course: d.course,
                    programName: d.programname,
                    counsellingType: d.counsellingtype,
                    quotaName: d.quotaname,
                    annualTuitionFee,
                    hostelFee: d.hostelfee ? Number(d.hostelfee) : undefined,
                    totalSeats: d.totalseats ? Number(d.totalseats) : undefined,
                    bondYears: d.bondyears ? Number(d.bondyears) : 0,
                    bondPenalty: d.bondpenalty || undefined,
                    stipendAmount: d.stipendamount ? Number(d.stipendamount) : undefined,
                    isOpenState: d.isopenstate?.toLowerCase() === 'true',
                });

                if (d.session && d.round && d.candidatecategory && d.closingrank) {
                    const round = d.round.toUpperCase();
                    const category = d.candidatecategory.toUpperCase();
                    const closingRank = Number(d.closingrank);

                    if (!validRounds.has(round) || !validCategories.has(category) || !Number.isFinite(closingRank)) {
                        addError('Invalid cutoff session/round/category/closingRank');
                        continue;
                    }

                    await this.upsertClosingRank(seat.id, {
                        session: d.session,
                        round: round as CounsellingRound,
                        candidateCategory: category as CandidateCategory,
                        openingRank: d.openingrank ? Number(d.openingrank) : undefined,
                        closingRank,
                        closingScore: d.closingscore ? Number(d.closingscore) : undefined,
                    });
                }

                result.processed++;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to process row';
                addError(message);
            }
        }

        return result;
    }
}
