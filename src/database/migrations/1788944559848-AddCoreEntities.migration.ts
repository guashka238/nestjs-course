import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoreEntities1788944559848 implements MigrationInterface {
  name = 'AddCoreEntities1788944559848';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'user', "isEmailVerified" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."verification_tokens_type_enum" AS ENUM('email_verification', 'password_reset')`,
    );
    await queryRunner.query(
      `CREATE TABLE "verification_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "tokenHash" character varying NOT NULL, "type" "public"."verification_tokens_type_enum" NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f2d4d7a2aa57ef199e61567db22" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8eb720a87e85b20fdfc69c3826" ON "verification_tokens" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "tokenHash" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON "refresh_tokens" ("userId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_610102b60fea1455310ccd299d"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8eb720a87e85b20fdfc69c3826"`,
    );
    await queryRunner.query(`DROP TABLE "verification_tokens"`);
    await queryRunner.query(
      `DROP TYPE "public"."verification_tokens_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
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
  }
}
