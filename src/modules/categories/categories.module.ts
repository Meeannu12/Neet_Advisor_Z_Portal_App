import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity.js';
import { CategoriesService } from './categories.service.js';
import { CategoriesController } from './categories.controller.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Module({
    imports: [TypeOrmModule.forFeature([Category])],
    controllers: [CategoriesController],
    providers: [CategoriesService, RolesGuard],
    exports: [CategoriesService, TypeOrmModule],
})
export class CategoriesModule { }
