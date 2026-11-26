import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video } from './entities/video.entity.js';
import { VideosController } from './videos.controller.js';
import { VideosService } from './videos.service.js';

import { CoursesModule } from '../courses/courses.module.js';
import { LanguagesModule } from '../languages/languages.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([Video]),
        CoursesModule,
        LanguagesModule,
        SessionsModule,
        CategoriesModule,
        StorageModule,
    ],
    controllers: [VideosController],
    providers: [VideosService, RolesGuard],
    exports: [VideosService],
})
export class VideosModule { }
