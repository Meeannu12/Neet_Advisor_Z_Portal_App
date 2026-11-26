import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { VideosService } from './videos.service.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { QueryVideosDto } from './dto/query-videos.dto.js';
import { UploadUrlDto } from './dto/upload-url.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/roles.constant.js';

@Controller('videos')
export class VideosController {
    constructor(private readonly videosService: VideosService) { }

    /**
     * Admin: Request Cloudflare R2 Presigned PUT upload URL
     */
    @Post('upload-url')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    getUploadUrl(@Body() dto: UploadUrlDto) {
        return this.videosService.getUploadUrl(dto);
    }

    /**
     * Admin: Register newly uploaded video metadata
     */
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    create(@Body() dto: CreateVideoDto) {
        return this.videosService.create(dto);
    }

    /**
     * Authenticated / Public: Get paginated and filtered video catalog
     */
    @Get()
    @UseGuards(JwtAuthGuard)
    findAll(@Query() query: QueryVideosDto) {
        return this.videosService.findAll(query);
    }

    /**
     * Authenticated: Get single video stream details
     */
    @Get(':id')
    @UseGuards(JwtAuthGuard)
    findOne(@Param('id') id: string) {
        return this.videosService.findOne(id);
    }

    /**
     * Admin: Delete video and purge from Cloudflare R2
     */
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.videosService.remove(id);
    }
}
