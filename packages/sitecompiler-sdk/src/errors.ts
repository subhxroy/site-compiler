export class SiteCompilerError extends Error {
  public status?: number;
  public details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'SiteCompilerError';
    this.status = status;
    this.details = details;
  }
}

export class AuthenticationError extends SiteCompilerError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class PaymentRequiredError extends SiteCompilerError {
  constructor(message: string = 'Export pending payment approval') {
    super(message, 403);
    this.name = 'PaymentRequiredError';
  }
}

export class JobNotFoundError extends SiteCompilerError {
  constructor(jobId: string) {
    super(`Job with id ${jobId} not found`, 404);
    this.name = 'JobNotFoundError';
  }
}

export class TimeoutError extends SiteCompilerError {
  constructor(message: string = 'Job polling timed out') {
    super(message, 408);
    this.name = 'TimeoutError';
  }
}
