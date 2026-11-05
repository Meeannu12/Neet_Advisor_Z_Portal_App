import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendOtpDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+?[1-9]\d{9,14}$/, {
        message: 'Invalid mobile number',
    })
    number: string;
}