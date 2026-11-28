import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from './entities/language.entity.js';
import { findActiveLookupOrThrow } from '../../common/utils/lookup-entity.util.js';

@Injectable()
export class LanguagesService {
    constructor(
        @InjectRepository(Language)
        private readonly languageRepository: Repository<Language>,
    ) { }

    async findOrCreate(name: string): Promise<Language> {
        const normalized = name.trim();
        let lang = await this.languageRepository.findOne({
            where: { name: normalized },
        });

        if (!lang) {
            lang = this.languageRepository.create({
                name: normalized,
                isActive: true,
            });
            lang = await this.languageRepository.save(lang);
        }

        return lang;
    }

    async findAll(): Promise<Language[]> {
        return this.languageRepository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });
    }

    async findExistingOrThrow(name: string): Promise<Language> {
        return findActiveLookupOrThrow(this.languageRepository, name, 'Language');
    }
}
