const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const v = String(email).trim().toLowerCase();
  if (!EMAIL_RE.test(v)) return false;
  // basic domain check
  return v.length > 5;
}

export function normalizeMoroccanPhone(raw: string | null | undefined): { e164: string; dialable: boolean } | null {
  if (!raw) return null;
  const s = String(raw);
  if (/X{2,}/i.test(s)) return null;
  const digits = s.replace(/\D/g, "");
  let national = digits;
  if (national.startsWith("00212")) national = national.slice(5);
  else if (national.startsWith("212")) national = national.slice(3);
  if (national.startsWith("0")) national = national.slice(1);
  if (!/^[67]/.test(national) || national.length !== 9) return null;
  const e164 = `+212${national}`;
  return { e164, dialable: true };
}

export function isValidMoroccanPhone(raw: string | null | undefined): boolean {
  return normalizeMoroccanPhone(raw) !== null;
}
