import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/roles.constant.js';

@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SessionsController {
    constructor(private readonly sessionsService: SessionsService) {}

    @Get()
    findAll() {
        return this.sessionsService.findAll();
    }

    @Post()
    create(@Body() dto: CreateSessionDto) {
        return this.sessionsService.create(dto.name);
    }
}
