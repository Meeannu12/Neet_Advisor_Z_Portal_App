import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module.js';
import { RedisModule } from './redis/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ContactRequestsModule } from './modules/contact-requests/contact-requests.module.js';
import { UserDevicesModule } from './modules/user-devices/user-devices.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),

        autoLoadEntities: true,

        synchronize: false,

        // ssl: {
        //   rejectUnauthorized: false,
        // },

        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),

    UsersModule,
    RedisModule,
    AuthModule,
    ContactRequestsModule,
    UserDevicesModule,
  ],
})
export class AppModule { }