import { ChanceTag } from '../../colleges/constants/counselling.constants.js';

export function computeChanceTag(
    neetRank: number,
    closingRank?: number | null,
): ChanceTag {
    if (!neetRank || neetRank <= 0 || !closingRank || closingRank <= 0) {
        return ChanceTag.UNKNOWN;
    }

    if (closingRank < neetRank * 0.9) {
        return ChanceTag.DREAM;
    }

    if (closingRank <= neetRank * 1.2) {
        return ChanceTag.REALISTIC;
    }

    return ChanceTag.SAFE;
}

export interface SeatEligibilityInput {
    annualTuitionFee: number;
    isOpenState: boolean;
    collegeState: string;
    counsellingTypeSlug?: string;
    counsellingTypeName?: string;
}

export interface UserEligibilityCriteria {
    domicileState: string;
    maxAnnualBudget?: number | null;
}

export function isSeatEligibleForCriteria(
    seat: SeatEligibilityInput,
    criteria: UserEligibilityCriteria,
): boolean {
    if (
        typeof criteria.maxAnnualBudget === 'number' &&
        seat.annualTuitionFee > criteria.maxAnnualBudget
    ) {
        return false;
    }

    if (seat.isOpenState) {
        return true;
    }

    const typeKey = `${seat.counsellingTypeSlug ?? ''} ${seat.counsellingTypeName ?? ''}`.toLowerCase();
    if (
        typeKey.includes('all-india') ||
        typeKey.includes('all india') ||
        typeKey.includes('aiq') ||
        typeKey.includes('deemed')
    ) {
        return true;
    }

    return (
        seat.collegeState.trim().toLowerCase() ===
        criteria.domicileState.trim().toLowerCase()
    );
}
