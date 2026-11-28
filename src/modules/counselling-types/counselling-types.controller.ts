import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CounsellingTypesService } from './counselling-types.service.js';
import { CreateCounsellingTypeDto } from './dto/create-counselling-type.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/roles.constant.js';

@Controller('counselling-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CounsellingTypesController {
    constructor(private readonly counsellingTypesService: CounsellingTypesService) {}

    @Get()
    findAll() {
        return this.counsellingTypesService.findAll();
    }

    @Post()
    create(@Body() dto: CreateCounsellingTypeDto) {
        return this.counsellingTypesService.create(dto.name);
    }
}
