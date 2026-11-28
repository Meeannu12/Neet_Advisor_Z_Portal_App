import 'dotenv/config';
import { DataSource } from 'typeorm';

import { Course } from './modules/courses/entities/course.entity.js';
import { Language } from './modules/languages/entities/language.entity.js';
import { Session } from './modules/sessions/entities/session.entity.js';
import { Category } from './modules/categories/entities/category.entity.js';
import { CounsellingType } from './modules/counselling-types/entities/counselling-type.entity.js';
import { ContactRequest } from './modules/contact-requests/entities/contact-request.entity.js';
import { User } from './modules/users/entities/user.entity.js';
import { UserDevice } from './modules/user-devices/entities/user-device.entity.js';
import { Video } from './modules/videos/entities/video.entity.js';
import { College } from './modules/colleges/entities/college.entity.js';
import { CollegeSeat } from './modules/colleges/entities/college-seat.entity.js';
import { ClosingRank } from './modules/colleges/entities/closing-rank.entity.js';
import { ChoiceList } from './modules/choice-lists/entities/choice-list.entity.js';
import { ChoiceListItem } from './modules/choice-lists/entities/choice-list-item.entity.js';

export default new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,

    entities: [
        Course,
        Language,
        Session,
        Category,
        CounsellingType,
        ContactRequest,
        User,
        UserDevice,
        Video,
        College,
        CollegeSeat,
        ClosingRank,
        ChoiceList,
        ChoiceListItem,
    ],

    migrations: ['src/database/migrations/*.ts'],

    synchronize: false,
});
