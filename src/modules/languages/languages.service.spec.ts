import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { LanguagesService } from './languages.service.js';
import { Language } from './entities/language.entity.js';

describe('LanguagesService', () => {
    let service: LanguagesService;
    let repoMock: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(async () => {
        repoMock = {
            find: vi.fn().mockResolvedValue([{ id: 'lang-1', name: 'Tamil', isActive: true }]),
            findOne: vi.fn(),
            create: vi.fn((d) => d),
            save: vi.fn(async (d) => ({ id: 'lang-new', ...d })),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LanguagesService,
                { provide: getRepositoryToken(Language), useValue: repoMock },
            ],
        }).compile();

        service = module.get<LanguagesService>(LanguagesService);
    });

    it('creates a new language and throws ConflictException on duplicate', async () => {
        repoMock.findOne.mockResolvedValueOnce(null);
        const created = await service.create('Malayalam');
        expect(created.name).toBe('Malayalam');

        repoMock.findOne.mockResolvedValueOnce({ id: 'lang-1', name: 'Malayalam' });
        await expect(service.create('Malayalam')).rejects.toThrow(ConflictException);
    });
});
