import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity.js';
import { CoursesService } from './courses.service.js';
import { CoursesController } from './courses.controller.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Module({
    imports: [TypeOrmModule.forFeature([Course])],
    controllers: [CoursesController],
    providers: [CoursesService, RolesGuard],
    exports: [CoursesService, TypeOrmModule],
})
export class CoursesModule { }
