import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entities/session.entity.js';
import { SessionsService } from './sessions.service.js';
import { SessionsController } from './sessions.controller.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Module({
    imports: [TypeOrmModule.forFeature([Session])],
    controllers: [SessionsController],
    providers: [SessionsService, RolesGuard],
    exports: [SessionsService, TypeOrmModule],
})
export class SessionsModule { }
