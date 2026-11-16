import { ActionValidationError } from "../action-errors";
export function id(value: unknown, label = "Record"): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result <= 0)
    throw new ActionValidationError(`${label} is invalid`);
  return result;
}
export function numberIn(
  value: unknown,
  min: number,
  max: number,
  label: string,
  integer = false,
): number {
  const n = Number(value);
  if (
    !Number.isFinite(n) ||
    n < min ||
    n > max ||
    (integer && !Number.isInteger(n))
  )
    throw new ActionValidationError(`${label} must be ${min}–${max}`);
  return n;
}
export function text(
  value: unknown,
  label: string,
  max = 10000,
  required = false,
): string {
  const s = String(value ?? "").trim();
  if ((required && !s) || s.length > max)
    throw new ActionValidationError(
      `${label} ${!s ? "is required" : "is too long"}`,
    );
  return s;
}
export function oneOf<T extends string>(
  value: unknown,
  choices: readonly T[],
  label: string,
): T {
  if (!choices.includes(value as T))
    throw new ActionValidationError(`${label} is invalid`);
  return value as T;
}
export function safeUrl(value: unknown): string | null {
  const s = text(value, "File URL", 2048);
  if (!s) return null;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new ActionValidationError("Enter a complete HTTPS file URL");
  }
  if (u.protocol !== "https:")
    throw new ActionValidationError("File URL must use HTTPS");
  if (u.username || u.password)
    throw new ActionValidationError("File URL must not include credentials");
  return u.toString();
}
