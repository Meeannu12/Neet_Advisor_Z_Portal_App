import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactRequest } from './entities/contact-request.entity.js';
import { ContactRequestsService } from './contact-requests.service.js';

@Module({
    imports: [TypeOrmModule.forFeature([ContactRequest])],
    providers: [ContactRequestsService],
    exports: [ContactRequestsService],
})
export class ContactRequestsModule { }