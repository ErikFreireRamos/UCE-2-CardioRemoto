/** Erros de aplicação com formato de resposta consistente { error: { code, message, details } }. */

export type ErrorDetails = Record<string, unknown> | undefined;

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: ErrorDetails;

  constructor(statusCode: number, code: string, message: string, details?: ErrorDetails) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado', details?: ErrorDetails) {
    super(401, 'UNAUTHORIZED', message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado', details?: ErrorDetails) {
    super(403, 'FORBIDDEN', message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado', details?: ErrorDetails) {
    super(404, 'NOT_FOUND', message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(409, 'CONFLICT', message, details);
  }
}

/** 422 — entidade não processável (ex.: visita sem nenhum campo). */
export class UnprocessableEntityError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(422, 'UNPROCESSABLE_ENTITY', message, details);
  }
}

export class LockedError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(423, 'LOCKED', message, details);
  }
}
