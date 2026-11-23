import { queryAll, queryOne } from "./db";
import type {
  CurrentSubmission,
  Post,
  PostAttachment,
  SubmissionAttempt,
} from "./types";

export type PostWork = {
  post: Post;
  attachments: PostAttachment[];
  submission: CurrentSubmission | undefined;
  attempts: SubmissionAttempt[];
  acceptsWork: boolean;
};

type WorkRow = CurrentSubmission & { kind: number; max_points: number | null };

/**
 * Caller establishes its role/session first. This read module owns the student
 * scope and loads projection + lineage in one statement, so a concurrent new
 * attempt cannot splice two different submission revisions into one view.
 */
export async function loadPostWork(studentId: number, postId: number): Promise<PostWork | null> {
  if (![studentId, postId].every(value => Number.isSafeInteger(value) && value > 0)) return null;
  const post = await queryOne<Post>(
    `SELECT p.id,p.type,p.title,p.body,p.student_id,p.due_at,p.topic_id,p.max_points,
            p.created_at,p.updated_at,p.sort_order
     FROM posts p JOIN students s ON s.id=p.student_id AND s.active=1
     WHERE p.id=? AND p.student_id=?`,
    [postId, studentId],
  );
  if (!post) return null;
  const acceptsWork = post.type === "assignment" || post.type === "quiz";
  const [attachments, rows] = await Promise.all([
    queryAll<PostAttachment>(
      "SELECT id,post_id,file_name,file_url,file_type FROM post_attachments WHERE post_id=? ORDER BY id",
      [postId],
    ),
    // A UNION keeps the current rich-text body from repeating on every history row.
    acceptsWork ? queryAll<WorkRow>(
      `WITH current_submission AS (
         SELECT id,post_id,student_id,content,file_url,grade,feedback,submitted_at,graded_at,version
         FROM submissions WHERE post_id=? AND student_id=?
         ORDER BY julianday(submitted_at) DESC,id DESC LIMIT 1
       )
       SELECT 0 AS kind,s.id,s.post_id,s.student_id,s.content,s.file_url,s.grade,s.feedback,
              s.submitted_at,s.graded_at,s.version,NULL AS max_points
       FROM current_submission s
       UNION ALL
       SELECT 1 AS kind,s.id,s.post_id,s.student_id,v.content,v.file_url,v.grade,v.feedback,
              v.submitted_at,v.graded_at,v.version,v.max_points
       FROM current_submission s JOIN submission_versions v ON v.submission_id=s.id
       ORDER BY kind,version DESC`,
      [postId, studentId],
    ) : Promise.resolve([] as WorkRow[]),
  ]);

  const current = rows[0];
  if (!current) return { post, attachments, acceptsWork, submission: undefined, attempts: [] };
  const attempts: SubmissionAttempt[] = rows
    .filter(row => row.kind === 1)
    .map(row => ({
      version: row.version,
      content: row.content,
      file_url: row.file_url,
      grade: row.grade,
      feedback: row.feedback,
      submitted_at: row.submitted_at,
      graded_at: row.graded_at,
      max_points: row.max_points,
    }));
  const latestAttempt = attempts.find(attempt => attempt.version === current.version);
  const submission: CurrentSubmission = {
    id: current.id,
    post_id: current.post_id,
    student_id: current.student_id,
    version: current.version,
    content: current.content,
    file_url: current.file_url,
    grade: current.grade,
    feedback: current.feedback,
    submitted_at: current.submitted_at,
    graded_at: current.graded_at,
    ...(latestAttempt ? { max_points: latestAttempt.max_points } : {}),
  };
  return { post, attachments, acceptsWork, submission, attempts };
}
