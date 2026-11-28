import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

const trimValue = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export class CreateVideoDto {
    @Transform(trimValue)
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    isPremium?: boolean = false;

    @Transform(trimValue)
    @IsString()
    @IsNotEmpty()
    thumbnailUrl!: string;

    @Transform(trimValue)
    @IsString()
    @IsNotEmpty()
    videoUrl!: string;

    @Type(() => Number)
    @IsInt()
    @Min(0)
    duration!: number; // Duration in seconds

    @Transform(trimValue)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    course!: string;

    @Transform(trimValue)
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    language!: string;

    @Transform(trimValue)
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    session!: string;

    @Transform(trimValue)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    category!: string;

    @Transform(trimValue)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    counsellingType!: string;
}
