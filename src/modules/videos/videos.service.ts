import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { randomUUID } from 'crypto';

import { Video } from './entities/video.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { QueryVideosDto } from './dto/query-videos.dto.js';
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
     * Creates a new video record with dynamic relational resolution
     */
    async create(dto: CreateVideoDto): Promise<VideoResponse> {
        // Dynamic relational resolution: find existing or automatically create missing lookup records
        const [course, language, session, category] = await Promise.all([
            this.coursesService.findOrCreate(dto.course),
            this.languagesService.findOrCreate(dto.language),
            this.sessionsService.findOrCreate(dto.session),
            this.categoriesService.findOrCreate(dto.category),
        ]);

        let counsellingTypeId: string | null = null;
        if (dto.counsellingType && dto.counsellingType.trim()) {
            const counsellingType = await this.counsellingTypesService.findOrCreate(dto.counsellingType);
            counsellingTypeId = counsellingType.id;
        }

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
            counsellingTypeId,
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

        const qb: SelectQueryBuilder<Video> = this.videoRepository
            .createQueryBuilder('video')
            .leftJoinAndSelect('video.course', 'course')
            .leftJoinAndSelect('video.language', 'language')
            .leftJoinAndSelect('video.session', 'session')
            .leftJoinAndSelect('video.category', 'category')
            .leftJoinAndSelect('video.counsellingType', 'counsellingType');

        // Course filter: Regular users are automatically scoped to their assigned course (UG/PG)
        if (userId && userRole !== UserRole.ADMIN) {
            const user = await this.userRepository.findOne({
                where: { id: userId },
                relations: { course: true },
            });

            if (user?.course?.name) {
                qb.andWhere('UPPER(course.name) = UPPER(:userCourse)', {
                    userCourse: user.course.name.trim(),
                });
            }
        } else if (query.course && query.course.trim()) {
            // Admin can optionally filter by course via query param
            qb.andWhere('UPPER(course.name) = UPPER(:course)', {
                course: query.course.trim(),
            });
        }

        // Optional query filters (applied only if provided)
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

        qb.orderBy('video.createdAt', 'DESC')
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
