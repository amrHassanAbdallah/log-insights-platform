import { Injectable, LoggerService, Scope } from '@nestjs/common';

interface LogMessage {
  timestamp: string;
  level: string;
  context?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLogger implements LoggerService {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  setContext(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, metadata?: Record<string, unknown>): string {
    const logMessage: LogMessage = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (this.context) {
      logMessage.context = this.context;
    }

    if (metadata) {
      logMessage.metadata = metadata;
    }

    return JSON.stringify(logMessage);
  }

  log(message: string, metadata?: Record<string, unknown>) {
    console.log(this.formatMessage('info', message, metadata));
  }

  error(message: string, trace?: string, metadata?: Record<string, unknown>) {
    const errorMetadata = {
      ...metadata,
      trace,
    };
    console.error(this.formatMessage('error', message, errorMetadata));
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    console.warn(this.formatMessage('warn', message, metadata));
  }

  debug(message: string, metadata?: Record<string, unknown>) {
    console.debug(this.formatMessage('debug', message, metadata));
  }

  verbose(message: string, metadata?: Record<string, unknown>) {
    console.log(this.formatMessage('verbose', message, metadata));
  }
} 