import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { User } from './entities/user.entity.js';
import { UserRole } from '../../common/constants/roles.constant.js';
import { CoursesService } from '../courses/courses.service.js';

import { parseUserImportFile } from './utils/user-import-parser.util.js';
import {
    UserImportResult,
} from './interfaces/user-import-result.interface.js';

@Injectable()
export class UserImportService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly coursesService: CoursesService,
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

        // Detect duplicate mobile numbers within uploaded file
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

            if (course && course.trim().length > 100) {
                addError('Course name must be under 100 characters');
                continue;
            }

            validRows.push(row);
        }

        if (validRows.length === 0) {
            return result;
        }

        // 1. Batch Course Resolution: Find or dynamically create all distinct courses from file
        const distinctCourseNames = validRows
            .map((row) => row.data.course)
            .filter((c): c is string => Boolean(c && c.trim()));

        const courseMap = await this.coursesService.findOrCreateMany(distinctCourseNames);

        // 2. Fetch existing users in chunks to avoid parameter limits
        const numbers = validRows.map((row) => row.data.number);
        const CHUNK_SIZE = 500;
        const existingUsers: User[] = [];

        for (let i = 0; i < numbers.length; i += CHUNK_SIZE) {
            const chunk = numbers.slice(i, i + CHUNK_SIZE);
            const usersChunk = await this.userRepository.find({
                where: {
                    number: In(chunk),
                },
            });
            existingUsers.push(...usersChunk);
        }

        const existingMap = new Map(
            existingUsers.map((user) => [user.number, user]),
        );

        const usersToSave: User[] = [];

        for (const row of validRows) {
            const { number, name, email, state, role, course } =
                row.data;

            const existingUser = existingMap.get(number);

            const normalizedCourseName = course ? course.trim().toUpperCase() : null;
            const resolvedCourse = normalizedCourseName ? courseMap.get(normalizedCourseName) : null;
            const courseId = resolvedCourse ? resolvedCourse.id : null;

            if (existingUser) {
                existingUser.name = name;
                existingUser.state = state;
                existingUser.role = role;

                if (email) {
                    existingUser.email = email;
                }

                if (courseId) {
                    existingUser.courseId = courseId;
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
                    courseId,
                    isActive: true,
                });

                usersToSave.push(newUser);
                result.created++;
            }
        }

        // Performance: Save in chunks to reduce memory pressure and avoid holding locks on long transactions
        await this.userRepository.save(usersToSave, { chunk: CHUNK_SIZE });

        return result;
    }
}
