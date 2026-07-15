import { ChamaSummary } from './types';

export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address || '';
  return address.slice(0, 6) + '…' + address.slice(-4);
}

export function calculateTVL(summaries: ChamaSummary[]): string {
  let total = 0;
  for (const s of summaries) {
    const amt = parseFloat(s.contribution_amount) || 0;
    // TVL is members * contribution_amount (total pool sizes active)
    total += amt * s.member_count;
  }
  return total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function calculateReputation(missed: number, totalRounds: number): number {
  if (missed >= 2) return 0;
  const base = 100 - missed * 20;
  return Math.max(0, base);
}
