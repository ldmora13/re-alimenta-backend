import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

const DEFAULT_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'RESOURCE_NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  500: 'INTERNAL_SERVER_ERROR',
};

interface HttpErrorBody {
  message?: string | string[];
  code?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const body: HttpErrorBody =
        typeof response === 'string' ? { message: response } : (response as HttpErrorBody);

      reply.status(status).send({
        statusCode: status,
        message: body.message ?? exception.message,
        code: body.code ?? DEFAULT_CODES[status] ?? 'HTTP_ERROR',
        timestamp,
      });
      return;
    }

    this.logger.error(
      `Unhandled exception: ${exception instanceof Error ? exception.message : 'unknown error'}`,
    );
    reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp,
    });
  }
}
