import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { JwtModule } from '@nestjs/jwt';
import { UserDevicesModule } from '../user-devices/user-devices.module.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Module({
    imports: [AuthModule, JwtModule.register({}), UserDevicesModule, TypeOrmModule.forFeature([User])],
    exports: [TypeOrmModule],
    controllers: [UsersController],
    providers: [UsersService, RolesGuard, JwtAuthGuard]
})
export class UsersModule { }
