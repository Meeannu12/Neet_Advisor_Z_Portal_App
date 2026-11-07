import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DevicePlatform, UserDevice } from './entities/user-device.entity.js';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';



interface RegisterDeviceInput {
    userId: string;
    deviceId: string;
    deviceName?: string;
    platform: DevicePlatform
}

@Injectable()
export class UserDevicesService {
    private readonly MAX_DEVICES = 3;

    constructor(private readonly dataSource: DataSource) { }

    async registerDevice(input: RegisterDeviceInput): Promise<UserDevice> {
        return this.dataSource.transaction(async (manager) => {
            const userRepository = manager.getRepository(User);
            const deviceRepository = manager.getRepository(UserDevice);

            // lock user row to prevent concurrent device registrations.
            const user = await userRepository.findOne({
                where: { id: input.userId },
                lock: { mode: 'pessimistic_write' },
            })

            if (!user) {
                throw new NotFoundException('User not found')
            }

            // check whether this device is already registerd.
            const existingDevice = await deviceRepository.findOne({
                where: {
                    userId: input.userId,
                    deviceId: input.deviceId,
                }
            });

            if (existingDevice?.isActive) {
                existingDevice.deviceName = input.deviceName ?? null;
                existingDevice.platform = input.platform;
                existingDevice.lastLoginAt = new Date();

                return deviceRepository.save(existingDevice)
            }

            // Count currently active devices.
            const activeDeviceCount = await deviceRepository.count({
                where: {
                    userId: input.userId,
                    isActive: true,
                },
            });

            if (activeDeviceCount >= this.MAX_DEVICES) {
                throw new ForbiddenException({
                    message: 'Maximum 3 devices are a allowed.',
                    code: 'DEVICE_LIMIT_EXCEEDED',
                    maxDevices: this.MAX_DEVICES,
                    activeDevice: activeDeviceCount
                })
            }

            // Reactivate an old device or create a new one.
            if (existingDevice) {
                existingDevice.isActive = true;
                existingDevice.deviceName = input.deviceName ?? null;
                existingDevice.platform = input.platform;
                existingDevice.lastLoginAt = new Date();

                return deviceRepository.save(existingDevice)
            }

            const device = deviceRepository.create({
                userId: input.userId,
                deviceId: input.deviceId,
                deviceName: input.deviceName,
                platform: input.platform,
                isActive: true,
                lastLoginAt: new Date()
            })
            return deviceRepository.save(device)

        })
    }
}
