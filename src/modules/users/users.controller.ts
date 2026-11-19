import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/roles.constant.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserImportService } from './user-import.service.js';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Multer } from 'multer';


@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly userImportService: UserImportService,
    ) { }


    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async create(@Body() dto: CreateUserDto) {
        return this.usersService.create(dto)
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async findAll() {
        return this.usersService.findAll()
    }


    @Post('import')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @UseInterceptors(
        FileInterceptor('file', {
            limits: {
                fileSize: 5 * 1024 * 1024,
            },
            fileFilter: (_req, file, callback) => {
                const allowedExtensions = ['.csv', '.xlsx'];

                const extension = file.originalname
                    .slice(file.originalname.lastIndexOf('.'))
                    .toLowerCase();

                if (!allowedExtensions.includes(extension)) {
                    return callback(
                        new BadRequestException(
                            'Only CSV and XLSX files are allowed',
                        ),
                        false,
                    );
                }

                callback(null, true);
            },
        }),
    )
    async importUsers(
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('Please upload a CSV or XLSX file');
        }

        return this.userImportService.importUsers(
            file.buffer,
            file.originalname,
        );
    }


    @Get(':number')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async findByNumber(@Param('number') number: string) {
        return this.usersService.findByNumber(number)
    }


    // Only Admin
    // @Get('admin')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles(UserRole.ADMIN)
    // adminDashboard() {
    //     return {
    //         message: 'Welcome Admin!',
    //     };
    // }

    // // Admin + Student
    // @Get('student')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles(UserRole.ADMIN, UserRole.STUDENT)
    // studentDashboard() {
    //     return {
    //         message: 'Welcome Student Dashboard!',
    //     };
    // }

    // // All authenticated users
    // @Get('profile')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // profile() {
    //     return {
    //         message: 'Welcome to Profile!',
    //     };
    // }
}
