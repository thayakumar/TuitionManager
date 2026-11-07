import { cookies } from "next/headers";
import { getSetting, execute, queryOne } from "./db";
import crypto from "crypto";

const COOKIE_NAME = "admin_session";
const STUDENT_COOKIE = "student_session";

export async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const stored = await getSetting("admin_session_token");
  return !!stored && stored === token;
}

export async function isAdminRequest(): Promise<boolean> {
  try {
    return await verifyAdminSession();
  } catch {
    return false;
  }
}

export async function createAdminSession(): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await execute(
    "INSERT OR REPLACE INTO settings(key, value) VALUES ('admin_session_token', ?)",
    [token]
  );
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return token;
}

export async function destroyAdminSession() {
  await execute(
    "DELETE FROM settings WHERE key = 'admin_session_token'"
  );
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ---------- Student Session ----------

export async function createStudentSession(studentId: number): Promise<void> {
  const token = `${studentId}:${crypto.randomBytes(16).toString("hex")}`;
  await execute(
    "INSERT OR REPLACE INTO settings(key, value) VALUES (?, ?)",
    [`student_session_${studentId}`, token]
  );
  const cookieStore = cookies();
  cookieStore.set(STUDENT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getStudentSession(): Promise<number | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(STUDENT_COOKIE)?.value;
    if (!token) return null;
    const parts = token.split(":");
    if (parts.length < 2) return null;
    const studentId = Number(parts[0]);
    if (!studentId) return null;
    const stored = await getSetting(`student_session_${studentId}`);
    if (stored === token) return studentId;
    return null;
  } catch {
    return null;
  }
}

export async function destroyStudentSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(STUDENT_COOKIE)?.value;
  if (token) {
    const parts = token.split(":");
    if (parts.length >= 2) {
      const studentId = Number(parts[0]);
      if (studentId) {
        await execute("DELETE FROM settings WHERE key = ?", [`student_session_${studentId}`]);
      }
    }
  }
  cookieStore.delete(STUDENT_COOKIE);
}
