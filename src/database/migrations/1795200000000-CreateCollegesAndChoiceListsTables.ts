import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCollegesAndChoiceListsTables1795200000000 implements MigrationInterface {
    name = 'CreateCollegesAndChoiceListsTables1795200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. colleges
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "colleges" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "shortName" character varying(100),
                "slug" character varying(255) NOT NULL,
                "state" character varying(100) NOT NULL,
                "city" character varying(100),
                "instituteType" character varying(30) NOT NULL,
                "establishedYear" integer,
                "bedsCount" integer,
                "universityName" character varying(255),
                "website" character varying(500),
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_colleges_slug" UNIQUE ("slug"),
                CONSTRAINT "PK_colleges_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_colleges_state" ON "colleges" ("state")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_colleges_instituteType" ON "colleges" ("instituteType")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_colleges_isActive" ON "colleges" ("isActive")`);

        // 2. college_seats
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "college_seats" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "collegeId" uuid NOT NULL,
                "courseId" uuid NOT NULL,
                "programName" character varying(150) NOT NULL,
                "counsellingTypeId" uuid NOT NULL,
                "quotaName" character varying(100) NOT NULL,
                "annualTuitionFee" integer NOT NULL DEFAULT 0,
                "hostelFee" integer,
                "totalSeats" integer,
                "bondYears" integer NOT NULL DEFAULT 0,
                "bondPenalty" bigint,
                "stipendAmount" integer,
                "isOpenState" boolean NOT NULL DEFAULT false,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_college_seats_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "UQ_college_seats_composite"
            ON "college_seats" ("collegeId", "courseId", "programName", "counsellingTypeId", "quotaName")
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_college_seats_collegeId" ON "college_seats" ("collegeId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_college_seats_courseId" ON "college_seats" ("courseId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_college_seats_counsellingTypeId" ON "college_seats" ("counsellingTypeId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_college_seats_annualTuitionFee" ON "college_seats" ("annualTuitionFee")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_college_seats_isOpenState" ON "college_seats" ("isOpenState")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_college_seats_isActive" ON "college_seats" ("isActive")`);

        await queryRunner.query(`
            ALTER TABLE "college_seats"
            ADD CONSTRAINT "FK_college_seats_collegeId"
            FOREIGN KEY ("collegeId") REFERENCES "colleges"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "college_seats"
            ADD CONSTRAINT "FK_college_seats_courseId"
            FOREIGN KEY ("courseId") REFERENCES "courses"("id")
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "college_seats"
            ADD CONSTRAINT "FK_college_seats_counsellingTypeId"
            FOREIGN KEY ("counsellingTypeId") REFERENCES "counselling_types"("id")
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        // 3. closing_ranks
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "closing_ranks" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "collegeSeatId" uuid NOT NULL,
                "sessionId" uuid NOT NULL,
                "round" character varying(20) NOT NULL,
                "candidateCategory" character varying(20) NOT NULL,
                "openingRank" integer,
                "closingRank" integer NOT NULL,
                "closingScore" integer,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_closing_ranks_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "UQ_closing_ranks_composite"
            ON "closing_ranks" ("collegeSeatId", "sessionId", "round", "candidateCategory")
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_closing_ranks_collegeSeatId" ON "closing_ranks" ("collegeSeatId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_closing_ranks_sessionId" ON "closing_ranks" ("sessionId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_closing_ranks_round" ON "closing_ranks" ("round")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_closing_ranks_candidateCategory" ON "closing_ranks" ("candidateCategory")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_closing_ranks_closingRank" ON "closing_ranks" ("closingRank")`);

        await queryRunner.query(`
            ALTER TABLE "closing_ranks"
            ADD CONSTRAINT "FK_closing_ranks_collegeSeatId"
            FOREIGN KEY ("collegeSeatId") REFERENCES "college_seats"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "closing_ranks"
            ADD CONSTRAINT "FK_closing_ranks_sessionId"
            FOREIGN KEY ("sessionId") REFERENCES "sessions"("id")
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        // 4. choice_lists
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "choice_lists" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "createdByAdvisorId" uuid,
                "title" character varying(150) NOT NULL,
                "courseId" uuid NOT NULL,
                "sessionId" uuid NOT NULL,
                "counsellingTypeId" uuid,
                "round" character varying(20) NOT NULL DEFAULT 'ROUND_1',
                "neetRank" integer NOT NULL,
                "candidateCategory" character varying(20) NOT NULL,
                "domicileState" character varying(100) NOT NULL,
                "maxAnnualBudget" integer,
                "status" character varying(20) NOT NULL DEFAULT 'DRAFT',
                "version" integer NOT NULL DEFAULT 1,
                "lastSavedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_choice_lists_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_choice_lists_userId" ON "choice_lists" ("userId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_choice_lists_courseId" ON "choice_lists" ("courseId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_choice_lists_sessionId" ON "choice_lists" ("sessionId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_choice_lists_counsellingTypeId" ON "choice_lists" ("counsellingTypeId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_choice_lists_status" ON "choice_lists" ("status")`);

        await queryRunner.query(`
            ALTER TABLE "choice_lists"
            ADD CONSTRAINT "FK_choice_lists_userId"
            FOREIGN KEY ("userId") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "choice_lists"
            ADD CONSTRAINT "FK_choice_lists_courseId"
            FOREIGN KEY ("courseId") REFERENCES "courses"("id")
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "choice_lists"
            ADD CONSTRAINT "FK_choice_lists_sessionId"
            FOREIGN KEY ("sessionId") REFERENCES "sessions"("id")
            ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "choice_lists"
            ADD CONSTRAINT "FK_choice_lists_counsellingTypeId"
            FOREIGN KEY ("counsellingTypeId") REFERENCES "counselling_types"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        // 5. choice_list_items
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "choice_list_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "choiceListId" uuid NOT NULL,
                "collegeSeatId" uuid NOT NULL,
                "priorityOrder" integer NOT NULL,
                "chanceTag" character varying(20) NOT NULL DEFAULT 'UNKNOWN',
                "notes" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_choice_list_items_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "UQ_choice_list_items_list_seat"
            ON "choice_list_items" ("choiceListId", "collegeSeatId")
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_choice_list_items_choiceListId" ON "choice_list_items" ("choiceListId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_choice_list_items_collegeSeatId" ON "choice_list_items" ("collegeSeatId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_choice_list_items_priorityOrder" ON "choice_list_items" ("priorityOrder")`);

        await queryRunner.query(`
            ALTER TABLE "choice_list_items"
            ADD CONSTRAINT "FK_choice_list_items_choiceListId"
            FOREIGN KEY ("choiceListId") REFERENCES "choice_lists"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "choice_list_items"
            ADD CONSTRAINT "FK_choice_list_items_collegeSeatId"
            FOREIGN KEY ("collegeSeatId") REFERENCES "college_seats"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "choice_list_items"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "choice_lists"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "closing_ranks"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "college_seats"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "colleges"`);
    }
}
