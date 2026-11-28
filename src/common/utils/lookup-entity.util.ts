import { BadRequestException } from '@nestjs/common';
import { FindOptionsWhere, ObjectLiteral, Raw, Repository } from 'typeorm';

export interface ActiveNamedEntity extends ObjectLiteral {
    name: string;
    isActive: boolean;
}

export interface ActiveSluggedEntity extends ActiveNamedEntity {
    slug: string;
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
