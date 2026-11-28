import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { SessionsService } from './sessions.service.js';
import { Session } from './entities/session.entity.js';

describe('SessionsService', () => {
    let service: SessionsService;
    let repoMock: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(async () => {
        repoMock = {
            find: vi.fn().mockResolvedValue([{ id: 'sess-1', name: '2026-27', isActive: true }]),
            findOne: vi.fn(),
            create: vi.fn((d) => d),
            save: vi.fn(async (d) => ({ id: 'sess-new', ...d })),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionsService,
                { provide: getRepositoryToken(Session), useValue: repoMock },
            ],
        }).compile();

        service = module.get<SessionsService>(SessionsService);
    });

    it('creates a new session and throws ConflictException on duplicate', async () => {
        repoMock.findOne.mockResolvedValueOnce(null);
        const created = await service.create('2026-27');
        expect(created.name).toBe('2026-27');

        repoMock.findOne.mockResolvedValueOnce({ id: 'sess-1', name: '2026-27' });
        await expect(service.create('2026-27')).rejects.toThrow(ConflictException);
    });
});
