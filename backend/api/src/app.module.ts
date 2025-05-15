import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Request, Response } from 'express';
import { join } from 'path';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';
import { ErrorHandlerMiddleware } from './common/middleware/error-handler.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { dataSourceOptions } from './data-source';
import { MetricsModule } from './metrics/metrics.module';
import { SearchModule } from '@/search/search.module';

interface GraphQLError {
  message: string;
  extensions?: {
    code?: string;
    originalError?: {
      message: string;
      error?: string;
    };
  };
}

interface GraphQLContext {
  req: Request;
  res: Response;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 10,
      },
    ]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      introspection: true,
      buildSchemaOptions: {
        numberScalarMode: 'integer',
        dateScalarMode: 'timestamp',
      },
      context: ({ req, res }: GraphQLContext) => ({ req, res }),
      formatError: (error: GraphQLError) => {
        const originalError = error.extensions?.originalError;
        if (!originalError) {
          console.log(error);
          return {
            message: error.message,
            code: error.extensions?.code,
          };
        }
        return {
          message: originalError.message,
          code: error.extensions?.code,
          details: originalError.error,
        };
      },
    }),
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      migrationsRun: process.env.NODE_ENV === 'production',
    }),
    MetricsModule,
    SearchModule
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ErrorHandlerMiddleware,
    },
    RequestLoggerMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
