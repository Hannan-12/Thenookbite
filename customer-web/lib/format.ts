/** Format a PKR integer amount, e.g. 1250 -> "Rs. 1,250". */
export function formatPKR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-PK')}`;
}
