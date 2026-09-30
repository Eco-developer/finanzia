import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { UserAlreadyExistsException } from "../../core/domain/exceptions/user-already-exists.exception";
import { InvalidCredentialsException } from "../../core/domain/exceptions/invalid-credentials.exception";
import { UserNotFoundException } from "../../core/domain/exceptions/user-not-found.exception";
import { AccountNotFoundException } from "../../core/domain/exceptions/account-not-found.exception";
import { UnauthorizedAccountAccessException } from "../../core/domain/exceptions/unauthorized-account-access.exception";
import { CategoryNotFoundException } from "../../core/domain/exceptions/category-not-found.exception";
import { UnauthorizedCategoryAccessException } from "../../core/domain/exceptions/unauthorized-category-access.exception";
import { ParentCategoryNotFoundException } from "../../core/domain/exceptions/parent-category-not-found.exception";
import { TransactionNotFoundException } from "../../core/domain/exceptions/transaction-not-found.exception";
import { UnauthorizedTransactionAccessException } from "../../core/domain/exceptions/unauthorized-transaction-access.exception";
import { InvalidTransactionAmountException } from "../../core/domain/exceptions/invalid-transaction-amount.exception";
import { InvalidTransferException } from "../../core/domain/exceptions/invalid-transfer.exception";
import { EmailNotVerifiedException } from "../../core/domain/exceptions/email-not-verified.exception";
import { InvalidVerificationTokenException } from "../../core/domain/exceptions/invalid-verification-token.exception";
import { DebtNotFoundException } from "../../core/domain/exceptions/debt-not-found.exception";
import { UnauthorizedDebtAccessException } from "../../core/domain/exceptions/unauthorized-debt-access.exception";
import { ImmutableDebtException } from "../../core/domain/exceptions/immutable-debt.exception";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = "INTERNAL_SERVER_ERROR";
    let message = "Ha ocurrido un error interno inesperado en el servidor";
    let errors: any[] | undefined = undefined;

    if (exception instanceof EmailNotVerifiedException) {
      status = HttpStatus.FORBIDDEN;
      errorCode = "EMAIL_NOT_VERIFIED";
      message = exception.message;
      errors = [{ field: "email", message: exception.email }];
    } else if (exception instanceof InvalidVerificationTokenException) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = "INVALID_VERIFICATION_TOKEN";
      message = exception.message;
    } else if (exception instanceof UserAlreadyExistsException) {
      status = HttpStatus.CONFLICT;
      errorCode = "USER_ALREADY_EXISTS";
      message = exception.message;
    } else if (exception instanceof InvalidCredentialsException) {
      status = HttpStatus.UNAUTHORIZED;
      errorCode = "INVALID_CREDENTIALS";
      message = exception.message;
    } else if (exception instanceof UserNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      errorCode = "USER_NOT_FOUND";
      message = exception.message;
    } else if (exception instanceof AccountNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      errorCode = "ACCOUNT_NOT_FOUND";
      message = exception.message;
    } else if (exception instanceof UnauthorizedAccountAccessException) {
      status = HttpStatus.FORBIDDEN;
      errorCode = "UNAUTHORIZED_ACCOUNT_ACCESS";
      message = exception.message;
    } else if (exception instanceof CategoryNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      errorCode = "CATEGORY_NOT_FOUND";
      message = exception.message;
    } else if (exception instanceof ParentCategoryNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      errorCode = "PARENT_CATEGORY_NOT_FOUND";
      message = exception.message;
    } else if (exception instanceof UnauthorizedCategoryAccessException) {
      status = HttpStatus.FORBIDDEN;
      errorCode = "UNAUTHORIZED_CATEGORY_ACCESS";
      message = exception.message;
    } else if (exception instanceof TransactionNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      errorCode = "TRANSACTION_NOT_FOUND";
      message = exception.message;
    } else if (exception instanceof UnauthorizedTransactionAccessException) {
      status = HttpStatus.FORBIDDEN;
      errorCode = "UNAUTHORIZED_TRANSACTION_ACCESS";
      message = exception.message;
    } else if (exception instanceof InvalidTransactionAmountException) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = "INVALID_TRANSACTION_AMOUNT";
      message = exception.message;
    } else if (exception instanceof InvalidTransferException) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = "INVALID_TRANSFER";
      message = exception.message;
    } else if (exception instanceof DebtNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      errorCode = "DEBT_NOT_FOUND";
      message = exception.message;
    } else if (exception instanceof UnauthorizedDebtAccessException) {
      status = HttpStatus.FORBIDDEN;
      errorCode = "UNAUTHORIZED_DEBT_ACCESS";
      message = exception.message;
    } else if (exception instanceof ImmutableDebtException) {
      status = HttpStatus.FORBIDDEN;
      errorCode = "IMMUTABLE_DEBT";
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "object" && res !== null) {
        const anyRes = res as any;
        message = Array.isArray(anyRes.message)
          ? anyRes.message.join(", ")
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
      this.logger.error(
        `Error no controlado: ${exception.message}`,
        exception.stack,
      );
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
