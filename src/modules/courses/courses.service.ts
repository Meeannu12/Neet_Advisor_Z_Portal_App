import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Course } from './entities/course.entity.js';
import { findActiveLookupOrThrow } from '../../common/utils/lookup-entity.util.js';

@Injectable()
export class CoursesService {
    constructor(
        @InjectRepository(Course)
        private readonly courseRepository: Repository<Course>,
    ) { }

    /**
     * Finds an existing course by normalized name (uppercase, trimmed)
     * or creates a new one if it does not exist yet.
     */
    async findOrCreate(name: string): Promise<Course> {
        const normalizedName = name.trim().toUpperCase();

        let course = await this.courseRepository.findOne({
            where: { name: normalizedName },
        });

        if (!course) {
            course = this.courseRepository.create({
                name: normalizedName,
                isActive: true,
            });
            course = await this.courseRepository.save(course);
        }

        return course;
    }

    /**
     * Resolves multiple course names in batch:
     * Fetches existing ones, creates missing ones in bulk, and returns a Map of name -> Course
     */
    async findOrCreateMany(names: string[]): Promise<Map<string, Course>> {
        const uniqueNormalizedNames = Array.from(
            new Set(names.map((n) => n.trim().toUpperCase()).filter(Boolean)),
        );

        if (uniqueNormalizedNames.length === 0) {
            return new Map();
        }

        // 1. Fetch existing courses from database
        const existingCourses = await this.courseRepository.find({
            where: {
                name: In(uniqueNormalizedNames),
            },
        });

        const courseMap = new Map<string, Course>(
            existingCourses.map((c) => [c.name, c]),
        );

        // 2. Identify missing courses
        const missingNames = uniqueNormalizedNames.filter(
            (name) => !courseMap.has(name),
        );

        // 3. Bulk insert missing courses
        if (missingNames.length > 0) {
            const newCourses = missingNames.map((name) =>
                this.courseRepository.create({
                    name,
                    isActive: true,
                }),
            );

            const savedCourses = await this.courseRepository.save(newCourses);
            savedCourses.forEach((c) => courseMap.set(c.name, c));
        }

        return courseMap;
    }

    async findAll(): Promise<Course[]> {
        return this.courseRepository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });
    }

    async findByName(name: string): Promise<Course | null> {
        return this.courseRepository.findOne({
            where: { name: name.trim().toUpperCase() },
        });
    }

    async findExistingOrThrow(name: string): Promise<Course> {
        return findActiveLookupOrThrow(this.courseRepository, name, 'Course');
    }
}
