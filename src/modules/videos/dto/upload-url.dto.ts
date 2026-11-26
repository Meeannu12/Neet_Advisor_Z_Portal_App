import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';

export class UploadUrlDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-zA-Z0-9_\-.]+$/, {
        message: 'File name should contain only alphanumeric characters, dashes, underscores, and dots',
    })
    fileName!: string;

    @IsString()
    @IsNotEmpty()
    contentType!: string;

    @IsString()
    @IsIn(['video', 'thumbnail'])
    type!: 'video' | 'thumbnail';
}
