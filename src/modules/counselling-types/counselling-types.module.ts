import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CounsellingType } from './entities/counselling-type.entity.js';
import { CounsellingTypesService } from './counselling-types.service.js';

@Module({
    imports: [TypeOrmModule.forFeature([CounsellingType])],
    providers: [CounsellingTypesService],
    exports: [CounsellingTypesService, TypeOrmModule],
})
export class CounsellingTypesModule { }
