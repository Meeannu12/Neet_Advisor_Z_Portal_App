import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import type { InstituteType } from '../constants/counselling.constants.js';
import type { CollegeSeat } from './college-seat.entity.js';

@Entity('colleges')
export class College {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    shortName!: string | null;

    @Column({ type: 'varchar', length: 255, unique: true })
    @Index({ unique: true })
    slug!: string;

    @Column({ type: 'varchar', length: 100 })
    @Index()
    state!: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    city!: string | null;

    @Column({ type: 'varchar', length: 30 })
    @Index()
    instituteType!: InstituteType;

    @Column({ type: 'int', nullable: true })
    establishedYear!: number | null;

    @Column({ type: 'int', nullable: true })
    bedsCount!: number | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    universityName!: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    website!: string | null;

    @Column({ type: 'boolean', default: true })
    @Index()
    isActive!: boolean;

    @OneToMany('CollegeSeat', 'college')
    seats?: CollegeSeat[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
