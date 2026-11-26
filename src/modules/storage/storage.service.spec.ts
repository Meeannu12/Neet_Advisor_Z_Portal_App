import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service.js';
import { ConfigService } from '@nestjs/config';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('StorageService', () => {
    let service: StorageService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StorageService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: vi.fn((key: string) => {
                            const config: Record<string, string> = {
                                R2_ACCOUNT_ID: 'test-account-id',
                                R2_ACCESS_KEY_ID: 'test-access-key',
                                R2_SECRET_ACCESS_KEY: 'test-secret-key',
                                R2_BUCKET_NAME: 'test-bucket',
                                R2_PUBLIC_URL: 'https://media.neetadvisor.com',
                            };
                            return config[key];
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<StorageService>(StorageService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should generate valid presigned upload URL and public URL', () => {
        const result = service.generatePresignedUploadUrl('videos/test.mp4', 'video/mp4', 900);

        expect(result.uploadUrl).toBeDefined();
        expect(result.uploadUrl).toContain('test-bucket.test-account-id.r2.cloudflarestorage.com');
        expect(result.uploadUrl).toContain('X-Amz-Signature');
        expect(result.publicUrl).toBe('https://media.neetadvisor.com/videos/test.mp4');
        expect(result.fileKey).toBe('videos/test.mp4');
    });
});
