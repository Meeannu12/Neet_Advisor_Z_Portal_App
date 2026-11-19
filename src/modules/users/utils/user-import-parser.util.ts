import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';

export interface ParsedUserRow {
    rowNumber: number;
    data: Record<string, string>;
}

const REQUIRED_HEADERS = [
    'number',
    'name',
    'state',
    'role',
    'course'
];

const ALLOWED_HEADERS = [
    'number',
    'name',
    'email',
    'state',
    'role',
    'course',
];

export async function parseUserImportFile(
    buffer: Buffer,
    originalName: string,
): Promise<ParsedUserRow[]> {

    const extension = originalName
        .split('.')
        .pop()
        ?.toLowerCase();

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
        throw new BadRequestException(
            'Only CSV and XLSX files are allowed',
        );
    }

    if (rows.length < 2) {
        throw new BadRequestException(
            'File must contain headers and at least one data row',
        );
    }

    const headers = rows[0].map((header) =>
        String(header ?? '').trim().toLowerCase(),
    );

    const duplicateHeaders = headers.filter(
        (header, index) =>
            header && headers.indexOf(header) !== index,
    );

    if (duplicateHeaders.length > 0) {
        throw new BadRequestException(
            `Duplicate headers: ${duplicateHeaders.join(', ')}`,
        );
    }

    const missingHeaders = REQUIRED_HEADERS.filter(
        (header) => !headers.includes(header),
    );

    if (missingHeaders.length > 0) {
        throw new BadRequestException(
            `Missing headers: ${missingHeaders.join(', ')}`,
        );
    }

    const unknownHeaders = headers.filter(
        (header) => header && !ALLOWED_HEADERS.includes(header),
    );

    if (unknownHeaders.length > 0) {
        throw new BadRequestException(
            `Unknown headers: ${unknownHeaders.join(', ')}`,
        );
    }

    return rows.slice(1).map((row, index) => {
        const data: Record<string, string> = {};

        headers.forEach((header, columnIndex) => {
            if (!header) return;

            data[header] = String(
                row[columnIndex] ?? '',
            ).trim();
        });

        return {
            rowNumber: index + 2,
            data,
        };
    }).filter((row) =>
        Object.values(row.data).some((value) => value !== ''),
    );
}