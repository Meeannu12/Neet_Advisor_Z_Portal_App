import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class BaseVideoQueryDto {
    // Optional admin override for course (regular users automatically filtered by their course from token)
    @IsOptional()
    @IsString()
    course?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    language?: string;

    @IsOptional()
    @IsString()
    session?: string;

    // Optional filter for counselling type (e.g. 'All India Quota', 'State Quota')
    @IsOptional()
    @IsString()
    counsellingType?: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return undefined;
    })
    @IsBoolean()
    isPremium?: boolean;

    @IsOptional()
    @IsString()
    search?: string;
}

export class QueryVideosDto extends BaseVideoQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}

export class QueryVideoSectionsDto extends BaseVideoQueryDto {
    // Maximum number of videos returned per section (Latest and each category)
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 10;
}
