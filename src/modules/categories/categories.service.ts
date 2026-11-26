import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity.js';

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

    async findAll(): Promise<Category[]> {
        return this.categoryRepository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });
    }
}
