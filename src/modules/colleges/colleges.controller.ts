import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { CollegesService } from './colleges.service.js';
import {
    CreateCollegeDto,
    CreateCollegeSeatDto,
    UpsertClosingRankDto,
} from './dto/create-college.dto.js';
import { QueryCollegesDto } from './dto/query-colleges.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/roles.constant.js';

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
        role: string;
        deviceId: string;
        tokenType: 'access';
    };
}

@Controller('colleges')
export class CollegesController {
    constructor(private readonly collegesService: CollegesService) {}

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    createCollege(@Body() dto: CreateCollegeDto) {
        return this.collegesService.createCollege(dto);
    }

    @Post('import')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: 10 * 1024 * 1024 },
            fileFilter: (_req, file, callback) => {
                const extension = file.originalname
                    .slice(file.originalname.lastIndexOf('.'))
                    .toLowerCase();
                if (!['.csv', '.xlsx'].includes(extension)) {
                    return callback(
                        new BadRequestException('Only CSV and XLSX files are allowed'),
                        false,
                    );
                }
                callback(null, true);
            },
        }),
    )
    importColleges(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        return this.collegesService.importColleges(file.buffer, file.originalname);
    }

    @Post(':id/seats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    createSeat(@Param('id') collegeId: string, @Body() dto: CreateCollegeSeatDto) {
        return this.collegesService.createSeat(collegeId, dto);
    }

    @Post('seats/:seatId/cutoffs')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    upsertClosingRank(
        @Param('seatId') seatId: string,
        @Body() dto: UpsertClosingRankDto,
    ) {
        return this.collegesService.upsertClosingRank(seatId, dto);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    findAll(@Req() req: AuthenticatedRequest, @Query() query: QueryCollegesDto) {
        return this.collegesService.findColleges(query, req.user?.sub, req.user?.role);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    findOne(@Param('id') id: string) {
        return this.collegesService.findCollegeById(id);
    }
}
