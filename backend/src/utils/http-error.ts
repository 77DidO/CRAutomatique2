import type { HttpError } from '../types/index.js';

export function createHttpError(status: number, message: string, details?: unknown): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  if (typeof details !== 'undefined') {
    error.details = details;
  }
  return error;
}
