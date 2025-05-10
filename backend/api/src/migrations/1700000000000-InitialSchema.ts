import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable TimescaleDB extension
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;`);

        // Create the logs table with composite primary key
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS logs (
                id VARCHAR NOT NULL,
                timestamp TIMESTAMPTZ NOT NULL,
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
                "rawData" JSONB NOT NULL,
                PRIMARY KEY (timestamp, id)
            );
        `);

        // Convert the table to a hypertable
        await queryRunner.query(`
            SELECT create_hypertable('logs', 'timestamp', 
                if_not_exists => TRUE,
                migrate_data => TRUE,
                chunk_time_interval => INTERVAL '1 day'
            );
        `);

        // Create indexes (including timestamp in composite indexes)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_logs_timestamp_context" ON logs (timestamp, context);
            CREATE INDEX IF NOT EXISTS "IDX_logs_context_timestamp" ON logs (context, timestamp);
            CREATE INDEX IF NOT EXISTS "IDX_logs_authUserId_timestamp" ON logs ("authUserId", timestamp);
            CREATE INDEX IF NOT EXISTS "IDX_logs_processingTimeMs_timestamp" ON logs ("processingTimeMs", timestamp);
        `);

        // // Create a continuous aggregate for hourly statistics
        // await queryRunner.query(`
        //     CREATE MATERIALIZED VIEW IF NOT EXISTS logs_hourly_stats
        //     WITH (timescaledb.continuous) AS
        //     SELECT
        //         time_bucket('1 hour', timestamp) AS bucket,
        //         context,
        //         count(*) as request_count,
        //         avg("processingTimeMs") as avg_processing_time,
        //         min("processingTimeMs") as min_processing_time,
        //         max("processingTimeMs") as max_processing_time
        //     FROM logs
        //     GROUP BY bucket, context
        //     WITH NO DATA;
        // `);

        // // Create a policy to refresh the continuous aggregate
        // await queryRunner.query(`
        //     SELECT add_continuous_aggregate_policy('logs_hourly_stats',
        //         start_offset => INTERVAL '1 day',
        //         end_offset => INTERVAL '1 hour',
        //         schedule_interval => INTERVAL '1 hour'
        //     );
        // `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP MATERIALIZED VIEW IF EXISTS logs_hourly_stats;
            DROP TABLE IF EXISTS logs;
        `);
    }
} 