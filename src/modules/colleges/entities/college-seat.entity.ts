import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { College } from './college.entity.js';
import { Course } from '../../courses/entities/course.entity.js';
import { CounsellingType } from '../../counselling-types/entities/counselling-type.entity.js';
import type { ClosingRank } from './closing-rank.entity.js';

@Entity('college_seats')
@Index(
    'UQ_college_seats_composite',
    ['collegeId', 'courseId', 'programName', 'counsellingTypeId', 'quotaName'],
    { unique: true },
)
export class CollegeSeat {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    collegeId!: string;

    @ManyToOne(() => College, (college) => college.seats, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'collegeId' })
    college!: College;

    @Column({ type: 'uuid' })
    @Index()
    courseId!: string;

    @ManyToOne(() => Course, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'courseId' })
    course!: Course;

    @Column({ type: 'varchar', length: 150 })
    programName!: string;

    @Column({ type: 'uuid' })
    @Index()
    counsellingTypeId!: string;

    @ManyToOne(() => CounsellingType, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'counsellingTypeId' })
    counsellingType!: CounsellingType;

    @Column({ type: 'varchar', length: 100 })
    quotaName!: string;

    @Column({ type: 'int', default: 0 })
    @Index()
    annualTuitionFee!: number;

    @Column({ type: 'int', nullable: true })
    hostelFee!: number | null;

    @Column({ type: 'int', nullable: true })
    totalSeats!: number | null;

    @Column({ type: 'int', default: 0 })
    bondYears!: number;

    @Column({ type: 'bigint', nullable: true })
    bondPenalty!: string | null;

    @Column({ type: 'int', nullable: true })
    stipendAmount!: number | null;

    @Column({ type: 'boolean', default: false })
    @Index()
    isOpenState!: boolean;

    @Column({ type: 'boolean', default: true })
    @Index()
    isActive!: boolean;

    @OneToMany('ClosingRank', 'collegeSeat')
    closingRanks?: ClosingRank[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
