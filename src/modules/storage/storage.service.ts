import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'crypto';
import axios from 'axios';

export interface PresignedUrlResult {
    uploadUrl: string;
    fileKey: string;
    publicUrl: string;
    expiresIn: number;
}

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);

    private readonly accountId: string;
    private readonly accessKeyId: string;
    private readonly secretAccessKey: string;
    private readonly bucketName: string;
    private readonly publicUrlBase: string;
    private readonly region = 'auto';

    constructor(private readonly configService: ConfigService) {
        this.accountId = this.configService.get<string>('R2_ACCOUNT_ID') || '';
        this.accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID') || '';
        this.secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY') || '';
        this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || '';
        this.publicUrlBase = this.configService.get<string>('R2_PUBLIC_URL') || '';
    }

    private getHost(): string {
        return `${this.bucketName}.${this.accountId}.r2.cloudflarestorage.com`;
    }

    /**
     * Generates an AWS Signature V4 Presigned PUT URL for direct client-to-Cloudflare-R2 upload.
     * This avoids proxying large video files through the NestJS server.
     */
    generatePresignedUploadUrl(
        key: string,
        contentType: string,
        expiresInSeconds = 900,
    ): PresignedUrlResult {
        const host = this.getHost();
        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
        const dateStamp = amzDate.substring(0, 8);

        const scope = `${dateStamp}/${this.region}/s3/aws4_request`;

        const queryParams = new URLSearchParams({
            'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
            'X-Amz-Credential': `${this.accessKeyId}/${scope}`,
            'X-Amz-Date': amzDate,
            'X-Amz-Expires': expiresInSeconds.toString(),
            'X-Amz-SignedHeaders': 'host',
        });

        queryParams.sort();
        const canonicalQueryString = queryParams.toString();

        const encodedKey = key
            .split('/')
            .map((part) => encodeURIComponent(part))
            .join('/');

        const canonicalRequest = [
            'PUT',
            `/${encodedKey}`,
            canonicalQueryString,
            `host:${host}\n`,
            'host',
            'UNSIGNED-PAYLOAD',
        ].join('\n');

        const canonicalRequestHash = createHash('sha256')
            .update(canonicalRequest)
            .digest('hex');

        const stringToSign = [
            'AWS4-HMAC-SHA256',
            amzDate,
            scope,
            canonicalRequestHash,
        ].join('\n');

        const kDate = createHmac('sha256', `AWS4${this.secretAccessKey}`).update(dateStamp).digest();
        const kRegion = createHmac('sha256', kDate).update(this.region).digest();
        const kService = createHmac('sha256', kRegion).update('s3').digest();
        const kSigning = createHmac('sha256', kService).update('aws4_request').digest();

        const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

        const uploadUrl = `https://${host}/${encodedKey}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
        const publicUrl = this.getPublicUrl(key);

        return {
            uploadUrl,
            fileKey: key,
            publicUrl,
            expiresIn: expiresInSeconds,
        };
    }

    /**
     * Resolves the public streaming or delivery URL for an object stored in R2.
     */
    getPublicUrl(key: string): string {
        if (this.publicUrlBase) {
            const trimmedBase = this.publicUrlBase.replace(/\/+$/, '');
            const trimmedKey = key.replace(/^\/+/, '');
            return `${trimmedBase}/${trimmedKey}`;
        }

        return `https://${this.getHost()}/${key}`;
    }

    /**
     * Direct upload of Buffer (useful for small thumbnails).
     */
    async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
        const { uploadUrl, publicUrl } = this.generatePresignedUploadUrl(key, contentType, 300);

        await axios.put(uploadUrl, buffer, {
            headers: {
                'Content-Type': contentType,
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        });

        return publicUrl;
    }

    /**
     * Deletes a file from Cloudflare R2 bucket.
     */
    async deleteFile(key: string): Promise<boolean> {
        try {
            const host = this.getHost();
            const now = new Date();
            const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
            const dateStamp = amzDate.substring(0, 8);
            const scope = `${dateStamp}/${this.region}/s3/aws4_request`;

            const queryParams = new URLSearchParams({
                'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
                'X-Amz-Credential': `${this.accessKeyId}/${scope}`,
                'X-Amz-Date': amzDate,
                'X-Amz-Expires': '300',
                'X-Amz-SignedHeaders': 'host',
            });

            queryParams.sort();
            const canonicalQueryString = queryParams.toString();

            const encodedKey = key
                .split('/')
                .map((part) => encodeURIComponent(part))
                .join('/');

            const canonicalRequest = [
                'DELETE',
                `/${encodedKey}`,
                canonicalQueryString,
                `host:${host}\n`,
                'host',
                'UNSIGNED-PAYLOAD',
            ].join('\n');

            const canonicalRequestHash = createHash('sha256').update(canonicalRequest).digest('hex');
            const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, canonicalRequestHash].join('\n');

            const kDate = createHmac('sha256', `AWS4${this.secretAccessKey}`).update(dateStamp).digest();
            const kRegion = createHmac('sha256', kDate).update(this.region).digest();
            const kService = createHmac('sha256', kRegion).update('s3').digest();
            const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
            const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

            const deleteUrl = `https://${host}/${encodedKey}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

            await axios.delete(deleteUrl);
            return true;
        } catch (error) {
            this.logger.error(`Failed to delete file from R2: ${key}`, error instanceof Error ? error.message : String(error));
            return false;
        }
    }
}
