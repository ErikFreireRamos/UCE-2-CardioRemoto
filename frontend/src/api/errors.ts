export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;
  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
  /** Falha de rede (offline / backend inacessível) — tratada como "fica pendente", não erro de negócio. */
  static network(): ApiError {
    return new ApiError(0, { code: 'NETWORK', message: 'Sem conexão com o servidor' });
  }
  get isNetwork() {
    return this.code === 'NETWORK';
  }
}
