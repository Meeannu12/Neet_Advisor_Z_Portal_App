import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

@Entity('counselling_types')
export class CounsellingType {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    @Index({ unique: true })
    name!: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    @Index({ unique: true })
    slug!: string;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
