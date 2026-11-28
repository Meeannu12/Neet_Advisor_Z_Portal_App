import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { CollegeSeat } from './college-seat.entity.js';
import { Session } from '../../sessions/entities/session.entity.js';
import type { CandidateCategory, CounsellingRound } from '../constants/counselling.constants.js';

@Entity('closing_ranks')
@Index(
    'UQ_closing_ranks_composite',
    ['collegeSeatId', 'sessionId', 'round', 'candidateCategory'],
    { unique: true },
)
export class ClosingRank {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    collegeSeatId!: string;

    @ManyToOne(() => CollegeSeat, (seat) => seat.closingRanks, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'collegeSeatId' })
    collegeSeat!: CollegeSeat;

    @Column({ type: 'uuid' })
    @Index()
    sessionId!: string;

    @ManyToOne(() => Session, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'sessionId' })
    session!: Session;

    @Column({ type: 'varchar', length: 20 })
    @Index()
    round!: CounsellingRound;

    @Column({ type: 'varchar', length: 20 })
    @Index()
    candidateCategory!: CandidateCategory;

    @Column({ type: 'int', nullable: true })
    openingRank!: number | null;

    @Column({ type: 'int' })
    @Index()
    closingRank!: number;

    @Column({ type: 'int', nullable: true })
    closingScore!: number | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
