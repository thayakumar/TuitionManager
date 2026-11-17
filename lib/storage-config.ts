import crypto from "crypto";
import { execute, getSetting } from "./db";
import { requireAdmin } from "./auth";
/** This secret stays server-side except when an admin explicitly copies connector setup. */
export async function getStorageSecret({
  create = false,
}: { create?: boolean } = {}): Promise<string> {
  if (create) await requireAdmin();
  if (process.env.APPS_SCRIPT_SHARED_SECRET)
    return process.env.APPS_SCRIPT_SHARED_SECRET;
  const existing = await getSetting("storage_connector_secret");
  if (existing || !create) return existing;
  await execute(
    "INSERT OR IGNORE INTO settings(key,value) VALUES('storage_connector_secret',?)",
    [crypto.randomBytes(32).toString("hex")],
  );
  return getSetting("storage_connector_secret");
}
