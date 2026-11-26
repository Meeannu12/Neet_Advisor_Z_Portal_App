import { Test, TestingModule } from '@nestjs/testing';
import { VideosController } from './videos.controller.js';
import { VideosService } from './videos.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('VideosController', () => {
    let controller: VideosController;
    const mockVideosService = {
        getUploadUrl: vi.fn(),
        create: vi.fn(),
        findAll: vi.fn(),
        findSections: vi.fn(),
        getFilterOptions: vi.fn(),
        findOne: vi.fn(),
        remove: vi.fn(),
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [VideosController],
            providers: [
                {
                    provide: VideosService,
                    useValue: mockVideosService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<VideosController>(VideosController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should delegate findSections with user context and query params', async () => {
        const expected = { data: { Latest: [] } };
        mockVideosService.findSections.mockResolvedValueOnce(expected);

        const req = { user: { sub: 'user-1', role: 'user', deviceId: 'dev-1', tokenType: 'access' as const } };
        const result = await controller.findSections(req as never, { limit: 10, session: '2026' });

        expect(mockVideosService.findSections).toHaveBeenCalledWith(
            { limit: 10, session: '2026' },
            'user-1',
            'user',
        );
        expect(result).toEqual(expected);
    });
});
