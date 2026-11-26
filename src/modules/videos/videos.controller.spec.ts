import { Test, TestingModule } from '@nestjs/testing';
import { VideosController } from './videos.controller.js';
import { VideosService } from './videos.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('VideosController', () => {
    let controller: VideosController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [VideosController],
            providers: [
                {
                    provide: VideosService,
                    useValue: {
                        getUploadUrl: vi.fn(),
                        create: vi.fn(),
                        findAll: vi.fn(),
                        findOne: vi.fn(),
                        remove: vi.fn(),
                    },
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
});
