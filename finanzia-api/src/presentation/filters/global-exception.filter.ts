import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UserAlreadyExistsException } from '../../core/domain/exceptions/user-already-exists.exception';
import { InvalidCredentialsException } from '../../core/domain/exceptions/invalid-credentials.exception';
import { UserNotFoundException } from '../../core/domain/exceptions/user-not-found.exception';
import { AccountNotFoundException } from '../../core/domain/exceptions/account-not-found.exception';
import { UnauthorizedAccountAccessException } from '../../core/domain/exceptions/unauthorized-account-access.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Ha ocurrido un error interno inesperado en el servidor';
    let errors: any[] | undefined = undefined;

    if (exception instanceof UserAlreadyExistsException) {
      status = HttpStatus.CONFLICT;
      errorCode = 'USER_ALREADY_EXISTS';
      message = exception.message;
    } else if (exception instanceof InvalidCredentialsException) {
      status = HttpStatus.UNAUTHORIZED;
      errorCode = 'INVALID_CREDENTIALS';
      message = exception.message;
    } else if (exception instanceof UserNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      errorCode = 'USER_NOT_FOUND';
      message = exception.message;
    } else if (exception instanceof AccountNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      errorCode = 'ACCOUNT_NOT_FOUND';
      message = exception.message;
    } else if (exception instanceof UnauthorizedAccountAccessException) {
      status = HttpStatus.FORBIDDEN;
      errorCode = 'UNAUTHORIZED_ACCOUNT_ACCESS';
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const anyRes = res as any;
        message = Array.isArray(anyRes.message)
          ? anyRes.message.join(', ')
          : anyRes.message || exception.message;
        errorCode = anyRes.error || exception.name;
        if (Array.isArray(anyRes.message)) {
          errors = anyRes.message.map((msg: string) => ({ issue: msg }));
        }
      } else {
        message = exception.message;
        errorCode = exception.name;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Error no controlado: ${exception.message}`, exception.stack);
      message = exception.message;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      errorCode,
      message,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
