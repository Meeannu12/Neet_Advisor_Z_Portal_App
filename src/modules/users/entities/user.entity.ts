import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

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

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}