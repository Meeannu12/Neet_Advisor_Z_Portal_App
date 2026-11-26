import { describe, expect, it, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { buildAdminResources, createTypeOrmResourceModel } from './admin-ui.helper.js';

describe('admin-ui.helper', () => {
    it('wraps a TypeORM repository into an AdminJS-compatible model', async () => {
        class SampleEntity {
            id!: string;
            name!: string;
        }

        const savedEntity = { id: '1', name: 'UG' };
        const repoMock = {
            metadata: { name: 'SampleEntity' },
            count: vi.fn().mockResolvedValue(1),
            find: vi.fn().mockResolvedValue([savedEntity]),
            findOneBy: vi.fn().mockResolvedValue({ ...savedEntity }),
            findBy: vi.fn().mockResolvedValue([savedEntity]),
            create: vi.fn().mockImplementation((data: Partial<SampleEntity>) => ({ ...data })),
            save: vi.fn().mockResolvedValue(savedEntity),
            remove: vi.fn().mockResolvedValue(savedEntity),
        };

        const dataSourceMock = {
            getRepository: vi.fn().mockReturnValue(repoMock),
            entityMetadatas: [{ target: SampleEntity, name: 'SampleEntity' }],
        } as unknown as DataSource;

        const model = createTypeOrmResourceModel(dataSourceMock, SampleEntity, 'SampleEntity');
        expect(model.name).toBe('SampleEntity');
        expect(model.getRepository()).toBe(repoMock);
        expect(await model.count()).toBe(1);

        const created = model.create({ name: 'UG' });
        await created.save();
        expect(repoMock.save).toHaveBeenCalledTimes(1);

        const found = await model.findOneBy({ id: '1' });
        expect(found).not.toBeNull();
        await found?.remove();
        expect(repoMock.remove).toHaveBeenCalledTimes(1);

        const resources = buildAdminResources(dataSourceMock);
        expect(resources).toHaveLength(1);
        expect(resources[0].resource.name).toBe('SampleEntity');
    });
});
