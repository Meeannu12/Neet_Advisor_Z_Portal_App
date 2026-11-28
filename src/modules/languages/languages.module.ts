import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Language } from './entities/language.entity.js';
import { LanguagesService } from './languages.service.js';
import { LanguagesController } from './languages.controller.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Module({
    imports: [TypeOrmModule.forFeature([Language])],
    controllers: [LanguagesController],
    providers: [LanguagesService, RolesGuard],
    exports: [LanguagesService, TypeOrmModule],
})
export class LanguagesModule { }
