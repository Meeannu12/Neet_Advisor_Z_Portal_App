import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';

export interface ParsedCollegeRow {
    rowNumber: number;
    data: Record<string, string>;
}

const REQUIRED_HEADERS = [
    'collegename',
    'state',
    'institutetype',
    'course',
    'programname',
    'counsellingtype',
    'quotaname',
    'annualtuitionfee',
];

const ALLOWED_HEADERS = [
    ...REQUIRED_HEADERS,
    'shortname',
    'city',
    'establishedyear',
    'bedscount',
    'universityname',
    'website',
    'hostelfee',
    'totalseats',
    'bondyears',
    'bondpenalty',
    'stipendamount',
    'isopenstate',
    'session',
    'round',
    'candidatecategory',
    'openingrank',
    'closingrank',
    'closingscore',
];

export async function parseCollegeImportFile(
    buffer: Buffer,
    originalName: string,
): Promise<ParsedCollegeRow[]> {
    const extension = originalName.split('.').pop()?.toLowerCase();
    let rows: unknown[][] = [];

    if (extension === 'csv') {
        rows = parse(buffer, {
            bom: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
        }) as unknown[][];
    } else if (extension === 'xlsx') {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(Uint8Array.from(buffer).buffer as ArrayBuffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            throw new BadRequestException('Excel sheet not found');
        }

        worksheet.eachRow((row) => {
            const values = row.values as unknown[];
            rows.push(values.slice(1));
        });
    } else {
        throw new BadRequestException('Only CSV and XLSX files are allowed');
    }

    if (rows.length < 2) {
        throw new BadRequestException('File must contain headers and at least one data row');
    }

    const headers = rows[0].map((header) =>
        String(header ?? '')
            .trim()
            .toLowerCase(),
    );

    const missingHeaders = REQUIRED_HEADERS.filter((required) => !headers.includes(required));
    if (missingHeaders.length > 0) {
        throw new BadRequestException(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const invalidHeaders = headers.filter((header) => header && !ALLOWED_HEADERS.includes(header));
    if (invalidHeaders.length > 0) {
        throw new BadRequestException(`Unsupported columns: ${invalidHeaders.join(', ')}`);
    }

    const parsedRows: ParsedCollegeRow[] = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowData: Record<string, string> = {};
        let hasAnyValue = false;

        for (let col = 0; col < headers.length; col++) {
            const key = headers[col];
            if (!key) continue;
            const value = String(row[col] ?? '').trim();
            if (value) hasAnyValue = true;
            rowData[key] = value;
        }

        if (hasAnyValue) {
            parsedRows.push({
                rowNumber: i + 1,
                data: rowData,
            });
        }
    }

    return parsedRows;
}
