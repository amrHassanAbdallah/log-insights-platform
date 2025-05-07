import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GraphQLError } from 'graphql';

@Catch()
export class ErrorHandlerMiddleware implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const type = host.getType();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      message:
        exception instanceof Error
          ? exception.message
          : 'Internal server error',
    };

    if (type === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();

      const httpErrorResponse = {
        ...errorResponse,
        path: request?.url || 'unknown',
        method: request?.method || 'unknown',
        error:
          exception instanceof HttpException
            ? exception.getResponse()
            : 'Internal server error',
      };

      if (process.env.NODE_ENV !== 'production') {
        console.error('HTTP Error:', {
          ...httpErrorResponse,
          stack: exception instanceof Error ? exception.stack : undefined,
        });
      }

      response.status(status).json(httpErrorResponse);
    } else {
      // For GraphQL errors
      if (process.env.NODE_ENV !== 'production') {
        console.error('GraphQL Error:', {
          ...errorResponse,
          stack: exception instanceof Error ? exception.stack : undefined,
        });
      }

      // For GraphQL errors, we don't need to access request properties
      return new GraphQLError(errorResponse.message, {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: status,
          timestamp: errorResponse.timestamp,
        },
      });
    }
  }
}
