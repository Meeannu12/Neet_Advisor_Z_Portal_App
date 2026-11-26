import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCounsellingTypesTableAndLinkVideos1795100000000 implements MigrationInterface {
    name = 'CreateCounsellingTypesTableAndLinkVideos1795100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create counselling_types table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "counselling_types" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(100) NOT NULL,
                "slug" character varying(100) NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_counselling_types_name" UNIQUE ("name"),
                CONSTRAINT "UQ_counselling_types_slug" UNIQUE ("slug"),
                CONSTRAINT "PK_counselling_types_id" PRIMARY KEY ("id")
            )
        `);

        // 2. Add counsellingTypeId column to videos table
        await queryRunner.query(`
            ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "counsellingTypeId" uuid
        `);

        // 3. Index on counsellingTypeId
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_videos_counsellingTypeId" ON "videos" ("counsellingTypeId")
        `);

        // 4. Foreign Key constraint
        await queryRunner.query(`
            ALTER TABLE "videos"
            ADD CONSTRAINT "FK_videos_counsellingTypeId"
            FOREIGN KEY ("counsellingTypeId") REFERENCES "counselling_types"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        // 5. Pre-seed default counselling types
        await queryRunner.query(`
            INSERT INTO "counselling_types" ("name", "slug") VALUES
                ('All India Quota', 'all-india-quota'),
                ('State Quota', 'state-quota'),
                ('Deemed / Central', 'deemed-central'),
                ('Management / NRI', 'management-nri')
            ON CONFLICT ("name") DO NOTHING;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "videos" DROP CONSTRAINT IF EXISTS "FK_videos_counsellingTypeId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_videos_counsellingTypeId"`);
        await queryRunner.query(`ALTER TABLE "videos" DROP COLUMN IF EXISTS "counsellingTypeId"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "counselling_types"`);
    }
}
