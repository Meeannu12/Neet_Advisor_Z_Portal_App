import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsersTable1793792230097 implements MigrationInterface {
    name = 'CreateUsersTable1793792230097'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "number" character varying(20) NOT NULL, "role" character varying(30) NOT NULL, "name" character varying(100) NOT NULL, "email" character varying(150), "state" character varying(100) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_aa517eb9a603fc94080a45ae983" UNIQUE ("number"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
