import type { DataSource, DeepPartial, ObjectLiteral, Repository } from 'typeorm';

export interface AdminResourceEntityWrapper<T extends ObjectLiteral = ObjectLiteral> {
    name: string;
    getRepository: () => Repository<T>;
    count: (options?: Parameters<Repository<T>['count']>[0]) => Promise<number>;
    find: (options?: Parameters<Repository<T>['find']>[0]) => Promise<T[]>;
    findOneBy: (
        where: Parameters<Repository<T>['findOneBy']>[0],
    ) => Promise<(T & { save: () => Promise<T>; remove: () => Promise<T> }) | null>;
    findBy: (where: Parameters<Repository<T>['findBy']>[0]) => Promise<T[]>;
    create: (data: DeepPartial<T>) => T & { save: () => Promise<T>; remove: () => Promise<T> };
}

function attachPersistenceMethods<T extends ObjectLiteral>(
    entity: T,
    repo: Repository<T>,
): T & { save: () => Promise<T>; remove: () => Promise<T> } {
    Object.defineProperties(entity, {
        save: {
            value: () => repo.save(entity),
            enumerable: false,
            configurable: true,
        },
        remove: {
            value: () => repo.remove(entity),
            enumerable: false,
            configurable: true,
        },
    });

    return entity as T & { save: () => Promise<T>; remove: () => Promise<T> };
}

/**
 * Adapts a standard TypeORM DataSource repository into the BaseEntity-like shape
 * expected by @adminjs/typeorm without modifying existing entity classes.
 */
export function createTypeOrmResourceModel<T extends ObjectLiteral>(
    dataSource: DataSource,
    target: string | (new () => T),
    fallbackName: string,
): AdminResourceEntityWrapper<T> {
    const repo = dataSource.getRepository<T>(target);
    const modelName = typeof target === 'function' ? target.name : fallbackName;

    return {
        name: modelName,
        getRepository: () => repo,
        count: (options) => repo.count(options),
        find: (options) => repo.find(options),
        findOneBy: async (where) => {
            const instance = await repo.findOneBy(where);
            return instance ? attachPersistenceMethods(instance, repo) : null;
        },
        findBy: (where) => repo.findBy(where),
        create: (data) => attachPersistenceMethods(repo.create(data), repo),
    };
}

/**
 * Builds AdminJS resource definitions for all entities registered on the TypeORM DataSource.
 */
export function buildAdminResources(dataSource: DataSource) {
    return dataSource.entityMetadatas.map((metadata) => ({
        resource: createTypeOrmResourceModel(
            dataSource,
            metadata.target as string | (new () => ObjectLiteral),
            metadata.name,
        ),
        options: {
            navigation: { name: 'Database', icon: 'Database' },
        },
    }));
}
