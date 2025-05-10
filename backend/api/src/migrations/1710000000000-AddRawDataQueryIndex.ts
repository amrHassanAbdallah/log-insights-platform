import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRawDataQueryIndex1710000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_rawdata_query 
            ON logs USING GIN ((rawData->'query'));
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_rawdata_query;
        `);
    }
} 