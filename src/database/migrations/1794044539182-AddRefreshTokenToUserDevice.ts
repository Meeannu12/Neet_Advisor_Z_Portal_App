import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRefreshTokenToUserDevice1794044539182 implements MigrationInterface {
    name = 'AddRefreshTokenToUserDevice1794044539182'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_devices" ADD "refreshTokenHash" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "user_devices" ADD "refreshTokenExpiresAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_devices" DROP COLUMN "refreshTokenExpiresAt"`);
        await queryRunner.query(`ALTER TABLE "user_devices" DROP COLUMN "refreshTokenHash"`);
    }

}
