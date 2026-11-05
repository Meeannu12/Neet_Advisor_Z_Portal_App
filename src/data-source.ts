import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './modules/users/entities/user.entity.js';
import { ContactRequest } from './modules/contact-requests/entities/contact-request.entity.js';

export default new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,

    entities: [User,ContactRequest],

    migrations: ['src/database/migrations/*.ts'],

    synchronize: false,
});