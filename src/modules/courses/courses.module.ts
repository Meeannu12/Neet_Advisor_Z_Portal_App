import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity.js';
import { CoursesService } from './courses.service.js';

@Module({
    imports: [TypeOrmModule.forFeature([Course])],
    providers: [CoursesService],
    exports: [CoursesService, TypeOrmModule],
})
export class CoursesModule { }
