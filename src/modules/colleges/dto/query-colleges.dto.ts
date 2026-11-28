import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
    CandidateCategory,
    CounsellingRound,
    InstituteType,
} from '../constants/counselling.constants.js';

export class BaseCollegeFilterDto {
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

    @IsOptional()
    @IsString()
    course?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @IsIn(Object.values(InstituteType))
    instituteType?: InstituteType;

    @IsOptional()
    @IsString()
    counsellingType?: string;

    @IsOptional()
    @IsString()
    programName?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    maxFee?: number;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return undefined;
    })
    @IsBoolean()
    isOpenState?: boolean;

    @IsOptional()
    @IsString()
    search?: string;
}

export class QueryCollegesDto extends BaseCollegeFilterDto {}

export class QueryCutoffsDto extends BaseCollegeFilterDto {
    @IsOptional()
    @IsString()
    session?: string;

    @IsOptional()
    @IsIn(Object.values(CounsellingRound))
    round?: CounsellingRound;

    @IsOptional()
    @IsIn(Object.values(CandidateCategory))
    candidateCategory?: CandidateCategory;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    userRank?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    minRank?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    maxRank?: number;
}
