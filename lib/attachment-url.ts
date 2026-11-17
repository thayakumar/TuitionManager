export function driveFileId(value: string | null | undefined): string | null {
  if (!value) return null;
  const local = /^\/api\/files\/([A-Za-z0-9_-]{10,})(?:\?|$)/.exec(value);
  if (local) return local[1];
  try {
    const url = new URL(value);
    if (!["drive.google.com", "docs.google.com"].includes(url.hostname))
      return null;
    const match = /\/d\/([A-Za-z0-9_-]{10,})(?:\/|$)/.exec(url.pathname);
    const id = match?.[1] || url.searchParams.get("id");
    return id && /^[A-Za-z0-9_-]{10,}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export function attachmentHref(
  value: string | null | undefined,
  inline = false,
): string | null {
  if (!value) return null;
  const id = driveFileId(value);
  if (id) return "/api/files/" + id + (inline ? "?inline=1" : "");
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
