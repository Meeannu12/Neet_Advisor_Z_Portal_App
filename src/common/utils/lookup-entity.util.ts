import { BadRequestException, ConflictException } from '@nestjs/common';
import { DeepPartial, FindOptionsWhere, ObjectLiteral, Raw, Repository } from 'typeorm';

export interface ActiveNamedEntity extends ObjectLiteral {
    name: string;
    isActive: boolean;
}

export interface ActiveSluggedEntity extends ActiveNamedEntity {
    slug: string;
}

export function generateLookupSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Resolves an active lookup record by case-insensitive name (and optional slug)
 * or throws a BadRequestException if missing or inactive.
 */
export async function findActiveLookupOrThrow<T extends ActiveNamedEntity>(
    repository: Repository<T>,
    value: string,
    label: string,
    matchBySlug = false,
): Promise<T> {
    const normalized = value?.trim();
    if (!normalized) {
        throw new BadRequestException(`${label} is required`);
    }

    const nameCondition = Raw((alias) => `LOWER(${alias}) = LOWER(:value)`, {
        value: normalized,
    });

    const where: FindOptionsWhere<T> | FindOptionsWhere<T>[] = matchBySlug
        ? ([
              { name: nameCondition, isActive: true } as FindOptionsWhere<T>,
              { slug: normalized.toLowerCase(), isActive: true } as unknown as FindOptionsWhere<T>,
          ])
        : ({ name: nameCondition, isActive: true } as FindOptionsWhere<T>);

    const entity = await repository.findOne({ where });
    if (!entity) {
        throw new BadRequestException(`${label} "${normalized}" does not exist or is inactive`);
    }

    return entity;
}

/**
 * Creates a lookup record after verifying no duplicate name (or slug) already exists.
 */
export async function createLookupOrThrow<T extends ActiveNamedEntity>(
    repository: Repository<T>,
    rawName: string,
    label: string,
    options?: {
        withSlug?: boolean;
        uppercaseName?: boolean;
        extraFields?: Partial<T>;
    },
): Promise<T> {
    const trimmed = rawName?.trim();
    if (!trimmed) {
        throw new BadRequestException(`${label} name is required`);
    }

    const normalizedName = options?.uppercaseName ? trimmed.toUpperCase() : trimmed;
    const nameCondition = Raw((alias) => `LOWER(${alias}) = LOWER(:value)`, {
        value: normalizedName,
    });

    const slug = options?.withSlug ? generateLookupSlug(normalizedName) : undefined;
    if (options?.withSlug && !slug) {
        throw new BadRequestException(`${label} name must contain alphanumeric characters`);
    }

    const where: FindOptionsWhere<T> | FindOptionsWhere<T>[] = slug
        ? ([
              { name: nameCondition } as FindOptionsWhere<T>,
              { slug } as unknown as FindOptionsWhere<T>,
          ])
        : ({ name: nameCondition } as FindOptionsWhere<T>);

    const existing = await repository.findOne({ where });
    if (existing) {
        throw new ConflictException(`${label} "${normalizedName}" already exists`);
    }

    const payload: Record<string, unknown> = {
        name: normalizedName,
        isActive: true,
        ...(slug ? { slug } : undefined),
        ...options?.extraFields,
    };

    const entity = repository.create(payload as DeepPartial<T>);
    return repository.save(entity);
}
