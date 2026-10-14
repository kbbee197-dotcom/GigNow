// State minimum wages in cents per hour, compiled from public sources as of
// October 2026 (DOL and state tables, July 1 2026 adjustments included).
// Verify against official state sites before relying on this, and refresh it
// each January 1 and July 1 (and when Florida-style scheduled raises hit).
// City and county minimums (Seattle, NYC, Denver, etc.) are not included.
export const MIN_WAGE_AS_OF = '2026-10-13'
const FEDERAL_CENTS = 725

const STATE_CENTS: Record<string, number> = {
  AK: 1400, AZ: 1515, AR: 1100, CA: 1690, CO: 1516, CT: 1694, DE: 1500, DC: 1840,
  FL: 1500, HI: 1600, IL: 1500, ME: 1510, MD: 1500, MA: 1500, MI: 1373, MN: 1141,
  MO: 1500, MT: 1085, NE: 1500, NV: 1200, NJ: 1592, NM: 1200, NY: 1600, OH: 1100,
  OR: 1555, RI: 1600, SD: 1185, VT: 1442, VA: 1277, WA: 1713, WV: 875,
}

export function minWageCents(state?: string): number {
  const s = String(state || '').toUpperCase()
  return Math.max(FEDERAL_CENTS, STATE_CENTS[s] || 0)
}
