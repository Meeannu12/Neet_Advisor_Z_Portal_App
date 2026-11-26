import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVideoDto {
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

    @IsString()
    @IsNotEmpty()
    thumbnailUrl!: string;

    @IsString()
    @IsNotEmpty()
    videoUrl!: string;

    @Type(() => Number)
    @IsInt()
    @Min(0)
    duration!: number; // Duration in seconds

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    course!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    language!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    session!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    category!: string;
}
