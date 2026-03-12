export type ErrorCode =
  | "NETWORK"
  | "AUTH"
  | "CONSENT_REQUIRED"
  | "VALIDATION"
  | "NOT_FOUND"
  | "UNKNOWN";

export class AppError extends Error {
  code: ErrorCode;
  userMessage: string;
  details?: string;
  constructor(code: ErrorCode, userMessage: string, details?: string) {
    super(userMessage);
    this.code = code;
    this.userMessage = userMessage;
    this.details = details;
  }
}

export function toAppError(err: unknown, fallback = "Something went wrong."): AppError {
  if (err instanceof AppError) return err;
  const msg = (err as any)?.message ? String((err as any).message) : fallback;
  if (msg.toLowerCase().includes("unauthorized")) return new AppError("AUTH", "You are not authorized.", msg);
  if (msg.toLowerCase().includes("consent")) return new AppError("CONSENT_REQUIRED", "Consent is required first.", msg);
  if (msg.toLowerCase().includes("network")) return new AppError("NETWORK", "Network unavailable. Try again.", msg);
  return new AppError("UNKNOWN", fallback, msg);
}
