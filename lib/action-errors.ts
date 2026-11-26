/** Only deliberate, non-sensitive business errors are safe to show to a user. */
const PREFIX = "TUITION_VALIDATION:";

export class DomainError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ActionValidationError extends DomainError {
  readonly digest: string;
  constructor(message: string) {
    super(400, message);
    this.name = "ActionValidationError";
    this.digest = PREFIX + encodeURIComponent(message);
  }
}

export function actionError(
  error: unknown,
  fallback = "The change could not be saved. Please try again.",
): string {
  if (error && typeof error === "object") {
    const digest = "digest" in error ? String(error.digest) : "";
    if (digest.startsWith(PREFIX)) {
      try {
        return decodeURIComponent(digest.slice(PREFIX.length));
      } catch {
        return fallback;
      }
    }
    // Direct client validation is not serialized by a Server Action.
    if (error instanceof ActionValidationError) return error.message;
  }
  return fallback;
}
