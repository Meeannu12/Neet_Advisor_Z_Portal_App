import {
    IsBoolean,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
    CandidateCategory,
    CounsellingRound,
    InstituteType,
} from '../constants/counselling.constants.js';

export class CreateCollegeDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name!: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    shortName?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    state!: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;

    @IsIn(Object.values(InstituteType))
    instituteType!: InstituteType;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1800)
    establishedYear?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    bedsCount?: number;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    universityName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    website?: string;
}

export class CreateCollegeSeatDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    course!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    programName!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    counsellingType!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    quotaName!: string;

    @Type(() => Number)
    @IsInt()
    @Min(0)
    annualTuitionFee!: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    hostelFee?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    totalSeats?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    bondYears?: number = 0;

    @IsOptional()
    @IsString()
    bondPenalty?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    stipendAmount?: number;

    @IsOptional()
    @IsBoolean()
    isOpenState?: boolean = false;
}

export class UpsertClosingRankDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    session!: string;

    @IsIn(Object.values(CounsellingRound))
    round!: CounsellingRound;

    @IsIn(Object.values(CandidateCategory))
    candidateCategory!: CandidateCategory;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    openingRank?: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    closingRank!: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    closingScore?: number;
}
