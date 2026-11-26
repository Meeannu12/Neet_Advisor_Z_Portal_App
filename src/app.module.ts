import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module.js';
import { RedisModule } from './redis/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ContactRequestsModule } from './modules/contact-requests/contact-requests.module.js';
import { UserDevicesModule } from './modules/user-devices/user-devices.module.js';
import { CoursesModule } from './modules/courses/courses.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { LanguagesModule } from './modules/languages/languages.module.js';
import { SessionsModule } from './modules/sessions/sessions.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { CounsellingTypesModule } from './modules/counselling-types/counselling-types.module.js';
import { VideosModule } from './modules/videos/videos.module.js';

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

        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),

    UsersModule,
    CoursesModule,
    StorageModule,
    LanguagesModule,
    SessionsModule,
    CategoriesModule,
    CounsellingTypesModule,
    VideosModule,
    RedisModule,
    AuthModule,
    ContactRequestsModule,
    UserDevicesModule,
  ],
})
export class AppModule { }
