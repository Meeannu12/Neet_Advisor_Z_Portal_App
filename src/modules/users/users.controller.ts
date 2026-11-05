import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }


    @Post()
    async create(@Body() dto: CreateUserDto) {
        return this.usersService.create(dto)
    }

    @Get()
    async findAll() {
        return this.usersService.findAll()
    }


    @Get(':number')
    async findByNumber(@Param('number') number: string) {
        return this.usersService.findByNumber(number)
    }
}
