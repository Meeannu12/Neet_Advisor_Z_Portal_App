import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
        role: string;
        deviceId: string;
        tokenType: 'access';
    };
}

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('send-otp')
    async sendOtp(@Body() dto: SendOtpDto) {
        return this.authService.sendOtp(dto.number)
    }

    @Post('verify-otp')
    async verifyOtp(@Body() dto: VerifyOtpDto) {
        return this.authService.verifyOtp(dto.number, dto.otp, {
            deviceId: dto.deviceId,
            deviceName: dto.deviceName,
            platform: dto.platform,
        })
    }

    @Post('refresh')
    async refreshTokens(@Body() dto: RefreshTokenDto) {
        return this.authService.refreshTokens(dto.refreshToken);
    }

    @Get('protected-test')
    @UseGuards(JwtAuthGuard)
    protectedTest() {
        return {
            success: true,
            message: 'You are authenticated!',
        };
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    async logout(@Req() req: AuthenticatedRequest) {
        const { sub, deviceId } = req.user;

        const success = await this.authService.logoutDevice(
            sub,
            deviceId,
        );

        return {
            success,
            message: 'Logged out successfully',
        };
    }


    @Post('logout-all')
    @UseGuards(JwtAuthGuard)
    async logoutAll(@Req() req: AuthenticatedRequest) {
        const count = await this.authService.logoutAllDevices(
            req.user.sub,
        );

        return {
            success: true,
            message: 'All devices logged out successfully',
            loggedOutDevices: count,
        };
    }

    @Get('devices')
    @UseGuards(JwtAuthGuard)
    async getDevices(@Req() req: AuthenticatedRequest) {
        const devices = await this.authService.getActiveDevices(
            req.user.sub,
        );

        return {
            success: true,
            count: devices.length,
            devices,
        };
    }

    @Delete('devices/:deviceId')
    @UseGuards(JwtAuthGuard)
    async logoutSpecificDevice(
        @Req() req: AuthenticatedRequest,
        @Param('deviceId') deviceId: string,
    ) {
        const success = await this.authService.logoutSpecificDevice(
            req.user.sub,
            deviceId,
        );

        if (!success) {
            throw new NotFoundException(
                'Active device not found',
            );
        }

        return {
            success: true,
            message: 'Device logged out successfully',
        };
    }
}
