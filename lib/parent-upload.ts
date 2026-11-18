import { createHash } from "crypto";
import { queryOne } from "./db";
/** Parent links remain revocable bearer credentials; never trust a student id from the client. */
export async function parentUploadIdentity(token: string | null) {
  if (!token || token.length > 512) return null;
  const row = await queryOne<{ student_id: number }>(
    "SELECT student_id FROM share_tokens WHERE token=? AND active=1",
    [token],
  );
  return row ? { studentId: Number(row.student_id), parentTokenHash: createHash('sha256').update(token).digest('hex') } : null;
}
