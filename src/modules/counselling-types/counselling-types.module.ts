import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CounsellingType } from './entities/counselling-type.entity.js';
import { CounsellingTypesService } from './counselling-types.service.js';
import { CounsellingTypesController } from './counselling-types.controller.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Module({
    imports: [TypeOrmModule.forFeature([CounsellingType])],
    controllers: [CounsellingTypesController],
    providers: [CounsellingTypesService, RolesGuard],
    exports: [CounsellingTypesService, TypeOrmModule],
})
export class CounsellingTypesModule { }
