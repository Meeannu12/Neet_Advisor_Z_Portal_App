import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/roles.constant.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }


    @Post()
    async create(@Body() dto: CreateUserDto) {
        return this.usersService.create(dto)
    }

    @Get()
    async findAll() {
        return this.usersService.findAll()
    }


    // @Get(':number')
    // async findByNumber(@Param('number') number: string) {
    //     return this.usersService.findByNumber(number)
    // }


    // Only Admin
    @Get('admin')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    adminDashboard() {
        return {
            message: 'Welcome Admin!',
        };
    }

    // Admin + Student
    @Get('student')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.STUDENT)
    studentDashboard() {
        return {
            message: 'Welcome Student Dashboard!',
        };
    }

    // All authenticated users
    @Get('profile')
    @UseGuards(JwtAuthGuard, RolesGuard)
    profile() {
        return {
            message: 'Welcome to Profile!',
        };
    }
}
