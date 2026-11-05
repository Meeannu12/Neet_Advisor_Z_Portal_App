import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsActiveToUsers1793798516470 implements MigrationInterface {
    name = 'AddIsActiveToUsers1793798516470'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isActive"`);
    }

}
