/** Format a PKR integer amount, e.g. 1250 -> "Rs. 1,250". */
export function formatPKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-PK')}`;
}

// Pakistani mobile: starts with 03, exactly 11 digits (spaces/dashes stripped)
export function isValidPakistaniPhone(phone: string): boolean {
  return /^03[0-9]{9}$/.test(phone.replace(/[\s\-]/g, ''));
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-]/g, '');
}

/** "15 Jan 2025" */
export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "15 Jan, 02:30 PM" */
export function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
