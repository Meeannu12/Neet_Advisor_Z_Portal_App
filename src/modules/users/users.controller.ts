import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/roles.constant.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserImportService } from './user-import.service.js';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';

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
        return this.usersService.create(dto);
    }

    // Performance: Paginated endpoint with optional page and limit query params
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 20;
        return this.usersService.findAll(pageNum, limitNum);
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
        return this.usersService.findByNumber(number);
    }
}
