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

/** Escape HTML special characters to prevent XSS. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
