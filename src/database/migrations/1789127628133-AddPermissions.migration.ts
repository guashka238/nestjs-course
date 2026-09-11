import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPermissions1789127628133 implements MigrationInterface {
  name = 'AddPermissions1789127628133';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_role_enum" AS ENUM('user', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role" "public"."role_permissions_role_enum" NOT NULL, "permissionId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_06792d0c62ce6b0203c03643cd" ON "role_permissions" ("permissionId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_960cb22301f2d35aac0448d668" ON "role_permissions" ("role", "permissionId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_48ce552495d14eae9b187bb6716" UNIQUE ("name"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_960cb22301f2d35aac0448d668"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_06792d0c62ce6b0203c03643cd"`,
    );
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TYPE "public"."role_permissions_role_enum"`);
  }
}
