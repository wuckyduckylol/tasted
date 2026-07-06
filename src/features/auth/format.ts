/** "(555) 123-4567" progressive formatting for a 0–10 digit US number. */
export function formatUsPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  if (d.length === 0) return '';
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** "+15551234567" → "(555) 123-4567" for display. */
export function prettyE164(e164: string): string {
  return formatUsPhone(e164.replace(/^\+1/, ''));
}
