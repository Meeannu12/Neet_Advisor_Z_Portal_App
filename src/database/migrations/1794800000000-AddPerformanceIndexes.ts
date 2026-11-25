import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1794800000000 implements MigrationInterface {
    name = 'AddPerformanceIndexes1794800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Index on user_devices for fast active device counts and user lookup queries
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_user_devices_userId_isActive" ON "user_devices" ("userId", "isActive")`
        );

        // Composite index on contact_request to prevent full table scans on login attempts
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_contact_request_number_status" ON "contact_request" ("number", "status")`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP INDEX IF EXISTS "IDX_contact_request_number_status"`
        );
        await queryRunner.query(
            `DROP INDEX IF EXISTS "IDX_user_devices_userId_isActive"`
        );
    }
}
