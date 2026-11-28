import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { College } from './entities/college.entity.js';
import { CollegeSeat } from './entities/college-seat.entity.js';
import { ClosingRank } from './entities/closing-rank.entity.js';
import { CollegesService } from './colleges.service.js';
import { CollegesController } from './colleges.controller.js';
import { CutoffsController } from './cutoffs.controller.js';
import { CoursesModule } from '../courses/courses.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { CounsellingTypesModule } from '../counselling-types/counselling-types.module.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Module({
    imports: [
        TypeOrmModule.forFeature([College, CollegeSeat, ClosingRank]),
        CoursesModule,
        SessionsModule,
        CounsellingTypesModule,
    ],
    controllers: [CollegesController, CutoffsController],
    providers: [CollegesService, RolesGuard],
    exports: [CollegesService, TypeOrmModule],
})
export class CollegesModule {}
