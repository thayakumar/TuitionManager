import { DomainError } from "./action-errors";
import { getStudentSession, verifyAdminSession } from "./auth";
import { queryOne, withTransaction } from "./db";
import type { Transaction } from "@libsql/client";

export const MAX_WHITEBOARD_BYTES = 1024 * 1024;
export type WhiteboardSnapshot = {
  data: Record<string, unknown> | null;
  revision: number;
  updatedAt: string | null;
};
export class WhiteboardError extends DomainError {
  constructor(
    status: number,
    message: string,
    public current?: WhiteboardSnapshot,
  ) {
    super(status, message);
  }
}
type Actor = { admin: boolean; studentId: number | null };
type BoardRow = { data: string; revision: number; updated_at: string };

function classId(boardId: string): number | null {
  if (boardId === "personal") return null;
  const match = /^class-([1-9]\d*)$/.exec(boardId);
  const value = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(value))
    throw new WhiteboardError(404, "Whiteboard not found");
  return value;
}
async function caller(): Promise<Actor> {
  const admin = await verifyAdminSession();
  const studentId = admin ? null : await getStudentSession();
  if (!admin && !studentId)
    throw new WhiteboardError(401, "Sign in to use this whiteboard");
  return { admin, studentId };
}
async function authorize(actor: Actor, cid: number | null, tx?: Transaction) {
  if (cid === null) {
    if (!actor.admin)
      throw new WhiteboardError(403, "This whiteboard is for your tutor");
    return;
  }
  const sql =
    "SELECT c.student_id,s.active FROM classes c JOIN students s ON s.id=c.student_id WHERE c.id=?";
  const lesson = tx
    ? (await tx.execute({ sql, args: [cid] })).rows[0]
    : await queryOne<{ student_id: number; active: number }>(sql, [cid]);
  if (
    !lesson ||
    (!actor.admin &&
      (lesson.student_id !== actor.studentId || lesson.active !== 1))
  )
    throw new WhiteboardError(404, "Whiteboard not found");
}
function snapshot(row: BoardRow | undefined): WhiteboardSnapshot {
  return row
    ? {
        data: JSON.parse(row.data),
        revision: Number(row.revision),
        updatedAt: row.updated_at,
      }
    : { data: null, revision: 0, updatedAt: null };
}
export async function readWhiteboard(
  boardId: string,
  knownRevision?: number,
): Promise<WhiteboardSnapshot> {
  const cid = classId(boardId),
    actor = await caller();
  await authorize(actor, cid);
  if (knownRevision !== undefined) {
    const metadata = await queryOne<{ revision: number; updated_at: string }>(
      "SELECT revision,updated_at FROM whiteboards WHERE board_key=?",
      [boardId],
    );
    if (Number(metadata?.revision ?? 0) === knownRevision)
      return {
        data: null,
        revision: knownRevision,
        updatedAt: metadata?.updated_at ?? null,
      };
  }
  return snapshot(
    await queryOne<BoardRow>(
      "SELECT data,revision,updated_at FROM whiteboards WHERE board_key=?",
      [boardId],
    ),
  );
}
export async function writeWhiteboard(
  boardId: string,
  data: unknown,
  revision: unknown,
): Promise<WhiteboardSnapshot> {
  const cid = classId(boardId),
    actor = await caller();
  if (
    !Number.isSafeInteger(revision) ||
    Number(revision) < 0 ||
    Number(revision) >= Number.MAX_SAFE_INTEGER
  )
    throw new WhiteboardError(400, "A valid whiteboard revision is required");
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.getPrototypeOf(data) !== Object.prototype
  )
    throw new WhiteboardError(400, "Whiteboard data must be a JSON object");
  let serialized: string;
  try {
    serialized = JSON.stringify(data);
  } catch {
    throw new WhiteboardError(400, "Whiteboard data must be valid JSON");
  }
  if (Buffer.byteLength(serialized, "utf8") > MAX_WHITEBOARD_BYTES)
    throw new WhiteboardError(
      413,
      "Whiteboard is too large. Keep it below 1 MB",
    );
  return withTransaction(async (tx) => {
    await authorize(actor, cid, tx);
    const row = (
      await tx.execute({
        sql: "SELECT data,revision,updated_at FROM whiteboards WHERE board_key=?",
        args: [boardId],
      })
    ).rows[0] as unknown as BoardRow | undefined;
    const current = snapshot(row);
    if (current.revision !== revision)
      throw new WhiteboardError(
        409,
        "This board changed in another window. Your local work has been preserved; choose which version to keep",
        current,
      );
    const updatedAt = new Date().toISOString(),
      next = Number(revision) + 1;
    await tx.execute({
      sql: "INSERT INTO whiteboards(board_key,class_id,data,revision,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(board_key) DO UPDATE SET data=excluded.data,revision=excluded.revision,updated_at=excluded.updated_at",
      args: [boardId, cid, serialized, next, updatedAt],
    });
    return { data: JSON.parse(serialized), revision: next, updatedAt };
  });
}
