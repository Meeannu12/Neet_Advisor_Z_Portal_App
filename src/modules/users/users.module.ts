import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserImportService } from './user-import.service.js';
import { CoursesModule } from '../courses/courses.module.js';

@Module({
    imports: [
        CoursesModule,
        TypeOrmModule.forFeature([User]),
    ],
    exports: [TypeOrmModule, UsersService],
    controllers: [UsersController],
    providers: [UsersService, UserImportService, RolesGuard],
})
export class UsersModule { }
