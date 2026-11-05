import { ConflictException, Injectable } from '@nestjs/common';
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
        })

        if (existingUser) {
            throw new ConflictException('Mobile number already registered')
        }

        const user = this.userRepository.create({
            ...dto,
            email: dto.email ?? null,
            isActive: true
        })


        return this.userRepository.save(user)

    }

    async findAll(): Promise<User[]> {
        return this.userRepository.find()
    }

    async findByNumber(number: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { number },
        });
    }

}
