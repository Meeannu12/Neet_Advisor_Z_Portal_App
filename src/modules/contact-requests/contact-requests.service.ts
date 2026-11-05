import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactRequest } from './entities/contact-request.entity.js';

@Injectable()
export class ContactRequestsService {
    constructor(
        @InjectRepository(ContactRequest)
        private readonly contactRequestRepository: Repository<ContactRequest>,
    ) { }

    async createRequest(number: string): Promise<{
        request: ContactRequest;
        isNew: boolean;
    }> {
        // Avoid duplicate pending requests for the same number
        const existingRequest = await this.contactRequestRepository.findOne({
            where: {
                number,
                status: 'pending',
            },
        });

        if (existingRequest)
            return {
                request: existingRequest,
                isNew: false,
            }
        const request = this.contactRequestRepository.create({
            number,
            status: 'pending',
        });

        const savedRequest = await this.contactRequestRepository.save(request);

        return {
            request: savedRequest,
            isNew: true,
        }
    }
}