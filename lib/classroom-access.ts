import { DomainError } from "./action-errors";
import { verifyAdminSession, getStudentSession } from "./auth";
import { queryOne } from "./db";
export class ClassroomAccessError extends DomainError {
  constructor(status: number, message: string) {
    super(status, message);
  }
}
export async function classroomAccess(
  postId: number,
  adminOnly = false,
  preferStudent = false,
) {
  if (!Number.isSafeInteger(postId) || postId < 1)
    throw new ClassroomAccessError(404, "Post not found");
  const admin = !preferStudent && (await verifyAdminSession());
  const studentId = admin ? null : await getStudentSession();
  if (!admin && (!studentId || adminOnly))
    throw new ClassroomAccessError(401, "Sign in to open this classroom");
  const post = await queryOne<{ student_id: number; title: string }>(
    "SELECT p.student_id,p.title FROM posts p JOIN students s ON s.id=p.student_id WHERE p.id=? AND (?=1 OR (p.student_id=? AND s.active=1))",
    [postId, admin ? 1 : 0, studentId ?? 0],
  );
  if (!post) throw new ClassroomAccessError(404, "Post not found");
  return { admin, studentId, post };
}
