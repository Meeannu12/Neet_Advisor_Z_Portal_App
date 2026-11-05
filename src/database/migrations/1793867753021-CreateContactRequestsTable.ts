import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateContactRequestsTable1793867753021 implements MigrationInterface {
    name = 'CreateContactRequestsTable1793867753021'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "contact_request" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "number" character varying(20) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "requestAt" TIMESTAMP NOT NULL DEFAULT now(), "contactedAt" TIMESTAMP, CONSTRAINT "PK_d74ea9b4efcf950e4f98d14b173" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "contact_request"`);
    }

}
