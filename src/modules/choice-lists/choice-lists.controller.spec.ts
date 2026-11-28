import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ChoiceListsController } from './choice-lists.controller.js';
import { ChoiceListsService } from './choice-lists.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

describe('ChoiceListsController', () => {
    let controller: ChoiceListsController;
    const mockService = {
        findAllForUser: vi.fn(),
        create: vi.fn(),
        autoGenerate: vi.fn(),
        adminAssign: vi.fn(),
        findOne: vi.fn(),
        save: vi.fn(),
        addItems: vi.fn(),
        reorder: vi.fn(),
        removeItem: vi.fn(),
        duplicate: vi.fn(),
        exportExcel: vi.fn(),
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ChoiceListsController],
            providers: [{ provide: ChoiceListsService, useValue: mockService }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ChoiceListsController>(ChoiceListsController);
    });

    it('should fetch all choice lists for authenticated user', async () => {
        mockService.findAllForUser.mockResolvedValueOnce({ data: [] });
        const req = { user: { sub: 'user-1', role: 'user', deviceId: 'dev-1', tokenType: 'access' as const } };

        const result = await controller.findAll(req as never);
        expect(mockService.findAllForUser).toHaveBeenCalledWith('user-1');
        expect(result).toEqual({ data: [] });
    });

    it('should delegate save to ChoiceListsService.save', async () => {
        mockService.save.mockResolvedValueOnce({ id: 'list-1', version: 2 });
        const req = { user: { sub: 'user-1', role: 'user', deviceId: 'dev-1', tokenType: 'access' as const } };

        const result = await controller.save(req as never, 'list-1', { items: [], version: 1 });
        expect(mockService.save).toHaveBeenCalledWith('list-1', 'user-1', 'user', {
            items: [],
            version: 1,
        });
        expect(result).toEqual({ id: 'list-1', version: 2 });
    });
});
