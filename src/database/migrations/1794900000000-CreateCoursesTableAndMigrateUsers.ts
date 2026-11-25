import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCoursesTableAndMigrateUsers1794900000000 implements MigrationInterface {
    name = 'CreateCoursesTableAndMigrateUsers1794900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create courses table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "courses" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(100) NOT NULL,
                "description" text,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_courses_name" UNIQUE ("name"),
                CONSTRAINT "PK_courses_id" PRIMARY KEY ("id")
            )
        `);

        // 2. Pre-seed default UG and PG courses
        await queryRunner.query(`
            INSERT INTO "courses" ("name") 
            VALUES ('UG'), ('PG') 
            ON CONFLICT ("name") DO NOTHING
        `);

        // 3. Add courseId column to users table
        await queryRunner.query(`
            ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "courseId" uuid
        `);

        // 4. Data Migration: Migrate existing enum values to courseId references
        await queryRunner.query(`
            UPDATE "users" u
            SET "courseId" = c."id"
            FROM "courses" c
            WHERE u."course"::text = c."name" AND u."course" IS NOT NULL
        `);

        // 5. Add Foreign Key and Index on users(courseId)
        await queryRunner.query(`
            ALTER TABLE "users" 
            ADD CONSTRAINT "FK_users_courseId" 
            FOREIGN KEY ("courseId") REFERENCES "courses"("id") 
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_users_courseId" ON "users" ("courseId")
        `);

        // 6. Safely drop the old course enum column and type
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN IF EXISTS "course"
        `);

        await queryRunner.query(`
            DROP TYPE IF EXISTS "public"."users_course_enum"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. Recreate enum type and column
        await queryRunner.query(`
            CREATE TYPE "public"."users_course_enum" AS ENUM('UG', 'PG')
        `);

        await queryRunner.query(`
            ALTER TABLE "users" ADD "course" "public"."users_course_enum"
        `);

        // 2. Re-populate enum values from courses
        await queryRunner.query(`
            UPDATE "users" u
            SET "course" = c."name"::public.users_course_enum
            FROM "courses" c
            WHERE u."courseId" = c."id" AND c."name" IN ('UG', 'PG')
        `);

        // 3. Drop foreign key constraint, index and courseId column
        await queryRunner.query(`
            ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_courseId"
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_users_courseId"
        `);

        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN IF EXISTS "courseId"
        `);

        // 4. Drop courses table
        await queryRunner.query(`
            DROP TABLE IF EXISTS "courses"
        `);
    }
}
