import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCourseToUsers1794733399092 implements MigrationInterface {
    name = 'AddCourseToUsers1794733399092'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_course_enum" AS ENUM('UG', 'PG')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "course" "public"."users_course_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "course"`);
        await queryRunner.query(`DROP TYPE "public"."users_course_enum"`);
    }

}
