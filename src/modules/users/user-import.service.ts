import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { User } from './entities/user.entity.js';
import { Course } from '../../common/enums/course.enum.js';
import { UserRole } from '../../common/constants/roles.constant.js';

import { parseUserImportFile } from './utils/user-import-parser.util.js';
import {
    UserImportError,
    UserImportResult,
} from './interfaces/user-import-result.interface.js';

@Injectable()
export class UserImportService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async importUsers(
        buffer: Buffer,
        originalName: string,
    ): Promise<UserImportResult> {

        const parsedRows = await parseUserImportFile(
            buffer,
            originalName,
        );

        const result: UserImportResult = {
            totalRows: parsedRows.length,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
        };

        // Duplicate mobile numbers detect karo
        const numberCount = new Map<string, number>();

        for (const row of parsedRows) {
            const number = row.data.number;

            if (number) {
                numberCount.set(
                    number,
                    (numberCount.get(number) ?? 0) + 1,
                );
            }
        }

        const validRows: typeof parsedRows = [];

        for (const row of parsedRows) {
            const { number, name, email, state, role, course } =
                row.data;

            const addError = (reason: string) => {
                result.skipped++;
                result.errors.push({
                    row: row.rowNumber,
                    number,
                    reason,
                });
            };

            if (!number || !/^\+?[1-9]\d{9,14}$/.test(number)) {
                addError('Invalid mobile number');
                continue;
            }

            if (numberCount.get(number)! > 1) {
                addError('Duplicate mobile number in uploaded file');
                continue;
            }

            if (!name || name.length > 100) {
                addError('Name is required and must be under 100 characters');
                continue;
            }

            if (!state || state.length > 100) {
                addError('State is required and must be under 100 characters');
                continue;
            }

            // if (!Object.values(UserRole).includes(role as (typeof UserRole)[keyof typeof UserRole])) {
            //     addError('Invalid role');
            //     continue;
            // }

            if (role !== UserRole.USER) {
                addError('Only user role is allowed in bulk import');
                continue;
            }

            if (email && (
                email.length > 150 ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            )) {
                addError('Invalid email address');
                continue;
            }

            if (course && !Object.values(Course).includes(course as Course)) {
                addError('Course must be UG or PG');
                continue;
            }

            validRows.push(row);
        }

        if (validRows.length === 0) {
            return result;
        }

        const numbers = validRows.map((row) => row.data.number);

        const existingUsers = await this.userRepository.find({
            where: {
                number: In(numbers),
            },
        });

        const existingMap = new Map(
            existingUsers.map((user) => [user.number, user]),
        );

        const usersToSave: User[] = [];

        for (const row of validRows) {
            const { number, name, email, state, role, course } =
                row.data;

            const existingUser = existingMap.get(number);

            if (existingUser) {
                existingUser.name = name;
                existingUser.state = state;
                existingUser.role = role;

                if (email) {
                    existingUser.email = email;
                }

                if (course) {
                    existingUser.course = course as Course;
                }

                usersToSave.push(existingUser);
                result.updated++;
            } else {
                const newUser = this.userRepository.create({
                    number,
                    name,
                    email: email || null,
                    state,
                    role,
                    course: course ? course as Course : null,
                    isActive: true,
                });

                usersToSave.push(newUser);
                result.created++;
            }
        }

        try {
            await this.userRepository.save(usersToSave);
        } catch (error) {
            throw error;
        }

        return result;
    }
}