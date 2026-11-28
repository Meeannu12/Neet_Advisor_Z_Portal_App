import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChoiceList } from './entities/choice-list.entity.js';
import { ChoiceListItem } from './entities/choice-list-item.entity.js';
import { ChoiceListsService } from './choice-lists.service.js';
import { ChoiceListsController } from './choice-lists.controller.js';
import { CollegesModule } from '../colleges/colleges.module.js';
import { CoursesModule } from '../courses/courses.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { CounsellingTypesModule } from '../counselling-types/counselling-types.module.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([ChoiceList, ChoiceListItem]),
        CollegesModule,
        CoursesModule,
        SessionsModule,
        CounsellingTypesModule,
    ],
    controllers: [ChoiceListsController],
    providers: [ChoiceListsService, RolesGuard],
    exports: [ChoiceListsService],
})
export class ChoiceListsModule {}
