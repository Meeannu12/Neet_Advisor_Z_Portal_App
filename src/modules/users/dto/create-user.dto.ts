import { IsEmail, IsEnum, IsIn, IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";
import { Course } from "../../../common/enums/course.enum.js";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+?[1-9]\d{9,14}$/)
    number: string

    @IsString()
    @IsIn(['admin', 'user'])
    role: string;



    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @IsString()
    @IsEmail()
    email?: string

    @IsString()
    @IsNotEmpty()
    @IsEnum(Course)
    course?: Course | null;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    state: string;
}