import {
    ArrayMaxSize,
    IsArray,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
    CandidateCategory,
    ChoiceListStatus,
    CounsellingRound,
} from '../../colleges/constants/counselling.constants.js';

export class ChoiceListItemInputDto {
    @IsUUID()
    collegeSeatId!: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    priorityOrder?: number;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}

export class CreateChoiceListDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    title!: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    course?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    session!: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    counsellingType?: string;

    @IsOptional()
    @IsIn(Object.values(CounsellingRound))
    round?: CounsellingRound = CounsellingRound.ROUND_1;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    neetRank!: number;

    @IsIn(Object.values(CandidateCategory))
    candidateCategory!: CandidateCategory;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    domicileState?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    maxAnnualBudget?: number;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(500)
    @ValidateNested({ each: true })
    @Type(() => ChoiceListItemInputDto)
    items?: ChoiceListItemInputDto[];
}

export class SaveChoiceListDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    title?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    neetRank?: number;

    @IsOptional()
    @IsIn(Object.values(CandidateCategory))
    candidateCategory?: CandidateCategory;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    domicileState?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    maxAnnualBudget?: number | null;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    version?: number;

    @IsOptional()
    @IsIn([ChoiceListStatus.DRAFT, ChoiceListStatus.SAVED, ChoiceListStatus.LOCKED])
    status?: 'DRAFT' | 'SAVED' | 'LOCKED';

    @IsArray()
    @ArrayMaxSize(500)
    @ValidateNested({ each: true })
    @Type(() => ChoiceListItemInputDto)
    items!: ChoiceListItemInputDto[];
}

export class AutoGenerateChoiceListDto {
    @IsOptional()
    @IsString()
    @MaxLength(150)
    title?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    course?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    session!: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    counsellingType?: string;

    @IsOptional()
    @IsIn(Object.values(CounsellingRound))
    round?: CounsellingRound = CounsellingRound.ROUND_1;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    neetRank!: number;

    @IsIn(Object.values(CandidateCategory))
    candidateCategory!: CandidateCategory;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    domicileState?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    maxAnnualBudget?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 50;
}

export class AddChoiceListItemsDto {
    @IsArray()
    @ArrayMaxSize(100)
    @ValidateNested({ each: true })
    @Type(() => ChoiceListItemInputDto)
    items!: ChoiceListItemInputDto[];
}

export class ReorderChoiceListDto {
    @IsArray()
    @IsUUID('4', { each: true })
    orderedItemIds!: string[];

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    version?: number;
}

export class DuplicateChoiceListDto {
    @IsOptional()
    @IsString()
    @MaxLength(150)
    title?: string;

    @IsOptional()
    @IsIn(Object.values(CounsellingRound))
    round?: CounsellingRound;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    session?: string;
}

export class AdminAssignChoiceListDto extends CreateChoiceListDto {
    @IsUUID()
    userId!: string;

    @IsOptional()
    @IsIn([ChoiceListStatus.SAVED, ChoiceListStatus.REVIEWED])
    status?: 'SAVED' | 'REVIEWED' = ChoiceListStatus.REVIEWED;
}
