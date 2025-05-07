import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { CustomLogger } from '../services/logger.service';

interface GraphQLRequestBody {
  operationName?: string;
  query?: string;
  variables?: Record<string, unknown>;
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new CustomLogger('HTTP');

  use = (request: Request, response: Response, next: NextFunction): void => {
    const { method, originalUrl } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // Check if this is a GraphQL request
    const isGraphQL = originalUrl.includes('/graphql');
    let operationInfo = '';

    if (isGraphQL && request.body) {
      const body = request.body as GraphQLRequestBody;
      if (body.operationName) {
        operationInfo = `[GraphQL: ${body.operationName}]`;
      } else if (typeof body.query === 'string') {
        // Extract the first operation name from the query if no operationName is provided
        const match = body.query.match(/^\s*(?:query|mutation)\s+(\w+)/);
        if (match && match[1]) {
          operationInfo = `[GraphQL: ${match[1]}]`;
        }
      }
    }

    response.on('finish', () => {
      const { statusCode } = response;
      const contentLength = response.get('content-length');
      const duration = Date.now() - startTime;

      const metadata: Record<string, unknown> = {
        method,
        url: originalUrl,
        statusCode,
        contentLength,
        userAgent,
        duration,
      };

      if (operationInfo) {
        metadata.operationInfo = operationInfo;
      }

      this.logger.log('Request completed', metadata);
    });

    next();
  };
}
