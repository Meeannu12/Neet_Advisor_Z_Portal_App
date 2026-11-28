import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CollegesService } from './colleges.service.js';
import { QueryCutoffsDto } from './dto/query-colleges.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
        role: string;
        deviceId: string;
        tokenType: 'access';
    };
}

@Controller('cutoffs')
export class CutoffsController {
    constructor(private readonly collegesService: CollegesService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    findCutoffs(@Req() req: AuthenticatedRequest, @Query() query: QueryCutoffsDto) {
        return this.collegesService.findCutoffs(query, req.user?.sub, req.user?.role);
    }
}
