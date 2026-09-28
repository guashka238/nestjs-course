import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceTransformationJobsWithTransformations1790168937683 implements MigrationInterface {
  name = 'ReplaceTransformationJobsWithTransformations1790168937683';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6cd51299079c37dfd613a5f3c8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_54254deaeb46757398e2a439e5"`,
    );
    await queryRunner.query(`DROP TABLE "transformation_jobs"`);
    await queryRunner.query(
      `DROP TYPE "public"."transformation_jobs_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."transformation_jobs_category_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transformations_type_enum" AS ENUM('file', 'image')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transformations_sourceformat_enum" AS ENUM('csv', 'json', 'xml', 'yaml', 'png', 'jpeg', 'svg')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transformations_targetformat_enum" AS ENUM('csv', 'json', 'xml', 'yaml', 'png', 'jpeg', 'svg')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transformations_status_enum" AS ENUM('success', 'error')`,
    );
    await queryRunner.query(
      `CREATE TABLE "transformations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "type" "public"."transformations_type_enum" NOT NULL, "sourceFormat" "public"."transformations_sourceformat_enum" NOT NULL, "targetFormat" "public"."transformations_targetformat_enum" NOT NULL, "status" "public"."transformations_status_enum" NOT NULL, "sourceFileName" character varying NOT NULL, "fileSize" integer NOT NULL, "durationMs" integer NOT NULL, "errorCode" character varying, "resultFileId" character varying, "resultSizeBytes" integer, "expiresAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_64d8104dbdd72b30b53702035dd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_454e79dce72142f65b5fe4dde9" ON "transformations" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_199c7ac26ed8baf63844044441" ON "transformations" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3cf440a272f65d75384aec88e0" ON "transformations" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0696d3029b5a8234562615f750" ON "transformations" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_771e9ec2492133674e9a0e408d" ON "transformations" ("userId", "createdAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_771e9ec2492133674e9a0e408d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0696d3029b5a8234562615f750"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3cf440a272f65d75384aec88e0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_199c7ac26ed8baf63844044441"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_454e79dce72142f65b5fe4dde9"`,
    );
    await queryRunner.query(`DROP TABLE "transformations"`);
    await queryRunner.query(`DROP TYPE "public"."transformations_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."transformations_targetformat_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."transformations_sourceformat_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."transformations_type_enum"`);
    await queryRunner.query(
      `CREATE TYPE "public"."transformation_jobs_category_enum" AS ENUM('text', 'image')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transformation_jobs_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "transformation_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "category" "public"."transformation_jobs_category_enum" NOT NULL, "sourceFormat" character varying NOT NULL, "targetFormat" character varying NOT NULL, "status" "public"."transformation_jobs_status_enum" NOT NULL DEFAULT 'pending', "sourceFileName" character varying NOT NULL, "sourceSizeBytes" integer NOT NULL, "resultFilePath" character varying, "resultSizeBytes" integer, "errorMessage" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5127dc942df0014ca7c7515528d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_54254deaeb46757398e2a439e5" ON "transformation_jobs" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6cd51299079c37dfd613a5f3c8" ON "transformation_jobs" ("userId", "createdAt") `,
    );
  }
}
