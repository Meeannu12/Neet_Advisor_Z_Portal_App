export const InstituteType = {
    GOVT: 'GOVT',
    PRIVATE: 'PRIVATE',
    DEEMED: 'DEEMED',
    AIIMS: 'AIIMS',
    ESIC: 'ESIC',
    AFMC: 'AFMC',
} as const;
export type InstituteType = (typeof InstituteType)[keyof typeof InstituteType];

export const CounsellingRound = {
    ROUND_1: 'ROUND_1',
    ROUND_2: 'ROUND_2',
    ROUND_3: 'ROUND_3',
    STRAY: 'STRAY',
} as const;
export type CounsellingRound = (typeof CounsellingRound)[keyof typeof CounsellingRound];

export const CandidateCategory = {
    GEN: 'GEN',
    EWS: 'EWS',
    OBC: 'OBC',
    SC: 'SC',
    ST: 'ST',
    PWD: 'PWD',
} as const;
export type CandidateCategory = (typeof CandidateCategory)[keyof typeof CandidateCategory];

export const ChoiceListStatus = {
    DRAFT: 'DRAFT',
    SAVED: 'SAVED',
    REVIEWED: 'REVIEWED',
    LOCKED: 'LOCKED',
} as const;
export type ChoiceListStatus = (typeof ChoiceListStatus)[keyof typeof ChoiceListStatus];

export const ChanceTag = {
    DREAM: 'DREAM',
    REALISTIC: 'REALISTIC',
    SAFE: 'SAFE',
    UNKNOWN: 'UNKNOWN',
} as const;
export type ChanceTag = (typeof ChanceTag)[keyof typeof ChanceTag];
