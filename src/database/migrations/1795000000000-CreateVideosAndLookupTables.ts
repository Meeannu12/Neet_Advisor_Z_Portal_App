import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateVideosAndLookupTables1795000000000 implements MigrationInterface {
    name = 'CreateVideosAndLookupTables1795000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Languages Table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "languages" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(50) NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_languages_name" UNIQUE ("name"),
                CONSTRAINT "PK_languages_id" PRIMARY KEY ("id")
            )
        `);

        // 2. Sessions Table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "sessions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(50) NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_sessions_name" UNIQUE ("name"),
                CONSTRAINT "PK_sessions_id" PRIMARY KEY ("id")
            )
        `);

        // 3. Categories Table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "categories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(100) NOT NULL,
                "slug" character varying(100) NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_categories_name" UNIQUE ("name"),
                CONSTRAINT "UQ_categories_slug" UNIQUE ("slug"),
                CONSTRAINT "PK_categories_id" PRIMARY KEY ("id")
            )
        `);

        // 4. Videos Table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "videos" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying(255) NOT NULL,
                "description" text,
                "isPremium" boolean NOT NULL DEFAULT false,
                "thumbnailUrl" character varying(1000) NOT NULL,
                "videoUrl" character varying(1000) NOT NULL,
                "duration" integer NOT NULL DEFAULT 0,
                "courseId" uuid NOT NULL,
                "languageId" uuid NOT NULL,
                "sessionId" uuid NOT NULL,
                "categoryId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_videos_id" PRIMARY KEY ("id")
            )
        `);

        // 5. Indexes on Videos table
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_videos_courseId" ON "videos" ("courseId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_videos_languageId" ON "videos" ("languageId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_videos_sessionId" ON "videos" ("sessionId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_videos_categoryId" ON "videos" ("categoryId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_videos_isPremium" ON "videos" ("isPremium")`);

        // 6. Foreign Keys
        await queryRunner.query(`
            ALTER TABLE "videos" 
            ADD CONSTRAINT "FK_videos_courseId" 
            FOREIGN KEY ("courseId") REFERENCES "courses"("id") 
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "videos" 
            ADD CONSTRAINT "FK_videos_languageId" 
            FOREIGN KEY ("languageId") REFERENCES "languages"("id") 
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "videos" 
            ADD CONSTRAINT "FK_videos_sessionId" 
            FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") 
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "videos" 
            ADD CONSTRAINT "FK_videos_categoryId" 
            FOREIGN KEY ("categoryId") REFERENCES "categories"("id") 
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        // 7. Seed default lookup data
        await queryRunner.query(`
            INSERT INTO "languages" ("name") VALUES ('Hindi'), ('English') ON CONFLICT ("name") DO NOTHING;
            INSERT INTO "sessions" ("name") VALUES ('2024-25'), ('2025-26') ON CONFLICT ("name") DO NOTHING;
            INSERT INTO "categories" ("name", "slug") VALUES 
                ('Cutoff Analysis', 'cutoff-analysis'),
                ('College Review', 'college-review'),
                ('Counseling Guide', 'counseling-guide'),
                ('Seat Matrix', 'seat-matrix')
            ON CONFLICT ("name") DO NOTHING;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "videos" DROP CONSTRAINT IF EXISTS "FK_videos_categoryId"`);
        await queryRunner.query(`ALTER TABLE "videos" DROP CONSTRAINT IF EXISTS "FK_videos_sessionId"`);
        await queryRunner.query(`ALTER TABLE "videos" DROP CONSTRAINT IF EXISTS "FK_videos_languageId"`);
        await queryRunner.query(`ALTER TABLE "videos" DROP CONSTRAINT IF EXISTS "FK_videos_courseId"`);

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_videos_isPremium"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_videos_categoryId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_videos_sessionId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_videos_languageId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_videos_courseId"`);

        await queryRunner.query(`DROP TABLE IF EXISTS "videos"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "languages"`);
    }
}
