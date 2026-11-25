import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+?[1-9]\d{9,14}$/)
    number: string;

    @IsString()
    @IsIn(['admin', 'user'])
    role: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @IsOptional()
    @IsString()
    @IsEmail()
    email?: string;

    // Dynamic course: Accepts any course name string (e.g. 'UG', 'PG', 'MBBS', 'BDS')
    // and automatically resolves or creates it in the courses table.
    @IsOptional()
    @IsString()
    @MaxLength(100)
    course?: string | null;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    state: string;
}
