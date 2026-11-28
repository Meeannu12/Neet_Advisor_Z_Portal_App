import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity.js';
import {
    createLookupOrThrow,
    findActiveLookupOrThrow,
} from '../../common/utils/lookup-entity.util.js';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,
    ) { }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    async findOrCreate(name: string): Promise<Category> {
        const normalized = name.trim();
        const slug = this.generateSlug(normalized);

        let category = await this.categoryRepository.findOne({
            where: [{ name: normalized }, { slug }],
        });

        if (!category) {
            category = this.categoryRepository.create({
                name: normalized,
                slug,
                isActive: true,
            });
            category = await this.categoryRepository.save(category);
        }

        return category;
    }

    async create(name: string): Promise<Category> {
        return createLookupOrThrow(this.categoryRepository, name, 'Category', {
            withSlug: true,
        });
    }

    async findAll(): Promise<Category[]> {
        return this.categoryRepository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });
    }

    async findExistingOrThrow(nameOrSlug: string): Promise<Category> {
        return findActiveLookupOrThrow(this.categoryRepository, nameOrSlug, 'Category', true);
    }
}
