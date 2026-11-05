import { IsEmail, IsIn, IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+?[1-9]\d{9,14}$/)
    number: string

    @IsString()
    @IsIn(['admin', 'student', 'parent'])
    role: string



    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @IsString()
    @IsEmail()
    email?: string

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    state: string;
}