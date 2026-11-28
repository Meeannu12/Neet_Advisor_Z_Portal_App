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
import { User } from '../../users/entities/user.entity.js';
import { Course } from '../../courses/entities/course.entity.js';
import { Session } from '../../sessions/entities/session.entity.js';
import { CounsellingType } from '../../counselling-types/entities/counselling-type.entity.js';
import type {
    CandidateCategory,
    ChoiceListStatus,
    CounsellingRound,
} from '../../colleges/constants/counselling.constants.js';
import type { ChoiceListItem } from './choice-list-item.entity.js';

@Entity('choice_lists')
export class ChoiceList {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column({ type: 'uuid', nullable: true })
    createdByAdvisorId!: string | null;

    @Column({ type: 'varchar', length: 150 })
    title!: string;

    @Column({ type: 'uuid' })
    @Index()
    courseId!: string;

    @ManyToOne(() => Course, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'courseId' })
    course!: Course;

    @Column({ type: 'uuid' })
    @Index()
    sessionId!: string;

    @ManyToOne(() => Session, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'sessionId' })
    session!: Session;

    @Column({ type: 'uuid', nullable: true })
    @Index()
    counsellingTypeId!: string | null;

    @ManyToOne(() => CounsellingType, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'counsellingTypeId' })
    counsellingType!: CounsellingType | null;

    @Column({ type: 'varchar', length: 20, default: 'ROUND_1' })
    round!: CounsellingRound;

    @Column({ type: 'int' })
    neetRank!: number;

    @Column({ type: 'varchar', length: 20 })
    candidateCategory!: CandidateCategory;

    @Column({ type: 'varchar', length: 100 })
    domicileState!: string;

    @Column({ type: 'int', nullable: true })
    maxAnnualBudget!: number | null;

    @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
    @Index()
    status!: ChoiceListStatus;

    @Column({ type: 'int', default: 1 })
    version!: number;

    @Column({ type: 'timestamp', nullable: true })
    lastSavedAt!: Date | null;

    @OneToMany('ChoiceListItem', 'choiceList')
    items?: ChoiceListItem[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
