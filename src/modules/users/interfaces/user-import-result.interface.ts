export interface UserImportError {
    row: number;
    number?: string;
    reason: string;
}

export interface UserImportResult {
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
    errors: UserImportError[];
}