import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Course } from '../../../common/enums/course.enum.js';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 20, unique: true })
    number: string;

    @Column({ type: 'varchar', length: 30 })
    role: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 150, nullable: true })
    email: string | null;

    @Column({ type: 'varchar', length: 100 })
    state: string;

    @Column({ type: Boolean, default: true })
    isActive: boolean

    @Column({ type: 'enum', enum: Course, nullable: true, })
    course: Course | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}