import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';

import { User } from '../../users/entities/user.entity.js';

export type DevicePlatform = 'android' | 'ios' | 'web';

@Entity('user_devices')
// Unique index to ensure one registration per user device
@Index(['userId', 'deviceId'], { unique: true })
// Performance: Composite index for fast count and query lookups on active devices
@Index(['userId', 'isActive'])
export class UserDevice {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column({ type: 'varchar', length: 150 })
    deviceId!: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    deviceName!: string | null;

    @Column({ type: 'varchar', length: 20 })
    platform!: DevicePlatform;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    lastLoginAt!: Date | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    refreshTokenHash!: string | null;

    @Column({ type: 'timestamp', nullable: true })
    refreshTokenExpiresAt!: Date | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

}
