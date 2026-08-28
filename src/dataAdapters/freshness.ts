export type FreshnessState = 'fresh' | 'stale' | 'invalid'

export function classifyFreshness(
  timestamp: string,
  now: Date,
  maxAgeMinutes: number,
): FreshnessState {
  const sourceTime = Date.parse(timestamp)
  if (!Number.isFinite(sourceTime) || !Number.isFinite(maxAgeMinutes) || maxAgeMinutes < 0) return 'invalid'

  const ageMinutes = (now.getTime() - sourceTime) / 60_000
  return ageMinutes <= maxAgeMinutes ? 'fresh' : 'stale'
}
