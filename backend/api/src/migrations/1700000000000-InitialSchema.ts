import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS logs (
                id VARCHAR PRIMARY KEY,
                timestamp TIMESTAMP NOT NULL,
                level VARCHAR,
                method VARCHAR NOT NULL,
                url VARCHAR NOT NULL,
                query VARCHAR,
                headers JSONB NOT NULL,
                context VARCHAR NOT NULL,
                message VARCHAR NOT NULL,
                "authUserId" INTEGER,
                "remoteAddress" VARCHAR NOT NULL,
                "remotePort" INTEGER NOT NULL,
                "processingTimeMs" INTEGER,
                params JSONB,
                "rawData" JSONB NOT NULL
            );

            CREATE INDEX IF NOT EXISTS "IDX_logs_timestamp_context" ON logs (timestamp, context);
            CREATE INDEX IF NOT EXISTS "IDX_logs_timestamp" ON logs (timestamp);
            CREATE INDEX IF NOT EXISTS "IDX_logs_context" ON logs (context);
            CREATE INDEX IF NOT EXISTS "IDX_logs_authUserId" ON logs ("authUserId");
            CREATE INDEX IF NOT EXISTS "IDX_logs_processingTimeMs" ON logs ("processingTimeMs");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS logs;
        `);
    }
} 