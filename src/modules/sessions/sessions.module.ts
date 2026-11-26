import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entities/session.entity.js';
import { SessionsService } from './sessions.service.js';

@Module({
    imports: [TypeOrmModule.forFeature([Session])],
    providers: [SessionsService],
    exports: [SessionsService, TypeOrmModule],
})
export class SessionsModule { }
