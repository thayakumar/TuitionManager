/** Unicode code points keep emoji initials valid and identical in server/browser HTML. */
export function getInitials(name:string,limit=2):string {
  const initials=name.trim().split(/\s+/u).filter(Boolean).slice(0,limit).map(word=>Array.from(word)[0]||'').join('').toUpperCase();
  return Array.from(initials).slice(0,limit).join('');
}
