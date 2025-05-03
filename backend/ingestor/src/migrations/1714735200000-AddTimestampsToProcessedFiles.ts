import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimestampsToProcessedFiles1714735200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE processed_files
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE processed_files
      DROP COLUMN IF EXISTS "createdAt",
      DROP COLUMN IF EXISTS "updatedAt";
    `);
  }
} 