import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";



export type contactRequestStatus = | 'pending' | 'contacted' | 'closed';

@Entity('contact_request')
export class ContactRequest {
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @Column({ type: 'varchar', length: 20 })
    number!: string

    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status!: contactRequestStatus

    @CreateDateColumn()
    requestAt!: Date

    @Column({ type: 'timestamp', nullable: true })
    contactedAt!: Date | null
}