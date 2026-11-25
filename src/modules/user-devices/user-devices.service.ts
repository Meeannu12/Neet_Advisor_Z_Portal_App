import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DevicePlatform, UserDevice } from './entities/user-device.entity.js';
import { DataSource, MoreThan } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { RedisService } from '../../redis/redis.service.js';

interface RegisterDeviceInput {
    userId: string;
    deviceId: string;
    deviceName?: string;
    platform: DevicePlatform;
}

@Injectable()
export class UserDevicesService {
    private readonly MAX_DEVICES = 3;

    constructor(
        private readonly dataSource: DataSource,
        private readonly redisService: RedisService,
    ) { }

    async registerDevice(input: RegisterDeviceInput): Promise<UserDevice> {
        return this.dataSource.transaction(async (manager) => {
            const userRepository = manager.getRepository(User);
            const deviceRepository = manager.getRepository(UserDevice);

            // Lock user row to prevent concurrent device registration race conditions
            const user = await userRepository.findOne({
                where: { id: input.userId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            // Check whether this device is already registered
            const existingDevice = await deviceRepository.findOne({
                where: {
                    userId: input.userId,
                    deviceId: input.deviceId,
                },
            });

            if (existingDevice?.isActive) {
                existingDevice.deviceName = input.deviceName ?? null;
                existingDevice.platform = input.platform;
                existingDevice.lastLoginAt = new Date();

                return deviceRepository.save(existingDevice);
            }

            // Count currently active devices using the (userId, isActive) composite index
            const activeDeviceCount = await deviceRepository.count({
                where: {
                    userId: input.userId,
                    isActive: true,
                },
            });

            if (activeDeviceCount >= this.MAX_DEVICES) {
                throw new ForbiddenException({
                    message: 'Maximum 3 devices are allowed.',
                    code: 'DEVICE_LIMIT_EXCEEDED',
                    maxDevices: this.MAX_DEVICES,
                    activeDevice: activeDeviceCount,
                });
            }

            // Reactivate an old device or create a new one
            if (existingDevice) {
                existingDevice.isActive = true;
                existingDevice.deviceName = input.deviceName ?? null;
                existingDevice.platform = input.platform;
                existingDevice.lastLoginAt = new Date();

                return deviceRepository.save(existingDevice);
            }

            const device = deviceRepository.create({
                userId: input.userId,
                deviceId: input.deviceId,
                deviceName: input.deviceName,
                platform: input.platform,
                isActive: true,
                lastLoginAt: new Date(),
            });
            return deviceRepository.save(device);
        });
    }

    async saveRefreshToken(
        userId: string,
        deviceId: string,
        refreshTokenHash: string,
        expiresAt: Date,
    ): Promise<void> {
        const result = await this.dataSource
            .getRepository(UserDevice)
            .update(
                {
                    userId,
                    deviceId,
                    isActive: true,
                },
                {
                    refreshTokenHash,
                    refreshTokenExpiresAt: expiresAt,
                },
            );

        if (!result.affected) {
            throw new NotFoundException('Active device not found');
        }
    }

    async rotateRefreshToken(
        userId: string,
        deviceId: string,
        oldTokenHash: string,
        newTokenHash: string,
        expiresAt: Date,
    ): Promise<boolean> {
        const result = await this.dataSource
            .getRepository(UserDevice)
            .update(
                {
                    userId,
                    deviceId,
                    isActive: true,
                    refreshTokenHash: oldTokenHash,
                    refreshTokenExpiresAt: MoreThan(new Date()),
                },
                {
                    refreshTokenHash: newTokenHash,
                    refreshTokenExpiresAt: expiresAt,
                },
            );

        return (result.affected ?? 0) > 0;
    }

    async isDeviceActive(
        userId: string,
        deviceId: string,
    ): Promise<boolean> {
        const device = await this.dataSource
            .getRepository(UserDevice)
            .findOne({
                where: {
                    userId,
                    deviceId,
                    isActive: true,
                },
                select: {
                    id: true,
                },
            });

        return !!device;
    }

    // Logout current device and instantly invalidate cached Redis session
    async logoutDevice(
        userId: string,
        deviceId: string,
    ): Promise<boolean> {
        const result = await this.dataSource
            .getRepository(UserDevice)
            .update(
                {
                    userId,
                    deviceId,
                    isActive: true,
                },
                {
                    isActive: false,
                    refreshTokenHash: null,
                    refreshTokenExpiresAt: null,
                },
            );

        // Security / Performance: Invalidate Redis session cache immediately
        await this.redisService.delete(`session:${userId}:${deviceId}`);

        return (result.affected ?? 0) > 0;
    }

    // Logout all devices and invalidate all active session keys for this user in Redis
    async logoutAllDevices(userId: string): Promise<number> {
        const result = await this.dataSource
            .getRepository(UserDevice)
            .update(
                {
                    userId,
                    isActive: true,
                },
                {
                    isActive: false,
                    refreshTokenHash: null,
                    refreshTokenExpiresAt: null,
                },
            );

        // Invalidate all active session keys for this user in Redis
        await this.redisService.deletePattern(`session:${userId}:*`);

        return result.affected ?? 0;
    }

    // Get active devices ordered by last login
    async getActiveDevices(userId: string) {
        return this.dataSource
            .getRepository(UserDevice)
            .find({
                where: {
                    userId,
                    isActive: true,
                },
                select: {
                    id: true,
                    deviceId: true,
                    deviceName: true,
                    platform: true,
                    lastLoginAt: true,
                    createdAt: true,
                },
                order: {
                    lastLoginAt: 'DESC',
                },
            });
    }

    // Logout a particular device
    async logoutSpecificDevice(
        userId: string,
        deviceId: string,
    ): Promise<boolean> {
        return this.logoutDevice(userId, deviceId);
    }
}
