import { Module } from '@nestjs/common';
import { UserDevicesService } from './user-devices.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { UserDevice } from './entities/user-device.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserDevice])],
  providers: [UserDevicesService],
  exports: [UserDevicesModule],
})
export class UserDevicesModule { }
