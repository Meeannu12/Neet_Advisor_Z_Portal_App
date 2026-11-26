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
import { Course } from '../../courses/entities/course.entity.js';
import { Language } from '../../languages/entities/language.entity.js';
import { Session } from '../../sessions/entities/session.entity.js';
import { Category } from '../../categories/entities/category.entity.js';
import { CounsellingType } from '../../counselling-types/entities/counselling-type.entity.js';

@Entity('videos')
export class Video {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    title!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'boolean', default: false })
    @Index()
    isPremium!: boolean;

    @Column({ type: 'varchar', length: 1000 })
    thumbnailUrl!: string;

    @Column({ type: 'varchar', length: 1000 })
    videoUrl!: string;

    @Column({ type: 'int', default: 0 })
    duration!: number;

    // Relations
    @Column({ type: 'uuid' })
    @Index()
    courseId!: string;

    @ManyToOne(() => Course, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'courseId' })
    course!: Course;

    @Column({ type: 'uuid' })
    @Index()
    languageId!: string;

    @ManyToOne(() => Language, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'languageId' })
    language!: Language;

    @Column({ type: 'uuid' })
    @Index()
    sessionId!: string;

    @ManyToOne(() => Session, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'sessionId' })
    session!: Session;

    @Column({ type: 'uuid' })
    @Index()
    categoryId!: string;

    @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'categoryId' })
    category!: Category;

    @Column({ type: 'uuid', nullable: true })
    @Index()
    counsellingTypeId!: string | null;

    @ManyToOne(() => CounsellingType, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'counsellingTypeId' })
    counsellingType!: CounsellingType | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
