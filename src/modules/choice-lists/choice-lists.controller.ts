import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ChoiceListsService } from './choice-lists.service.js';
import {
    AddChoiceListItemsDto,
    AdminAssignChoiceListDto,
    AutoGenerateChoiceListDto,
    CreateChoiceListDto,
    DuplicateChoiceListDto,
    ReorderChoiceListDto,
    SaveChoiceListDto,
} from './dto/choice-list.dto.js';
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

@Controller('choice-lists')
@UseGuards(JwtAuthGuard)
export class ChoiceListsController {
    constructor(private readonly choiceListsService: ChoiceListsService) {}

    @Get()
    findAll(@Req() req: AuthenticatedRequest) {
        return this.choiceListsService.findAllForUser(req.user.sub);
    }

    @Post()
    create(@Req() req: AuthenticatedRequest, @Body() dto: CreateChoiceListDto) {
        return this.choiceListsService.create(req.user.sub, req.user.role, dto);
    }

    @Post('auto-generate')
    autoGenerate(
        @Req() req: AuthenticatedRequest,
        @Body() dto: AutoGenerateChoiceListDto,
    ) {
        return this.choiceListsService.autoGenerate(req.user.sub, req.user.role, dto);
    }

    @Post('admin/assign')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    adminAssign(
        @Req() req: AuthenticatedRequest,
        @Body() dto: AdminAssignChoiceListDto,
    ) {
        return this.choiceListsService.adminAssign(req.user.sub, dto);
    }

    @Get(':id')
    findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        return this.choiceListsService.findOne(id, req.user.sub, req.user.role);
    }

    @Put(':id/save')
    save(
        @Req() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() dto: SaveChoiceListDto,
    ) {
        return this.choiceListsService.save(id, req.user.sub, req.user.role, dto);
    }

    @Post(':id/items')
    addItems(
        @Req() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() dto: AddChoiceListItemsDto,
    ) {
        return this.choiceListsService.addItems(id, req.user.sub, req.user.role, dto);
    }

    @Patch(':id/reorder')
    reorder(
        @Req() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() dto: ReorderChoiceListDto,
    ) {
        return this.choiceListsService.reorder(id, req.user.sub, req.user.role, dto);
    }

    @Delete(':id/items/:itemId')
    removeItem(
        @Req() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Param('itemId') itemId: string,
    ) {
        return this.choiceListsService.removeItem(id, itemId, req.user.sub, req.user.role);
    }

    @Post(':id/duplicate')
    duplicate(
        @Req() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Body() dto: DuplicateChoiceListDto,
    ) {
        return this.choiceListsService.duplicate(id, req.user.sub, req.user.role, dto);
    }

    @Get(':id/export')
    async exportExcel(
        @Req() req: AuthenticatedRequest,
        @Param('id') id: string,
        @Res() res: Response,
    ) {
        const { fileName, buffer } = await this.choiceListsService.exportExcel(
            id,
            req.user.sub,
            req.user.role,
        );

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    }
}
