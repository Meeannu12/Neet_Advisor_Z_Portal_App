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
import { ChoiceList } from './choice-list.entity.js';
import { CollegeSeat } from '../../colleges/entities/college-seat.entity.js';
import type { ChanceTag } from '../../colleges/constants/counselling.constants.js';

@Entity('choice_list_items')
@Index('UQ_choice_list_items_list_seat', ['choiceListId', 'collegeSeatId'], { unique: true })
export class ChoiceListItem {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    choiceListId!: string;

    @ManyToOne(() => ChoiceList, (list) => list.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'choiceListId' })
    choiceList!: ChoiceList;

    @Column({ type: 'uuid' })
    @Index()
    collegeSeatId!: string;

    @ManyToOne(() => CollegeSeat, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'collegeSeatId' })
    collegeSeat!: CollegeSeat;

    @Column({ type: 'int' })
    @Index()
    priorityOrder!: number;

    @Column({ type: 'varchar', length: 20, default: 'UNKNOWN' })
    chanceTag!: ChanceTag;

    @Column({ type: 'text', nullable: true })
    notes!: string | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
