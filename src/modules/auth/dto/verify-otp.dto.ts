import {
    IsNotEmpty,
    IsString,
    Matches,
} from 'class-validator';

export class VerifyOtpDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+?[1-9]\d{9,14}$/, {
        message: 'Invalid mobile number',
    })
    number: string;

    @IsString()
    @Matches(/^\d{6}$/, {
        message: 'OTP must be exactly 6 digits',
    })
    otp: string;
}