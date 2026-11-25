import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto.js';
import { CoursesService } from '../courses/courses.service.js';

export interface UserResponse {
    id: string;
    number: string;
    role: string;
    name: string;
    email: string | null;
    state: string;
    isActive: boolean;
    course: string | null;
    createdAt: Date;
    updatedAt: Date;
}

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly coursesService: CoursesService,
    ) { }

    /**
     * Formats user entity for API response:
     * Returns a flat object with `course: "PG"` string instead of nested objects or foreign keys.
     */
    private formatUserResponse(user: User): UserResponse {
        return {
            id: user.id,
            number: user.number,
            role: user.role,
            name: user.name,
            email: user.email,
            state: user.state,
            isActive: user.isActive,
            course: user.course ? user.course.name : null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    async create(dto: CreateUserDto): Promise<UserResponse> {
        const existingUser = await this.userRepository.findOne({
            where: { number: dto.number }
        });

        if (existingUser) {
            throw new ConflictException('Mobile number already registered');
        }

        // Dynamic Course resolution: Find existing course or create a new one dynamically
        let courseId: string | null = null;
        if (dto.course && dto.course.trim()) {
            const course = await this.coursesService.findOrCreate(dto.course);
            courseId = course.id;
        }

        const user = this.userRepository.create({
            number: dto.number,
            name: dto.name,
            role: dto.role,
            state: dto.state,
            email: dto.email ?? null,
            courseId,
            isActive: true,
        });

        const savedUser = await this.userRepository.save(user);

        // Fetch user with course relation to format response
        const fullUser = await this.userRepository.findOneOrFail({
            where: { id: savedUser.id },
            relations: { course: true },
        });

        return this.formatUserResponse(fullUser);
    }

    // Performance: Paginated query with course relation and clean flat formatting
    async findAll(page: number = 1, limit: number = 20): Promise<{
        data: UserResponse[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const safePage = Math.max(Number(page) || 1, 1);
        const skip = (safePage - 1) * safeLimit;

        const [data, total] = await this.userRepository.findAndCount({
            skip,
            take: safeLimit,
            relations: { course: true },
            order: { createdAt: 'DESC' },
        });

        return {
            data: data.map((user) => this.formatUserResponse(user)),
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit),
        };
    }

    async findByNumber(number: string): Promise<UserResponse> {
        const user = await this.userRepository.findOne({
            where: { number },
            relations: { course: true },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return this.formatUserResponse(user);
    }
}
