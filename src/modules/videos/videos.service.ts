import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { randomUUID } from 'crypto';

import { Video } from './entities/video.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { BaseVideoQueryDto, QueryVideosDto, QueryVideoSectionsDto } from './dto/query-videos.dto.js';
import { UploadUrlDto } from './dto/upload-url.dto.js';
import { UserRole } from '../../common/constants/roles.constant.js';

import { CoursesService } from '../courses/courses.service.js';
import { LanguagesService } from '../languages/languages.service.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { CounsellingTypesService } from '../counselling-types/counselling-types.service.js';
import { StorageService, PresignedUrlResult } from '../storage/storage.service.js';

export interface VideoResponse {
    id: string;
    title: string;
    description: string | null;
    isPremium: boolean;
    thumbnailUrl: string;
    videoUrl: string;
    duration: number;
    course: string;
    language: string;
    session: string;
    category: string;
    counsellingType: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface VideoFilterOptions {
    courses: string[];
    sessions: string[];
    categories: { name: string; slug: string }[];
    languages: string[];
    counsellingTypes: { name: string; slug: string }[];
}

export interface VideoSectionItem {
    id: string;
    title: string;
    isPremium: boolean;
    thumbnailUrl: string;
    duration: number;
    durationFormatted: string;
    course: string;
    language: string;
    session: string;
    category: string;
    counsellingType: string | null;
    createdAt: Date;
}

export interface VideoSectionsResponse {
    data: Record<string, VideoSectionItem[]>;
}

@Injectable()
export class VideosService {
    constructor(
        @InjectRepository(Video)
        private readonly videoRepository: Repository<Video>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly coursesService: CoursesService,
        private readonly languagesService: LanguagesService,
        private readonly sessionsService: SessionsService,
        private readonly categoriesService: CategoriesService,
        private readonly counsellingTypesService: CounsellingTypesService,
        private readonly storageService: StorageService,
    ) { }

    /**
     * Formats duration in seconds into HH:MM:SS string
     */
    private formatDuration(totalSeconds: number): string {
        const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
        const hours = Math.floor(safeSeconds / 3600);
        const minutes = Math.floor((safeSeconds % 3600) / 60);
        const seconds = safeSeconds % 60;
        return [hours, minutes, seconds]
            .map((unit) => String(unit).padStart(2, '0'))
            .join(':');
    }

    /**
     * Formats video entity into clean flat JSON without foreign keys or nested objects
     */
    private formatVideoResponse(video: Video): VideoResponse {
        return {
            id: video.id,
            title: video.title,
            description: video.description,
            isPremium: video.isPremium,
            thumbnailUrl: video.thumbnailUrl,
            videoUrl: video.videoUrl,
            duration: video.duration,
            course: video.course?.name || '',
            language: video.language?.name || '',
            session: video.session?.name || '',
            category: video.category?.name || '',
            counsellingType: video.counsellingType?.name || null,
            createdAt: video.createdAt,
            updatedAt: video.updatedAt,
        };
    }

    /**
     * Formats video entity into lightweight card item for sectioned/carousel views
     */
    private formatVideoSectionItem(video: Video): VideoSectionItem {
        return {
            id: video.id,
            title: video.title,
            isPremium: video.isPremium,
            thumbnailUrl: video.thumbnailUrl,
            duration: video.duration,
            durationFormatted: this.formatDuration(video.duration),
            course: video.course?.name || '',
            language: video.language?.name || '',
            session: video.session?.name || '',
            category: video.category?.name || '',
            counsellingType: video.counsellingType?.name || null,
            createdAt: video.createdAt,
        };
    }

    /**
     * Resolves course scoping: regular users are locked to their assigned course; admins can pass optional ?course=
     */
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

    /**
     * Creates base query builder with optional relation selects
     */
    private createBaseVideoQueryBuilder(selectRelations: boolean): SelectQueryBuilder<Video> {
        const qb = this.videoRepository.createQueryBuilder('video');
        const joinFn = selectRelations ? 'leftJoinAndSelect' : 'leftJoin';

        return qb[joinFn]('video.course', 'course')
            [joinFn]('video.language', 'language')
            [joinFn]('video.session', 'session')
            [joinFn]('video.category', 'category')
            [joinFn]('video.counsellingType', 'counsellingType');
    }

    /**
     * Applies common course and catalog filters to a video query builder
     */
    private applyVideoFilters(
        qb: SelectQueryBuilder<Video>,
        query: BaseVideoQueryDto,
        scopedCourse?: string,
    ): SelectQueryBuilder<Video> {
        if (scopedCourse) {
            qb.andWhere('UPPER(course.name) = UPPER(:scopedCourse)', {
                scopedCourse,
            });
        }

        if (query.session && query.session.trim()) {
            qb.andWhere('LOWER(session.name) = LOWER(:session)', {
                session: query.session.trim(),
            });
        }

        if (query.category && query.category.trim()) {
            qb.andWhere('(category.slug = :category OR LOWER(category.name) = LOWER(:category))', {
                category: query.category.trim(),
            });
        }

        if (query.language && query.language.trim()) {
            qb.andWhere('LOWER(language.name) = LOWER(:language)', {
                language: query.language.trim(),
            });
        }

        if (query.counsellingType && query.counsellingType.trim()) {
            qb.andWhere('(counsellingType.slug = :counsellingType OR LOWER(counsellingType.name) = LOWER(:counsellingType))', {
                counsellingType: query.counsellingType.trim(),
            });
        }

        if (typeof query.isPremium === 'boolean') {
            qb.andWhere('video.isPremium = :isPremium', { isPremium: query.isPremium });
        }

        if (query.search && query.search.trim()) {
            qb.andWhere('(video.title ILIKE :search OR video.description ILIKE :search)', {
                search: `%${query.search.trim()}%`,
            });
        }

        return qb;
    }

    /**
     * Generates a Cloudflare R2 Presigned PUT URL for direct client-to-R2 upload
     */
    getUploadUrl(dto: UploadUrlDto): PresignedUrlResult {
        const timestamp = Date.now();
        const uuid = randomUUID();
        const cleanName = dto.fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const folder = dto.type === 'video' ? 'videos' : 'thumbnails';
        const fileKey = `${folder}/${timestamp}-${uuid}-${cleanName}`;

        return this.storageService.generatePresignedUploadUrl(fileKey, dto.contentType, 900);
    }

    /**
     * Creates a new video record after validating that all required reference entities exist
     */
    async create(dto: CreateVideoDto): Promise<VideoResponse> {
        const results = await Promise.allSettled([
            this.coursesService.findExistingOrThrow(dto.course),
            this.languagesService.findExistingOrThrow(dto.language),
            this.sessionsService.findExistingOrThrow(dto.session),
            this.categoriesService.findExistingOrThrow(dto.category),
            this.counsellingTypesService.findExistingOrThrow(dto.counsellingType),
        ]);

        const errors = results
            .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
            .map((r) => (r.reason instanceof Error ? r.reason.message : 'Invalid reference field'));

        if (errors.length > 0) {
            throw new BadRequestException(errors.length === 1 ? errors[0] : errors.join('; '));
        }

        const [course, language, session, category, counsellingType] = results.map(
            (r) => (r as PromiseFulfilledResult<{ id: string }>).value,
        );

        const video = this.videoRepository.create({
            title: dto.title.trim(),
            description: dto.description?.trim() || null,
            isPremium: dto.isPremium ?? false,
            thumbnailUrl: dto.thumbnailUrl.trim(),
            videoUrl: dto.videoUrl.trim(),
            duration: dto.duration,
            courseId: course.id,
            languageId: language.id,
            sessionId: session.id,
            categoryId: category.id,
            counsellingTypeId: counsellingType.id,
        });

        const saved = await this.videoRepository.save(video);

        const full = await this.videoRepository.findOneOrFail({
            where: { id: saved.id },
            relations: {
                course: true,
                language: true,
                session: true,
                category: true,
                counsellingType: true,
            },
        });

        return this.formatVideoResponse(full);
    }

    /**
     * Lists videos with search, optional query filters, and automatic course scoping based on the authenticated user's token
     */
    async findAll(
        query: QueryVideosDto,
        userId?: string,
        userRole?: string,
    ): Promise<{
        data: VideoResponse[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const safeLimit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
        const safePage = Math.max(Number(query.page) || 1, 1);
        const skip = (safePage - 1) * safeLimit;
        const scopedCourse = await this.resolveScopedCourse(query.course, userId, userRole);

        const qb = this.applyVideoFilters(
            this.createBaseVideoQueryBuilder(true),
            query,
            scopedCourse,
        )
            .orderBy('video.createdAt', 'DESC')
            .skip(skip)
            .take(safeLimit);

        const [videos, total] = await qb.getManyAndCount();

        return {
            data: videos.map((v) => this.formatVideoResponse(v)),
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit),
        };
    }

    /**
     * Lists videos grouped under "Latest" and each active category (capped per section)
     */
    async findSections(
        query: QueryVideoSectionsDto,
        userId?: string,
        userRole?: string,
    ): Promise<VideoSectionsResponse> {
        const safeLimit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
        const scopedCourse = await this.resolveScopedCourse(query.course, userId, userRole);

        // 1. Latest videos across all matching categories
        const latestVideos = await this.applyVideoFilters(
            this.createBaseVideoQueryBuilder(true),
            query,
            scopedCourse,
        )
            .orderBy('video.createdAt', 'DESC')
            .take(safeLimit)
            .getMany();

        // 2. Top N videos per active category using SQL window function
        const rankedQb = this.applyVideoFilters(
            this.createBaseVideoQueryBuilder(false),
            query,
            scopedCourse,
        )
            .andWhere('category.isActive = :isActive', { isActive: true })
            .select('video.id', 'id')
            .addSelect(
                'ROW_NUMBER() OVER (PARTITION BY video."categoryId" ORDER BY video."createdAt" DESC)',
                'rn',
            );

        const [rankedSql, rankedParams] = rankedQb.getQueryAndParameters();
        const rankedRows: { id: string }[] = await this.videoRepository.query(
            `SELECT id FROM (${rankedSql}) ranked WHERE ranked.rn <= $${rankedParams.length + 1}`,
            [...rankedParams, safeLimit],
        );

        const categorizedIds = rankedRows.map((row) => row.id);
        const categorizedVideos = categorizedIds.length
            ? await this.videoRepository.find({
                  where: { id: In(categorizedIds) },
                  relations: {
                      course: true,
                      language: true,
                      session: true,
                      category: true,
                      counsellingType: true,
                  },
                  order: { createdAt: 'DESC' },
              })
            : [];

        const data: Record<string, VideoSectionItem[]> = {
            Latest: latestVideos.map((v) => this.formatVideoSectionItem(v)),
        };

        for (const video of categorizedVideos) {
            const categoryName = video.category?.name;
            if (!categoryName) continue;
            if (!data[categoryName]) {
                data[categoryName] = [];
            }
            data[categoryName].push(this.formatVideoSectionItem(video));
        }

        return { data };
    }

    /**
     * Retrieves all available filter options across lookup tables
     */
    async getFilterOptions(): Promise<VideoFilterOptions> {
        const [courses, sessions, categories, languages, counsellingTypes] = await Promise.all([
            this.coursesService.findAll(),
            this.sessionsService.findAll(),
            this.categoriesService.findAll(),
            this.languagesService.findAll(),
            this.counsellingTypesService.findAll(),
        ]);

        return {
            courses: courses.filter((c) => c.isActive).map((c) => c.name),
            sessions: sessions.map((s) => s.name),
            categories: categories.map((c) => ({ name: c.name, slug: c.slug })),
            languages: languages.map((l) => l.name),
            counsellingTypes: counsellingTypes.map((ct) => ({ name: ct.name, slug: ct.slug })),
        };
    }

    /**
     * Retrieves single video details by ID
     */
    async findOne(id: string): Promise<VideoResponse> {
        const video = await this.videoRepository.findOne({
            where: { id },
            relations: {
                course: true,
                language: true,
                session: true,
                category: true,
                counsellingType: true,
            },
        });

        if (!video) {
            throw new NotFoundException('Video not found');
        }

        return this.formatVideoResponse(video);
    }

    /**
     * Deletes a video record and its associated files from Cloudflare R2 bucket
     */
    async remove(id: string): Promise<{ success: boolean; message: string }> {
        const video = await this.videoRepository.findOne({
            where: { id },
        });

        if (!video) {
            throw new NotFoundException('Video not found');
        }

        // Helper to extract S3 object key from URL
        const extractKey = (url: string): string | null => {
            try {
                const parsed = new URL(url);
                return parsed.pathname.replace(/^\/+/, '');
            } catch {
                return null;
            }
        };

        const videoKey = extractKey(video.videoUrl);
        const thumbKey = extractKey(video.thumbnailUrl);

        if (videoKey) await this.storageService.deleteFile(videoKey);
        if (thumbKey) await this.storageService.deleteFile(thumbKey);

        await this.videoRepository.remove(video);

        return {
            success: true,
            message: 'Video and associated files deleted successfully',
        };
    }
}
