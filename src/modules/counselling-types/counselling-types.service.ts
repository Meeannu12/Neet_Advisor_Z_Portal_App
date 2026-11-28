import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CounsellingType } from './entities/counselling-type.entity.js';
import {
    createLookupOrThrow,
    findActiveLookupOrThrow,
} from '../../common/utils/lookup-entity.util.js';

@Injectable()
export class CounsellingTypesService {
    constructor(
        @InjectRepository(CounsellingType)
        private readonly counsellingTypeRepository: Repository<CounsellingType>,
    ) { }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    async findOrCreate(name: string): Promise<CounsellingType> {
        const normalized = name.trim();
        const slug = this.generateSlug(normalized);

        let counsellingType = await this.counsellingTypeRepository.findOne({
            where: [{ name: normalized }, { slug }],
        });

        if (!counsellingType) {
            counsellingType = this.counsellingTypeRepository.create({
                name: normalized,
                slug,
                isActive: true,
            });
            counsellingType = await this.counsellingTypeRepository.save(counsellingType);
        }

        return counsellingType;
    }

    async create(name: string): Promise<CounsellingType> {
        return createLookupOrThrow(
            this.counsellingTypeRepository,
            name,
            'CounsellingType',
            { withSlug: true },
        );
    }

    async findAll(): Promise<CounsellingType[]> {
        return this.counsellingTypeRepository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });
    }

    async findExistingOrThrow(nameOrSlug: string): Promise<CounsellingType> {
        return findActiveLookupOrThrow(
            this.counsellingTypeRepository,
            nameOrSlug,
            'CounsellingType',
            true,
        );
    }
}
