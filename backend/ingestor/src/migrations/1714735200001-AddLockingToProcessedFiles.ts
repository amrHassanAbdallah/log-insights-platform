import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLockingToProcessedFiles1714735200001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, add the version column with a default value
    await queryRunner.query(`
      ALTER TABLE processed_files
      ADD COLUMN version integer NOT NULL DEFAULT 1
    `);

    // Then update any existing records to have version 1
    await queryRunner.query(`
      UPDATE processed_files
      SET version = 1
      WHERE version IS NULL
    `);

    // Add unique constraint on s3Key and bucket
    await queryRunner.query(`
      ALTER TABLE processed_files
      ADD CONSTRAINT unique_s3_key_bucket UNIQUE (s3_key, bucket)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove unique constraint
    await queryRunner.query(`
      ALTER TABLE processed_files
      DROP CONSTRAINT unique_s3_key_bucket
    `);

    // Remove version column
    await queryRunner.query(`
      ALTER TABLE processed_files
      DROP COLUMN version
    `);
  }
} 