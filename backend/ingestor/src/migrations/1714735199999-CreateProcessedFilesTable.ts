import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProcessedFilesTable1714735199999 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the processed_files table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS processed_files (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "s3Key" VARCHAR NOT NULL,
                bucket VARCHAR NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'pending',
                "processedAt" TIMESTAMP,
                metadata JSONB,
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                version INTEGER NOT NULL DEFAULT 1
            );

            -- Create unique constraint on s3Key and bucket
            ALTER TABLE processed_files
            ADD CONSTRAINT unique_s3_key_bucket UNIQUE ("s3Key", bucket);

            -- Create index on status for faster queries
            CREATE INDEX IF NOT EXISTS idx_processed_files_status ON processed_files (status);

            -- Create index on processedAt for faster queries
            CREATE INDEX IF NOT EXISTS idx_processed_files_processed_at ON processed_files ("processedAt");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS processed_files;
        `);
    }
} 