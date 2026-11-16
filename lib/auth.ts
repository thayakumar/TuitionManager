import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { execute, queryOne, withTransaction } from "./db";
import crypto from "crypto";

const COOKIE_NAME = "admin_session";
const STUDENT_COOKIE = "student_session";
const SESSION_EXPIRY_DAYS = 7;
const tokenPattern = /^[a-f0-9]{64}$/;
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * SESSION_EXPIRY_DAYS,
};
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function verifyAdminSession(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || !tokenPattern.test(token)) return false;
  return !!(await queryOne<{ id: number }>(
    "SELECT id FROM admin_sessions WHERE token=? AND expires_at>datetime('now')",
    [token],
  ));
}

export async function isAdminRequest(): Promise<boolean> {
  return verifyAdminSession();
}

export async function requireAdmin(): Promise<void> {
  if (!(await verifyAdminSession())) throw new Error("Unauthorized");
}

// Every administrator read entry calls this guard before its private queries.
// Middleware's cookie-presence shortcut is navigation UX, never authorization.
export async function requireAdminPage(): Promise<void> {
  if (!(await verifyAdminSession())) redirect("/portal/admin");
}

export async function requireStudent(expectedId: number): Promise<void> {
  if (
    !Number.isSafeInteger(expectedId) ||
    expectedId < 1 ||
    (await getStudentSession()) !== expectedId
  ) {
    throw new Error("Unauthorized");
  }
}

export async function requireStudentPage(expectedId: number): Promise<void> {
  if (
    !Number.isSafeInteger(expectedId) ||
    expectedId < 1 ||
    (await getStudentSession()) !== expectedId
  ) {
    redirect("/portal/student");
  }
}

export async function createAdminSession(): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await execute(
    "INSERT INTO admin_sessions(token,expires_at) VALUES (?,datetime('now','+7 days'))",
    [token],
  );
  (await cookies()).set(COOKIE_NAME, token, cookieOptions);
  return token;
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token && tokenPattern.test(token))
    await execute("DELETE FROM admin_sessions WHERE token=?", [token]);
  cookieStore.delete(COOKIE_NAME);
}

export async function createStudentSession(studentId: number): Promise<void> {
  if (!Number.isSafeInteger(studentId) || studentId < 1)
    throw new Error("Unauthorized");
  const token = crypto.randomBytes(32).toString("hex");
  await withTransaction(async (tx) => {
    const student = await tx.execute({
      sql: "SELECT id FROM students WHERE id=? AND active=1",
      args: [studentId],
    });
    if (!student.rows.length) throw new Error("Student access is inactive");
    // Preserve the existing single-current-student-session behavior, with a
    // server expiry and a hashed bearer token instead of a settings-table token.
    await tx.execute({
      sql: "DELETE FROM student_sessions WHERE student_id=?",
      args: [studentId],
    });
    await tx.execute({
      sql: "INSERT INTO student_sessions(student_id,token,expires_at) VALUES (?,?,datetime('now','+7 days'))",
      args: [studentId, hashToken(token)],
    });
  });
  (await cookies()).set(STUDENT_COOKIE, token, cookieOptions);
}

export async function getStudentSession(): Promise<number | null> {
  const token = (await cookies()).get(STUDENT_COOKIE)?.value;
  if (!token || !tokenPattern.test(token)) return null;
  const session = await queryOne<{ student_id: number }>(
    `SELECT ss.student_id FROM student_sessions ss JOIN students s ON s.id=ss.student_id
     WHERE ss.token=? AND ss.expires_at>datetime('now') AND s.active=1`,
    [hashToken(token)],
  );
  return session?.student_id ?? null;
}

export async function destroyStudentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_COOKIE)?.value;
  if (token && tokenPattern.test(token))
    await execute("DELETE FROM student_sessions WHERE token=?", [
      hashToken(token),
    ]);
  cookieStore.delete(STUDENT_COOKIE);
}
