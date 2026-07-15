import type { CustomerType, Id } from '@/types'

// ---------------------------------------------------------------------------
// 2.2 Customer Types (Tiers) — cumulative product visibility, mirrored from the
// backend's services/productVisibility.ts. Keep the two in step.
//
// A customer sees products tagged to their own tier AND to every tier below it,
// ordered by CustomerType.order (lower number = lower tier):
//
//   Public   (order 1) -> products tagged Public
//   Gold     (order 2) -> products tagged Public + Gold
//   Platinum (order 3) -> products tagged Public + Gold + Platinum
// ---------------------------------------------------------------------------

/** Tiers sorted low to high, the order they should always be shown in. */
export function sortTiers(tiers: CustomerType[]): CustomerType[] {
  return [...tiers].sort((a, b) => a.order - b.order)
}

/**
 * The tiers that can actually see a product tagged with `selected`.
 *
 * Because visibility rolls upward, the audience is every tier at or above the
 * LOWEST tagged tier — tagging {Gold} and {Public, Gold} reach the same people.
 *
 * - `selected` empty      -> every tier (an untagged product is visible to all).
 * - tags all point at deleted tiers -> nobody, matching the backend, which finds
 *   no overlap for those ids.
 */
export function audienceFor(tiers: CustomerType[], selected: Id[]): CustomerType[] {
  if (selected.length === 0) return sortTiers(tiers)

  const taggedOrders = tiers.filter((t) => selected.includes(t.id)).map((t) => t.order)
  if (taggedOrders.length === 0) return []

  const lowest = Math.min(...taggedOrders)
  return sortTiers(tiers.filter((t) => t.order >= lowest))
}
