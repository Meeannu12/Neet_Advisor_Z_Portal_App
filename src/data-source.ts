import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './modules/users/entities/user.entity.js';
import { ContactRequest } from './modules/contact-requests/entities/contact-request.entity.js';
import { UserDevice } from './modules/user-devices/entities/user-device.entity.js';

export default new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,

    entities: [User,ContactRequest,UserDevice],

    migrations: ['src/database/migrations/*.ts'],

    synchronize: false,
});