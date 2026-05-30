const CAD_FORMATTER = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCAD(amount: number): string {
  // Strip 'CA' prefix that en-CA locale adds before the $ sign on some Node versions
  return CAD_FORMATTER.format(amount).replace('CA', '');
}

export function centsToCAD(cents: number): number {
  return cents / 100;
}

export function cadToCents(dollars: number): number {
  return Math.round(dollars * 100);
}
