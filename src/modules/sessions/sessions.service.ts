import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entities/session.entity.js';

@Injectable()
export class SessionsService {
    constructor(
        @InjectRepository(Session)
        private readonly sessionRepository: Repository<Session>,
    ) { }

    async findOrCreate(name: string): Promise<Session> {
        const normalized = name.trim();
        let session = await this.sessionRepository.findOne({
            where: { name: normalized },
        });

        if (!session) {
            session = this.sessionRepository.create({
                name: normalized,
                isActive: true,
            });
            session = await this.sessionRepository.save(session);
        }

        return session;
    }

    async findAll(): Promise<Session[]> {
        return this.sessionRepository.find({
            where: { isActive: true },
            order: { name: 'DESC' },
        });
    }
}
