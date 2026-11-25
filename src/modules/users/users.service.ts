import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async create(dto: CreateUserDto): Promise<User> {
        const existingUser = await this.userRepository.findOne({
            where: { number: dto.number }
        });

        if (existingUser) {
            throw new ConflictException('Mobile number already registered');
        }

        const user = this.userRepository.create({
            ...dto,
            email: dto.email ?? null,
            isActive: true
        });

        return this.userRepository.save(user);
    }

    // Performance: Paginated query to prevent high memory usage and DB timeouts
    async findAll(page: number = 1, limit: number = 20) {
        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const safePage = Math.max(Number(page) || 1, 1);
        const skip = (safePage - 1) * safeLimit;

        const [data, total] = await this.userRepository.findAndCount({
            skip,
            take: safeLimit,
            order: { createdAt: 'DESC' },
        });

        return {
            data,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit),
        };
    }

    async findByNumber(number: string): Promise<User | null> {
        const user = await this.userRepository.findOne({
            where: { number },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }
}
