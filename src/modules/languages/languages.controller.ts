import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { LanguagesService } from './languages.service.js';
import { CreateLanguageDto } from './dto/create-language.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/roles.constant.js';

@Controller('languages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class LanguagesController {
    constructor(private readonly languagesService: LanguagesService) {}

    @Get()
    findAll() {
        return this.languagesService.findAll();
    }

    @Post()
    create(@Body() dto: CreateLanguageDto) {
        return this.languagesService.create(dto.name);
    }
}
